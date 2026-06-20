/**
 * Indice del modulo usuarios
 *
 * Codigo distribuido desde entities.models.js. Tras la migracion,
 * entities.models.js permanece intacto pero desconectado: ningun consumidor
 * lo importa. La fuente activa es este archivo modular.
 */
const Roles = require('./roles');
const Usuarios = require('./usuarios');

module.exports = {
  Roles,
  Usuarios,
};
