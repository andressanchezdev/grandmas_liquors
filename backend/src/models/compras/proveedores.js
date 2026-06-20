/**
 * Modelo Proveedores (incluye helpers locales: ensure*, find*, getPending*, snapshot, changes)
 *
 * Codigo distribuido desde entities.models.js. Tras la migracion,
 * entities.models.js permanece intacto pero desconectado: ningun consumidor
 * lo importa. La fuente activa es este archivo modular.
 */
const pool = require('../../../db');
const {
  ensureMotivoEstado,
  checkInactivacionDependencias,
} = require('../shared/auditoria');

let proveedorAuditTableReady = null;
let proveedorSchemaReady = null;

const ensureProveedorAuditTable = async () => {
  if (!proveedorAuditTableReady) {
    proveedorAuditTableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS proveedores_auditoria (
        id SERIAL PRIMARY KEY,
        proveedor_id INTEGER,
        accion VARCHAR(20) NOT NULL,
        usuario_id INTEGER,
        cambios JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  await proveedorAuditTableReady;
};

const ensureProveedorSchema = async () => {
  if (!proveedorSchemaReady) {
    proveedorSchemaReady = (async () => {
      await pool.query('ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS preferente BOOLEAN DEFAULT FALSE');
      await pool.query('ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2)');
      await pool.query('ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS observaciones TEXT');
      await pool.query('UPDATE proveedores SET preferente = FALSE WHERE preferente IS NULL');
    })();
  }

  await proveedorSchemaReady;
};

const toBooleanValue = (value) => value === true || value === 'true' || value === 1 || value === '1';

const getProveedorDisplayName = (proveedor = {}) => {
  if (proveedor.tipo_persona === 'Juridica') {
    return proveedor.nombre_empresa || '';
  }

  return [proveedor.nombre, proveedor.apellido].filter(Boolean).join(' ').trim();
};

const getProveedorIdentifier = (proveedor = {}) => {
  if (proveedor.tipo_persona === 'Juridica') {
    return proveedor.nit || '';
  }

  return proveedor.numero_documento || '';
};

const toProveedorSnapshot = (proveedor = {}) => ({
  id: proveedor.id,
  tipo_persona: proveedor.tipo_persona,
  nombre_empresa: proveedor.nombre_empresa,
  nit: proveedor.nit,
  nombre: proveedor.nombre,
  apellido: proveedor.apellido,
  tipo_documento: proveedor.tipo_documento,
  numero_documento: proveedor.numero_documento,
  telefono: proveedor.telefono,
  email: proveedor.email,
  direccion: proveedor.direccion,
  estado: proveedor.estado,
  preferente: toBooleanValue(proveedor.preferente),
  rating: proveedor.rating !== null && proveedor.rating !== undefined ? Number(proveedor.rating) : null,
  observaciones: proveedor.observaciones || null,
  nombre_completo: getProveedorDisplayName(proveedor),
  identificador: getProveedorIdentifier(proveedor),
});

const getProveedorChanges = (before = {}, after = {}) => {
  const changedFields = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  keys.forEach((key) => {
    const beforeValue = JSON.stringify(before[key]);
    const afterValue = JSON.stringify(after[key]);
    if (beforeValue !== afterValue) {
      changedFields.push(key);
    }
  });

  return changedFields;
};

const registerProveedorAudit = async ({ proveedorId, accion, usuarioId = null, cambios }) => {
  await ensureProveedorAuditTable();
  await pool.query(
    'INSERT INTO proveedores_auditoria (proveedor_id, accion, usuario_id, cambios) VALUES ($1, $2, $3, $4)',
    [proveedorId, accion, usuarioId, JSON.stringify(cambios || {})]
  );
};

const getProveedorIdentifierValue = ({ tipoPersona, nit, numeroDocumento }) => {
  const normalizedTipo = String(tipoPersona || '').trim();
  if (normalizedTipo === 'Juridica') {
    return String(nit || '').trim();
  }

  return String(numeroDocumento || '').trim();
};

const normalizeIdentifierDigits = (value) => String(value || '').replace(/\D/g, '');

const findProveedorByIdentifier = async ({ nit, numeroDocumento, excludeId = null }) => {
  const whereParts = [];
  const values = [];

  if (nit) {
    const normalizedNit = normalizeIdentifierDigits(nit);
    if (normalizedNit) {
      values.push(normalizedNit);
      whereParts.push(`regexp_replace(COALESCE(nit, ''), '\\D', '', 'g') = $${values.length}`);
    }
  }

  if (numeroDocumento) {
    const normalizedDocumento = normalizeIdentifierDigits(numeroDocumento);
    if (normalizedDocumento) {
      values.push(normalizedDocumento);
      whereParts.push(`regexp_replace(COALESCE(numero_documento, ''), '\\D', '', 'g') = $${values.length}`);
    }
  }

  if (whereParts.length === 0) {
    return null;
  }

  let query = `SELECT * FROM proveedores WHERE (${whereParts.join(' OR ')})`;
  if (excludeId !== null && excludeId !== undefined) {
    values.push(excludeId);
    query += ` AND id <> $${values.length}`;
  }

  query += ' ORDER BY CASE WHEN estado = \'Activo\' THEN 0 ELSE 1 END, id ASC LIMIT 1';

  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

const findProveedorByEmail = async ({ email, excludeId = null }) => {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedEmail) return null;

  const values = [normalizedEmail];
  let query = 'SELECT * FROM proveedores WHERE LOWER(COALESCE(email, \'\')) = $1';
  if (excludeId !== null && excludeId !== undefined) {
    values.push(excludeId);
    query += ` AND id <> $${values.length}`;
  }

  query += ' ORDER BY CASE WHEN estado = \'Activo\' THEN 0 ELSE 1 END, id ASC LIMIT 1';
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

const findProveedorByTelefono = async ({ telefono, excludeId = null }) => {
  const normalizedTelefono = typeof telefono === 'string' ? telefono.replace(/\D/g, '') : '';
  if (!normalizedTelefono) return null;

  const values = [normalizedTelefono];
  let query = `
    SELECT *
    FROM proveedores
    WHERE regexp_replace(COALESCE(telefono, ''), '\\D', '', 'g') = $1
  `;
  if (excludeId !== null && excludeId !== undefined) {
    values.push(excludeId);
    query += ` AND id <> $${values.length}`;
  }

  query += ' ORDER BY CASE WHEN estado = \'Activo\' THEN 0 ELSE 1 END, id ASC LIMIT 1';
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

const getPendingComprasByProveedor = async (id) => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM compras
     WHERE proveedor_id = $1
       AND LOWER(COALESCE(estado, '')) = 'pendiente'`,
    [id]
  );

  return Number(result.rows[0]?.total || 0);
};

const Proveedores = {
  getAll: async () => {
    await ensureProveedorSchema();
    const result = await pool.query(`
      SELECT *
      FROM proveedores
      ORDER BY
        CASE WHEN LOWER(TRIM(COALESCE(estado, ''))) = 'activo' THEN 0 ELSE 1 END,
        id DESC
    `);
    return result.rows;
  },
  getById: async (id) => {
    await ensureProveedorSchema();
    const result = await pool.query('SELECT * FROM proveedores WHERE id = $1', [id]);
    return result.rows[0];
  },
  getByNitOrDocumento: async (identifier) => {
    await ensureProveedorSchema();
    const normalized = normalizeIdentifierDigits(identifier);
    if (!normalized) return null;

    const result = await pool.query(
      `SELECT *
       FROM proveedores
       WHERE regexp_replace(COALESCE(nit, ''), '\\D', '', 'g') = $1
          OR regexp_replace(COALESCE(numero_documento, ''), '\\D', '', 'g') = $1
       ORDER BY CASE WHEN estado = 'Activo' THEN 0 ELSE 1 END, id ASC
       LIMIT 1`,
      [normalized]
    );
    return result.rows[0] || null;
  },
  getByEmail: async (email) => {
    await ensureProveedorSchema();
    const result = await pool.query(
      `SELECT *
       FROM proveedores
       WHERE LOWER(COALESCE(email, '')) = LOWER($1)
       ORDER BY CASE WHEN estado = 'Activo' THEN 0 ELSE 1 END, id ASC
       LIMIT 1`,
      [email]
    );
    return result.rows[0] || null;
  },
  getByTelefono: async (telefono) => {
    await ensureProveedorSchema();
    const normalized = String(telefono || '').replace(/\D/g, '');
    if (!normalized) return null;

    const result = await pool.query(
      `SELECT *
       FROM proveedores
       WHERE regexp_replace(COALESCE(telefono, ''), '\\D', '', 'g') = $1
       ORDER BY CASE WHEN estado = 'Activo' THEN 0 ELSE 1 END, id ASC
       LIMIT 1`,
      [normalized]
    );
    return result.rows[0] || null;
  },
  getPendingPurchases: async (id) => {
    await ensureProveedorSchema();
    return getPendingComprasByProveedor(id);
  },
  getAuditByProveedor: async (id) => {
    await ensureProveedorSchema();
    await ensureProveedorAuditTable();
    const result = await pool.query(
      `SELECT pa.*, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido, u.email AS usuario_email
       FROM proveedores_auditoria pa
       LEFT JOIN usuarios u ON u.id = pa.usuario_id
       WHERE pa.proveedor_id = $1
       ORDER BY pa.created_at DESC`,
      [id]
    );
    return result.rows;
  },
  create: async (data, options = {}) => {
    await ensureProveedorSchema();

    const duplicate = await findProveedorByIdentifier({ nit: data.nit, numeroDocumento: data.numeroDocumento });
    if (duplicate) {
      const error = new Error(
        duplicate.estado === 'Inactivo'
          ? 'El RUC ya existe pero el proveedor esta inactivo'
          : 'El RUC ya existe para otro proveedor'
      );
      error.statusCode = 409;
      error.details = { proveedorId: duplicate.id, estado: duplicate.estado };
      throw error;
    }

    const duplicateEmail = await findProveedorByEmail({ email: data.email });
    if (duplicateEmail) {
      const error = new Error('El correo ya existe para otro proveedor');
      error.statusCode = 409;
      error.details = { field: 'email', proveedorId: duplicateEmail.id, estado: duplicateEmail.estado };
      throw error;
    }

    const duplicatePhone = await findProveedorByTelefono({ telefono: data.telefono });
    if (duplicatePhone) {
      const error = new Error('El telefono ya existe para otro proveedor');
      error.statusCode = 409;
      error.details = { field: 'telefono', proveedorId: duplicatePhone.id, estado: duplicatePhone.estado };
      throw error;
    }

    const result = await pool.query(
      `INSERT INTO proveedores (
         tipo_persona, nombre_empresa, nit, nombre, apellido, tipo_documento, numero_documento, telefono, email, direccion, estado, preferente, rating, observaciones
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
      [
        data.tipoPersona,
        data.nombreEmpresa,
        data.nit,
        data.nombre,
        data.apellido,
        data.tipoDocumento,
        data.numeroDocumento,
        data.telefono,
        data.email,
        data.direccion,
        data.estado || 'Activo',
        toBooleanValue(data.preferente),
        data.rating ?? null,
        data.observaciones ?? null,
      ]
    );

    const createdProveedor = await Proveedores.getById(result.rows[0].id);
    await registerProveedorAudit({
      proveedorId: result.rows[0].id,
      accion: 'CREATE',
      usuarioId: options.usuarioId ?? null,
      cambios: {
        before: null,
        after: toProveedorSnapshot(createdProveedor),
      },
    });

    return result.rows[0].id;
  },
  update: async (id, data, options = {}) => {
    await ensureProveedorSchema();
    const currentProveedor = await Proveedores.getById(id);
    if (!currentProveedor) {
      const error = new Error('Proveedor no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const nextEstado = data.estado ?? currentProveedor.estado;
    if (currentProveedor.estado !== 'Inactivo' && nextEstado === 'Inactivo') {
      const pendingPurchases = await getPendingComprasByProveedor(id);
      if (pendingPurchases > 0) {
        const error = new Error('No se puede desactivar el proveedor porque tiene ordenes de compra pendientes');
        error.statusCode = 409;
        error.details = { pendingPurchases };
        throw error;
      }
    }

    const nextTipoPersona = data.tipoPersona ?? currentProveedor.tipo_persona;
    const nextNombreEmpresa = data.nombreEmpresa !== undefined ? data.nombreEmpresa : currentProveedor.nombre_empresa;
    const nextNit = data.nit !== undefined ? data.nit : currentProveedor.nit;
    const nextNombre = data.nombre !== undefined ? data.nombre : currentProveedor.nombre;
    const nextApellido = data.apellido !== undefined ? data.apellido : currentProveedor.apellido;
    const nextTipoDocumento = data.tipoDocumento !== undefined ? data.tipoDocumento : currentProveedor.tipo_documento;
    const nextNumeroDocumento = data.numeroDocumento !== undefined ? data.numeroDocumento : currentProveedor.numero_documento;
    const nextTelefono = data.telefono !== undefined ? data.telefono : currentProveedor.telefono;
    const nextEmail = data.email !== undefined ? data.email : currentProveedor.email;
    const nextDireccion = data.direccion !== undefined ? data.direccion : currentProveedor.direccion;
    const nextPreferente = data.preferente !== undefined ? toBooleanValue(data.preferente) : toBooleanValue(currentProveedor.preferente);
    const nextRating = data.rating !== undefined ? data.rating : currentProveedor.rating;
    const nextObservaciones = data.observaciones !== undefined ? data.observaciones : currentProveedor.observaciones;

    const currentIdentifier = getProveedorIdentifierValue({
      tipoPersona: currentProveedor.tipo_persona,
      nit: currentProveedor.nit,
      numeroDocumento: currentProveedor.numero_documento,
    });
    const nextIdentifier = getProveedorIdentifierValue({
      tipoPersona: nextTipoPersona,
      nit: nextNit,
      numeroDocumento: nextNumeroDocumento,
    });

    if (nextIdentifier !== currentIdentifier) {
      const error = new Error('El RUC/Documento del proveedor no se puede editar por trazabilidad');
      error.statusCode = 409;
      error.details = { field: 'identifier', currentIdentifier, nextIdentifier };
      throw error;
    }

    const duplicateIdentifier = await findProveedorByIdentifier({
      nit: nextNit,
      numeroDocumento: nextNumeroDocumento,
      excludeId: Number(id),
    });
    if (duplicateIdentifier) {
      const error = new Error('El RUC ya existe para otro proveedor');
      error.statusCode = 409;
      error.details = { field: 'nit', proveedorId: duplicateIdentifier.id, estado: duplicateIdentifier.estado };
      throw error;
    }

    const duplicateEmail = await findProveedorByEmail({ email: nextEmail, excludeId: Number(id) });
    if (duplicateEmail) {
      const error = new Error('El correo ya existe para otro proveedor');
      error.statusCode = 409;
      error.details = { field: 'email', proveedorId: duplicateEmail.id, estado: duplicateEmail.estado };
      throw error;
    }

    const duplicatePhone = await findProveedorByTelefono({ telefono: nextTelefono, excludeId: Number(id) });
    if (duplicatePhone) {
      const error = new Error('El telefono ya existe para otro proveedor');
      error.statusCode = 409;
      error.details = { field: 'telefono', proveedorId: duplicatePhone.id, estado: duplicatePhone.estado };
      throw error;
    }

    await pool.query(
      `UPDATE proveedores
       SET tipo_persona = COALESCE($1, tipo_persona),
           nombre_empresa = COALESCE($2, nombre_empresa),
           nit = COALESCE($3, nit),
           nombre = COALESCE($4, nombre),
           apellido = COALESCE($5, apellido),
           tipo_documento = COALESCE($6, tipo_documento),
           numero_documento = COALESCE($7, numero_documento),
           telefono = COALESCE($8, telefono),
           email = COALESCE($9, email),
           direccion = COALESCE($10, direccion),
           estado = COALESCE($11, estado),
           preferente = COALESCE($12, preferente),
           rating = COALESCE($13, rating),
           observaciones = COALESCE($14, observaciones),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $15`,
      [
        nextTipoPersona,
        nextNombreEmpresa,
        nextNit,
        nextNombre,
        nextApellido,
        nextTipoDocumento,
        nextNumeroDocumento,
        nextTelefono,
        nextEmail,
        nextDireccion,
        nextEstado,
        nextPreferente,
        nextRating,
        nextObservaciones,
        id,
      ]
    );

    const updatedProveedor = await Proveedores.getById(id);
    await registerProveedorAudit({
      proveedorId: Number(id),
      accion: 'UPDATE',
      usuarioId: options.usuarioId ?? null,
      cambios: {
        before: toProveedorSnapshot(currentProveedor),
        after: toProveedorSnapshot(updatedProveedor),
        changedFields: getProveedorChanges(toProveedorSnapshot(currentProveedor), toProveedorSnapshot(updatedProveedor)),
        reason: typeof data.motivo === 'string' && data.motivo.trim() ? data.motivo.trim() : null,
      },
    });

    return true;
  },
  updateStatus: async (id, data = {}, options = {}) => {
    await ensureProveedorSchema();
    const currentProveedor = await Proveedores.getById(id);
    if (!currentProveedor) {
      const error = new Error('Proveedor no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const nextEstado = data.estado;
    if (!['Activo', 'Inactivo'].includes(nextEstado)) {
      const error = new Error('Estado invalido. Valores permitidos: Activo, Inactivo');
      error.statusCode = 400;
      throw error;
    }

    const reason = ensureMotivoEstado(data.motivo);

    if (currentProveedor.estado !== 'Inactivo' && nextEstado === 'Inactivo') {
      const pendingPurchases = await getPendingComprasByProveedor(id);
      if (pendingPurchases > 0) {
        const error = new Error('No se puede desactivar el proveedor porque tiene ordenes de compra pendientes');
        error.statusCode = 409;
        error.details = { pendingPurchases };
        throw error;
      }
      await checkInactivacionDependencias('proveedor', id);
    }

    await pool.query(
      'UPDATE proveedores SET estado = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [nextEstado, id]
    );

    const updatedProveedor = await Proveedores.getById(id);
    await registerProveedorAudit({
      proveedorId: Number(id),
      accion: 'UPDATE',
      usuarioId: options.usuarioId ?? null,
      cambios: {
        before: toProveedorSnapshot(currentProveedor),
        after: toProveedorSnapshot(updatedProveedor),
        changedFields: getProveedorChanges(toProveedorSnapshot(currentProveedor), toProveedorSnapshot(updatedProveedor)),
        reason,
        statusChange: true,
      },
    });

    return updatedProveedor;
  },
  delete: async (id, options = {}) => {
    await ensureProveedorSchema();
    const currentProveedor = await Proveedores.getById(id);
    if (!currentProveedor) {
      const error = new Error('Proveedor no encontrado');
      error.statusCode = 404;
      throw error;
    }

    const reason = typeof options.reason === 'string' ? options.reason.trim() : '';
    if (!reason || reason.length < 10 || reason.length > 50) {
      const error = new Error('El motivo de eliminacion es obligatorio y debe tener entre 10 y 50 caracteres');
      error.statusCode = 400;
      error.details = { reasonLength: reason.length };
      throw error;
    }

    const pendingPurchases = await getPendingComprasByProveedor(id);
    if (pendingPurchases > 0) {
      const error = new Error('No se puede eliminar el proveedor porque tiene ordenes de compra pendientes');
      error.statusCode = 409;
      error.details = { pendingPurchases };
      throw error;
    }

    await pool.query('DELETE FROM proveedores WHERE id = $1', [id]);

    await registerProveedorAudit({
      proveedorId: Number(id),
      accion: 'DELETE',
      usuarioId: options.usuarioId ?? null,
      cambios: {
        before: toProveedorSnapshot(currentProveedor),
        after: null,
        reason,
      },
    });

    return true;
  }
};

module.exports = Proveedores;
