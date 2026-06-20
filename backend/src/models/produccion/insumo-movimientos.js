/**
 * Modelo InsumoMovimientos (auditoria de movimientos de insumo)
 *
 * Codigo distribuido desde entities.models.js. Tras la migracion,
 * entities.models.js permanece intacto pero desconectado: ningun consumidor
 * lo importa. La fuente activa es este archivo modular.
 */
const pool = require('../../../db');

const InsumoMovimientos = {
  getAll: async (filters = {}) => {
    let query = `
      SELECT im.*, i.nombre as insumo_nombre, u.nombre as usuario_nombre
      FROM insumo_movimientos im
      JOIN insumos i ON im.insumo_id = i.id
      LEFT JOIN usuarios u ON im.usuario_id = u.id
      WHERE 1=1
    `;
    const params = [];
    
    if (filters.insumo_id) {
      query += ` AND im.insumo_id = $${params.length + 1}`;
      params.push(filters.insumo_id);
    }
    if (filters.tipo_movimiento) {
      query += ` AND im.tipo_movimiento = $${params.length + 1}`;
      params.push(filters.tipo_movimiento);
    }
    if (filters.usuario_id) {
      query += ` AND im.usuario_id = $${params.length + 1}`;
      params.push(filters.usuario_id);
    }
    if (filters.fecha_desde) {
      query += ` AND im.created_at >= $${params.length + 1}`;
      params.push(filters.fecha_desde);
    }
    if (filters.fecha_hasta) {
      query += ` AND im.created_at <= $${params.length + 1}`;
      params.push(filters.fecha_hasta);
    }
    
    query += ' ORDER BY im.created_at DESC';
    const result = await pool.query(query, params);
    return result.rows;
  },
  getById: async (id) => {
    const result = await pool.query(
      `SELECT im.*, i.nombre as insumo_nombre, u.nombre as usuario_nombre
       FROM insumo_movimientos im
       JOIN insumos i ON im.insumo_id = i.id
       LEFT JOIN usuarios u ON im.usuario_id = u.id
       WHERE im.id = $1`,
      [id]
    );
    return result.rows[0];
  },
  create: async (data) => {
    if (!data.insumo_id || data.insumo_id <= 0) {
      const error = new Error('El ID del insumo es obligatorio y debe ser válido');
      error.statusCode = 400;
      throw error;
    }
    if (!['Entrega', 'Consumo', 'Ajuste'].includes(data.tipo_movimiento)) {
      const error = new Error('Tipo de movimiento inválido. Valores permitidos: Entrega, Consumo, Ajuste');
      error.statusCode = 400;
      throw error;
    }
    if (data.cantidad === undefined || data.cantidad === 0) {
      const error = new Error('La cantidad debe ser un valor diferente de cero');
      error.statusCode = 400;
      throw error;
    }
    if (!data.unidad || !String(data.unidad).trim()) {
      const error = new Error('La unidad es obligatoria');
      error.statusCode = 400;
      throw error;
    }
    
    const result = await pool.query(
      `INSERT INTO insumo_movimientos 
       (insumo_id, tipo_movimiento, cantidad, unidad, saldo_anterior, saldo_nuevo, referencia_tabla, referencia_id, usuario_id, razon) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING id`,
      [
        data.insumo_id,
        data.tipo_movimiento,
        data.cantidad,
        data.unidad,
        data.saldo_anterior || null,
        data.saldo_nuevo || null,
        data.referencia_tabla || null,
        data.referencia_id || null,
        data.usuario_id || null,
        data.razon || null
      ]
    );
    return result.rows[0].id;
  },
  getHistorialByInsumo: async (insumoId, limit = 50) => {
    const result = await pool.query(`
      SELECT im.*, i.nombre as insumo_nombre, u.nombre as usuario_nombre
      FROM insumo_movimientos im
      JOIN insumos i ON im.insumo_id = i.id
      LEFT JOIN usuarios u ON im.usuario_id = u.id
      WHERE im.insumo_id = $1
      ORDER BY im.created_at DESC
      LIMIT $2
    `, [insumoId, limit]);
    return result.rows;
  },
  getResumenByInsumo: async (insumoId) => {
    const result = await pool.query(`
      SELECT 
        i.id,
        i.nombre,
        i.cantidad as stock_actual,
        COUNT(CASE WHEN im.tipo_movimiento = 'Entrega' THEN 1 END) as total_entregas,
        COUNT(CASE WHEN im.tipo_movimiento = 'Consumo' THEN 1 END) as total_consumos,
        COUNT(CASE WHEN im.tipo_movimiento = 'Ajuste' THEN 1 END) as total_ajustes,
        COALESCE(SUM(CASE WHEN im.tipo_movimiento = 'Entrega' THEN im.cantidad ELSE 0 END), 0) as total_cantidad_entregada,
        COALESCE(SUM(CASE WHEN im.tipo_movimiento = 'Consumo' THEN ABS(im.cantidad) ELSE 0 END), 0) as total_cantidad_consumida,
        MAX(im.created_at) as ultimo_movimiento
      FROM insumos i
      LEFT JOIN insumo_movimientos im ON i.id = im.insumo_id
      WHERE i.id = $1
      GROUP BY i.id, i.nombre, i.cantidad
    `, [insumoId]);
    return result.rows[0] || null;
  }
};

module.exports = InsumoMovimientos;
