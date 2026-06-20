-- Script para insertar un cliente de prueba en la BD
-- Este script crea un usuario cliente y su perfil asociado

-- NOTA: Ejecuta este SQL en tu base de datos PostgreSQL
-- psql -U tu_usuario -d tu_base_datos -f insert-test-client.sql

-- Primero, verifica que existe el rol "Cliente"
SELECT id FROM roles WHERE nombre = 'Cliente' LIMIT 1;

-- Obtén el ID del rol Cliente (debería retornar algo como 3)
-- Si no existe, créalo:
-- INSERT INTO roles (nombre, descripcion, estado) VALUES ('Cliente', 'Cliente de la tienda', 'Activo');

-- Ahora inserta el usuario cliente con contraseña: Test@1234
-- El hash de bcrypt para "Test@1234" es: $2a$10$E6n.mqH3FWJ3h7Qv0tLvmeZ/fQl4FWzM6Nn5K6VcMO3GfYi4TQ8vK

INSERT INTO usuarios (
  nombre,
  apellido,
  email,
  password_hash,
  tipo_documento,
  documento,
  telefono,
  direccion,
  rol_id,
  estado,
  created_at,
  updated_at
) VALUES (
  'Cliente',
  'Prueba',
  'cliente@test.com',
  '$2a$10$E6n.mqH3FWJ3h7Qv0tLvmeZ/fQl4FWzM6Nn5K6VcMO3GfYi4TQ8vK',
  'CC',
  '1234567890',
  '3005551234',
  'Calle Principal 123, Apt 101',
  (SELECT id FROM roles WHERE nombre = 'Cliente' LIMIT 1),
  'Activo',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT (email) DO NOTHING
RETURNING id;

-- Luego, crea el perfil de cliente asociado (si no existe automáticamente)
-- INSERT INTO clientes (usuario_id, nombre, apellido, email, estado, created_at, updated_at)
-- SELECT id, nombre, apellido, email, estado, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
-- FROM usuarios WHERE email = 'cliente@test.com'
-- ON CONFLICT (usuario_id) DO NOTHING;
