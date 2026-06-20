/**
 * Modelo Roles
 *
 * Codigo distribuido desde entities.models.js. Tras la migracion,
 * entities.models.js permanece intacto pero desconectado: ningun consumidor
 * lo importa. La fuente activa es este archivo modular.
 */
const pool = require('../../../db');
const {
  ensureMotivoEstado,
  checkInactivacionDependencias,
  ensureRoleAuditTable,
  registerRoleAudit,
  toRoleSnapshot,
  getRoleChanges,
  CLIENT_ROLE_NAME,
  CLIENT_ALLOWED_PERMISSIONS,
  normalizePermissions,
  isClientRoleName,
  validateRoleName,
  buildDuplicateRoleNameError,
  validatePermissionsPayload,
} = require('../shared/auditoria');

const Roles = {
  getAll: async () => {
    const result = await pool.query(`
      SELECT r.*, 
             COALESCE(u.usuarios, 0) AS usuarios,
             COALESCE(u.usuarios_activos, 0) AS usuarios_activos
      FROM roles r
      LEFT JOIN (
        SELECT rol_id,
               COUNT(*) FILTER (WHERE estado IS NULL OR estado <> 'Eliminado') AS usuarios,
               COUNT(*) FILTER (WHERE estado = 'Activo') AS usuarios_activos
        FROM usuarios
        GROUP BY rol_id
      ) u ON u.rol_id = r.id
      ORDER BY
        CASE WHEN LOWER(TRIM(COALESCE(r.estado, ''))) = 'activo' THEN 0 ELSE 1 END,
        r.id DESC
    `);
    return result.rows;
  },
  getById: async (id) => {
    const result = await pool.query(
      `SELECT r.*,
              COALESCE(u.usuarios, 0) AS usuarios,
              COALESCE(u.usuarios_activos, 0) AS usuarios_activos
       FROM roles r
       LEFT JOIN (
         SELECT rol_id,
                COUNT(*) FILTER (WHERE estado IS NULL OR estado <> 'Eliminado') AS usuarios,
                COUNT(*) FILTER (WHERE estado = 'Activo') AS usuarios_activos
         FROM usuarios
         GROUP BY rol_id
       ) u ON u.rol_id = r.id
       WHERE r.id = $1`,
      [id]
    );
    return result.rows[0];
  },
  getByNombre: async (nombre) => {
    const result = await pool.query('SELECT * FROM roles WHERE nombre = $1', [nombre]);
    return result.rows[0];
  },
  create: async (data, options = {}) => {
    const nameError = validateRoleName(data?.nombre);
    if (nameError) throw nameError;

    const nombreNormalizado = String(data.nombre).trim();

    const duplicate = await pool.query(
      'SELECT id FROM roles WHERE LOWER(nombre) = LOWER($1) LIMIT 1',
      [nombreNormalizado]
    );
    if (duplicate.rows.length > 0) {
      throw buildDuplicateRoleNameError(nombreNormalizado);
    }

    const permisosNormalizados = normalizePermissions(data.permisos || []);

    const permissionsError = validatePermissionsPayload({ nextPermissions: permisosNormalizados, roleName: nombreNormalizado });

    if (permissionsError) throw permissionsError;

    let id;
    try {
      const result = await pool.query(
        'INSERT INTO roles (nombre, descripcion, permisos, estado) VALUES ($1, $2, $3, $4) RETURNING id',
        [nombreNormalizado, data.descripcion, permisosNormalizados, data.estado || 'Activo']
      );
      id = result.rows[0].id;
    } catch (insertError) {
      if (insertError && insertError.code === '23505') {
        throw buildDuplicateRoleNameError(nombreNormalizado);
      }
      throw insertError;
    }

    const createdRole = await Roles.getById(id);
    await registerRoleAudit({
      rolId: id,
      accion: 'CREATE',
      usuarioId: options.usuarioId ?? null,
      cambios: {
        before: null,
        after: toRoleSnapshot(createdRole),
      },
    });

    return id;
  },
  update: async (id, data, options = {}) => {
    const currentRole = await Roles.getById(id);
    if (!currentRole) {
      const error = new Error('No se encontró el rol que intenta actualizar.');
      error.statusCode = 404;
      throw error;
    }

    let nombreNormalizado = currentRole.nombre;
    if (typeof data.nombre === 'string' && data.nombre.trim() && data.nombre.trim() !== currentRole.nombre) {
      const nameError = validateRoleName(data.nombre);
      if (nameError) throw nameError;
      nombreNormalizado = data.nombre.trim();

      const duplicate = await pool.query(
        'SELECT id FROM roles WHERE LOWER(nombre) = LOWER($1) AND id <> $2 LIMIT 1',
        [nombreNormalizado, id]
      );
      if (duplicate.rows.length > 0) {
        throw buildDuplicateRoleNameError(nombreNormalizado);
      }
    }

    const targetRoleName = nombreNormalizado;

    let nextPermissions = data.permisos;
    if (Array.isArray(data.permisos)) {
      nextPermissions = normalizePermissions(data.permisos);

      const permissionsError = validatePermissionsPayload({ nextPermissions, roleName: targetRoleName });

      if (permissionsError) throw permissionsError;
    }

    if (data.estado === 'Inactivo') {
      const assignedUsersResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM usuarios
         WHERE rol_id = $1
           AND (estado IS NULL OR estado <> 'Eliminado')`,
        [id]
      );
      const assignedUsers = Number(assignedUsersResult.rows[0]?.total || 0);

      if (assignedUsers > 0) {
        const error = new Error(
          `No se puede desactivar este rol porque tiene ${assignedUsers} usuario(s) asignado(s). Reasigne esos usuarios antes de desactivarlo.`
        );
        error.statusCode = 400;
        error.details = { assignedUsers };
        throw error;
      }
    }

    try {
      await pool.query(
        `UPDATE roles
         SET nombre = COALESCE($1, nombre),
             descripcion = COALESCE($2, descripcion),
             permisos = COALESCE($3, permisos),
             estado = COALESCE($4, estado),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [data.nombre ? nombreNormalizado : null, data.descripcion, nextPermissions, data.estado, id]
      );
    } catch (updateError) {
      if (updateError && updateError.code === '23505') {
        throw buildDuplicateRoleNameError(nombreNormalizado);
      }
      throw updateError;
    }

    const updatedRole = await Roles.getById(id);
    const changedFields = getRoleChanges(toRoleSnapshot(currentRole), toRoleSnapshot(updatedRole));

    await registerRoleAudit({
      rolId: Number(id),
      accion: 'UPDATE',
      usuarioId: options.usuarioId ?? null,
      cambios: {
        before: toRoleSnapshot(currentRole),
        after: toRoleSnapshot(updatedRole),
        changedFields,
        reason: typeof data.motivo === 'string' && data.motivo.trim() ? data.motivo.trim() : null,
      },
    });

    return true;
  },
  updatePermissions: async (id, permisos, options = {}) => {
    const currentRole = await Roles.getById(id);
    if (!currentRole) {
      const error = new Error('Rol no encontrado');
      error.statusCode = 404;
      throw error;
    }

    let nextPermissions = normalizePermissions(permisos || []);
    const permissionsError = validatePermissionsPayload({ nextPermissions, roleName: currentRole.nombre });

    if (permissionsError) throw permissionsError;

    await pool.query(
      `UPDATE roles
       SET permisos = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [nextPermissions, id]
    );

    const updatedRole = await Roles.getById(id);
    const changedFields = getRoleChanges(toRoleSnapshot(currentRole), toRoleSnapshot(updatedRole));

    await registerRoleAudit({
      rolId: Number(id),
      accion: 'UPDATE',
      usuarioId: options.usuarioId ?? null,
      cambios: {
        before: toRoleSnapshot(currentRole),
        after: toRoleSnapshot(updatedRole),
        changedFields,
        reason: typeof options.reason === 'string' && options.reason.trim() ? options.reason.trim() : null,
      },
    });

    return true;
  },
  delete: async (id, options = {}) => {
    const currentRole = await Roles.getById(id);

    const reason = typeof options.reason === 'string' ? options.reason.trim() : '';
    if (!reason || reason.length < 10 || reason.length > 50) {
      const error = new Error('El motivo de eliminación es obligatorio y debe tener entre 10 y 50 caracteres');
      error.statusCode = 400;
      error.details = { reasonLength: reason.length };
      throw error;
    }

    await pool.query('DELETE FROM roles WHERE id = $1', [id]);

    await registerRoleAudit({
      rolId: Number(id),
      accion: 'DELETE',
      usuarioId: options.usuarioId ?? null,
      cambios: {
        before: toRoleSnapshot(currentRole),
        after: null,
        reason,
      },
    });

    return true;
  },
  getAuditByRole: async (id) => {
    await ensureRoleAuditTable();
    const result = await pool.query(
      `SELECT ra.*, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
       FROM roles_auditoria ra
       LEFT JOIN usuarios u ON u.id = ra.usuario_id
       WHERE ra.rol_id = $1
       ORDER BY ra.created_at DESC`,
      [id]
    );
    return result.rows;
  }
};

module.exports = Roles;
