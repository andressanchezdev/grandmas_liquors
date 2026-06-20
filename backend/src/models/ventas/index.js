/**
 * Indice del modulo ventas
 *
 * Codigo distribuido desde entities.models.js. Tras la migracion,
 * entities.models.js permanece intacto pero desconectado: ningun consumidor
 * lo importa. La fuente activa es este archivo modular.
 */
const Clientes = require('./clientes');
const Pedidos = require('./pedidos');
const Ventas = require('./ventas');
const Abonos = require('./abonos');
const Domicilios = require('./domicilios');

module.exports = {
  Clientes,
  Pedidos,
  Ventas,
  Abonos,
  Domicilios,
};
