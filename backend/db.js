const { Pool } = require('pg');
const config = require('./config');

const dbPassword =
  typeof config.db.password === 'string' ? config.db.password : String(config.db.password || '');

// Crear el pool de conexiones a la base de datos PostgreSQL
const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: dbPassword,
  database: config.db.database,
  ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
  max: 50,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Verificar conexión a la base de datos
pool.connect()
  .then((client) => {
    console.log('✓ Conexión a Base de Datos PostgreSQL exitosa');
    client.release();
  })
  .catch((error) => {
    console.error('✗ Error al conectar a la Base de Datos:', error.message);
    process.exit(1);
  });

// Monitorear pool de conexiones para detectar agotamiento
if (config.server.env === 'production') {
  setInterval(() => {
    const totalCount = pool.totalCount;
    const idleCount = pool.idleCount;
    const waitingCount = pool.waitingCount;
    
    if (waitingCount > 0) {
      console.warn(`⚠️  DB Pool: ${totalCount} total, ${idleCount} idle, ${waitingCount} waiting - Posible agotamiento`);
    } else if (totalCount > 40) {
      console.warn(`⚠️  DB Pool: ${totalCount} total, ${idleCount} idle - Uso alto (${Math.round(totalCount/50*100)}%)`);
    }
  }, 60000);
}

module.exports = pool;
