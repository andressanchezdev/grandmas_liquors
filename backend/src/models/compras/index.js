/**
 * Indice del modulo compras
 *
 * Codigo distribuido desde entities.models.js. Tras la migracion,
 * entities.models.js permanece intacto pero desconectado: ningun consumidor
 * lo importa. La fuente activa es este archivo modular.
 */
const Categorias = require('./categorias');
const Productos = require('./productos');
const Proveedores = require('./proveedores');
const Compras = require('./compras');

module.exports = {
  Categorias,
  Productos,
  Proveedores,
  Compras,
};
