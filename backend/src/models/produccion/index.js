/**
 * Indice del modulo produccion
 *
 * Codigo distribuido desde entities.models.js. Tras la migracion,
 * entities.models.js permanece intacto pero desconectado: ningun consumidor
 * lo importa. La fuente activa es este archivo modular.
 */
const Insumos = require('./insumos');
const EntregasInsumos = require('./entregas-insumos');
const Produccion = require('./produccion');
const ProductoInsumos = require('./producto-insumos');
const InsumoMovimientos = require('./insumo-movimientos');

module.exports = {
  Insumos,
  EntregasInsumos,
  Produccion,
  ProductoInsumos,
  InsumoMovimientos,
};
