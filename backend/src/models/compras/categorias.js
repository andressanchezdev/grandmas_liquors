/**
 * Modelo Categorias
 *
 * Codigo distribuido desde entities.models.js. Tras la migracion,
 * entities.models.js permanece intacto pero desconectado: ningun consumidor
 * lo importa. La fuente activa es este archivo modular.
 */
const pool = require('../../../db');
const {
  ensureCategoriaProductCountColumn,
  syncCategoriaProductCount,
  ensureProductoImageColumn,
  ensureMotivoEstado,
  checkInactivacionDependencias,
  registerCategoriaAudit,
} = require('../shared/auditoria');

const Categorias = {
  getAll: async () => {
    await ensureCategoriaProductCountColumn();
    const result = await pool.query(`
      SELECT c.*,
             COALESCE(c.cantidad_productos, 0) AS productos
      FROM categorias c
      ORDER BY
        CASE WHEN LOWER(TRIM(COALESCE(c.estado, ''))) = 'activo' THEN 0 ELSE 1 END,
        c.id DESC
    `);
    return result.rows;
  },
  getById: async (id) => {
    await ensureCategoriaProductCountColumn();
    const result = await pool.query(
      `SELECT c.*,
              COALESCE(c.cantidad_productos, 0) AS productos
       FROM categorias c
       WHERE c.id = $1`,
      [id]
    );
    return result.rows[0];
  },
  create: async (data) => {
    await ensureProductoImageColumn();
    await ensureCategoriaProductCountColumn();

    const nombre = String(data?.nombre || '').trim();
    const descripcion = String(data?.descripcion || '').trim();
    const estado = String(data?.estado || 'Activo').trim();

    if (!nombre) {
      const error = new Error('El nombre de la categoría es obligatorio');
      error.statusCode = 400;
      throw error;
    }

    // Validar estado permitido
    if (!['Activo', 'Inactivo'].includes(estado)) {
      const error = new Error('Estado inválido. Valores permitidos: Activo, Inactivo');
      error.statusCode = 400;
      throw error;
    }

    const duplicate = await pool.query(
      'SELECT id, estado FROM categorias WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) LIMIT 1',
      [nombre]
    );
    if (duplicate.rows[0]) {
      const error = new Error('Ya existe una categoría con ese nombre');
      error.statusCode = 409;
      throw error;
    }

    const result = await pool.query(
      'INSERT INTO categorias (nombre, descripcion, estado, cantidad_productos) VALUES ($1, $2, $3, $4) RETURNING id',
      [nombre, descripcion || null, estado, 0]
    );
    const newId = result.rows[0].id;
    await registerCategoriaAudit({
      categoriaId: newId,
      accion: 'CREATE',
      usuarioId: data?.actor_id ?? null,
      cambios: { before: null, after: { nombre, descripcion: descripcion || null, estado } },
    });
    return newId;
  },
  update: async (id, data) => {
    await ensureProductoImageColumn();

    const nombre = String(data?.nombre || '').trim();
    const descripcion = String(data?.descripcion || '').trim();

    if (!nombre) {
      const error = new Error('El nombre de la categoría es obligatorio');
      error.statusCode = 400;
      throw error;
    }

    const duplicate = await pool.query(
      'SELECT id FROM categorias WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) AND id <> $2 LIMIT 1',
      [nombre, id]
    );
    if (duplicate.rows[0]) {
      const error = new Error('Ya existe una categoría con ese nombre');
      error.statusCode = 409;
      throw error;
    }

    const previous = await Categorias.getById(id);
    await pool.query(
      'UPDATE categorias SET nombre = $1, descripcion = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [nombre, descripcion || null, id]
    );
    await registerCategoriaAudit({
      categoriaId: Number(id),
      accion: 'UPDATE',
      usuarioId: data?.actor_id ?? null,
      cambios: {
        before: previous
          ? { nombre: previous.nombre, descripcion: previous.descripcion }
          : null,
        after: { nombre, descripcion: descripcion || null },
      },
    });
    return true;
  },
  updateStatus: async (id, data = {}) => {
    const current = await Categorias.getById(id);
    if (!current) {
      const error = new Error('Categoria no encontrada');
      error.statusCode = 404;
      throw error;
    }

    const estado = String(data?.estado || '').trim();
    if (!['Activo', 'Inactivo'].includes(estado)) {
      const error = new Error('Estado invalido. Valores permitidos: Activo, Inactivo');
      error.statusCode = 400;
      throw error;
    }

    ensureMotivoEstado(data?.motivo);

    if (current.estado === estado) {
      return current;
    }

    if (current.estado !== 'Inactivo' && estado === 'Inactivo') {
      await checkInactivacionDependencias('categoria', id);
    }

    await pool.query(
      'UPDATE categorias SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [estado, id]
    );

    await registerCategoriaAudit({
      categoriaId: Number(id),
      accion: 'STATUS_CHANGE',
      usuarioId: data?.actor_id ?? null,
      cambios: {
        before: { estado: current.estado },
        after: { estado },
        motivo: typeof data?.motivo === 'string' ? data.motivo.trim() : null,
      },
    });

    return Categorias.getById(id);
  },
  delete: async (id, options = {}) => {
    const idNum = parseInt(String(id), 10);
    if (!Number.isFinite(idNum)) {
      const error = new Error('ID de categoría inválido');
      error.statusCode = 400;
      throw error;
    }

    const current = await Categorias.getById(idNum);
    if (!current) {
      const error = new Error('Categoria no encontrada');
      error.statusCode = 404;
      throw error;
    }

    const countRes = await pool.query(
      'SELECT COUNT(*)::int AS n FROM productos WHERE categoria_id = $1',
      [idNum]
    );
    const numProductos = countRes.rows[0]?.n ?? 0;

    const rawDest = options.reubicarEnCategoriaId;
    const destId =
      rawDest === null || rawDest === undefined || rawDest === ''
        ? null
        : parseInt(String(rawDest), 10);

    if (numProductos === 0) {
      await pool.query('DELETE FROM categorias WHERE id = $1', [idNum]);
      await registerCategoriaAudit({
        categoriaId: idNum,
        accion: 'DELETE',
        usuarioId: options?.actor_id ?? null,
        cambios: {
          before: { nombre: current.nombre, estado: current.estado, productos_asociados: 0 },
          after: null,
        },
      });
      return true;
    }

    if (!Number.isFinite(destId)) {
      const error = new Error(
        `No se puede eliminar la categoría porque tiene ${numProductos} producto(s) asociado(s). ` +
          'Indique una categoría destino para reubicar los productos.'
      );
      error.statusCode = 400;
      throw error;
    }

    if (destId === idNum) {
      const error = new Error('La categoría destino debe ser distinta de la que se elimina');
      error.statusCode = 400;
      throw error;
    }

    const destRow = await pool.query('SELECT id FROM categorias WHERE id = $1 LIMIT 1', [destId]);
    if (!destRow.rows[0]) {
      const error = new Error('La categoría destino no existe');
      error.statusCode = 404;
      throw error;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE productos SET categoria_id = $1, updated_at = CURRENT_TIMESTAMP WHERE categoria_id = $2`,
        [destId, idNum]
      );
      await client.query('DELETE FROM categorias WHERE id = $1', [idNum]);
      await client.query('COMMIT');
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch (_r) {
        /* ignore */
      }
      throw e;
    } finally {
      client.release();
    }

    await ensureCategoriaProductCountColumn();
    await syncCategoriaProductCount(destId);

    await registerCategoriaAudit({
      categoriaId: idNum,
      accion: 'DELETE',
      usuarioId: options?.actor_id ?? null,
      cambios: {
        before: { nombre: current.nombre, estado: current.estado, productos_asociados: numProductos },
        after: null,
        productos_reubicados_a: destId,
      },
    });

    return true;
  }
};

module.exports = Categorias;
