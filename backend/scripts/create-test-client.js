/**
 * Script para crear un cliente de prueba en la base de datos
 * 
 * Uso: node scripts/create-test-client.js
 */

const pool = require('../db');
const bcrypt = require('bcryptjs');

const createTestClient = async () => {
  const client = await pool.connect();
  try {
    // Email y contraseña del cliente de prueba
    const testEmail = 'cliente@test.com';
    const testPassword = 'Test@1234';  // Debe cumplir requisitos: 8+ chars, mayúscula, minúscula, número
    const testData = {
      nombre: 'Cliente',
      apellido: 'Prueba',
      email: testEmail,
      documento: '1234567890',
      tipoDocumento: 'CC',
      telefono: '3005551234',
      direccion: 'Calle Principal 123, Apartamento 101',
    };

    // 1. Obtener el ID del rol "Cliente"
    const roleResult = await client.query(
      'SELECT id FROM roles WHERE nombre = $1 LIMIT 1',
      ['Cliente']
    );

    if (roleResult.rows.length === 0) {
      console.error('❌ Error: No existe el rol "Cliente" en la base de datos.');
      console.log('   Por favor, ejecuta las migraciones primero: npm run migrate');
      process.exit(1);
    }

    const roleId = roleResult.rows[0].id;
    console.log(`✓ Rol Cliente encontrado con ID: ${roleId}`);

    // 2. Verificar si el cliente ya existe
    const existingUser = await client.query(
      'SELECT id FROM usuarios WHERE LOWER(email) = LOWER($1)',
      [testEmail]
    );

    if (existingUser.rows.length > 0) {
      console.log(`✓ El usuario cliente ${testEmail} ya existe en la base de datos.`);
      console.log(`  ID: ${existingUser.rows[0].id}`);
      console.log('\n📌 Credenciales de acceso:');
      console.log(`   Email: ${testEmail}`);
      console.log(`   Contraseña: ${testPassword}`);
      return;
    }

    // 3. Hash de la contraseña
    const passwordHash = await bcrypt.hash(testPassword, 10);
    console.log('✓ Contraseña hasheada');

    // 4. Insertar el usuario
    const userResult = await client.query(
      `INSERT INTO usuarios (
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Activo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, email, nombre, apellido`,
      [
        testData.nombre,
        testData.apellido,
        testData.email,
        passwordHash,
        testData.tipoDocumento,
        testData.documento,
        testData.telefono,
        testData.direccion,
        roleId,
      ]
    );

    const usuario = userResult.rows[0];
    console.log(`✓ Usuario cliente creado exitosamente`);
    console.log(`  ID: ${usuario.id}`);
    console.log(`  Nombre: ${usuario.nombre} ${usuario.apellido}`);

    // 5. Crear el perfil de cliente asociado
    const clienteResult = await client.query(
      `INSERT INTO clientes (
        usuario_id,
        nombre,
        apellido,
        email,
        tipo_documento,
        documento,
        telefono,
        direccion,
        estado,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Activo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (usuario_id) DO NOTHING
      RETURNING id`,
      [
        usuario.id,
        testData.nombre,
        testData.apellido,
        testData.email,
        testData.tipoDocumento,
        testData.documento,
        testData.telefono,
        testData.direccion,
      ]
    );

    if (clienteResult.rows.length > 0) {
      console.log(`✓ Perfil de cliente creado`);
      console.log(`  ID Cliente: ${clienteResult.rows[0].id}`);
    }

    console.log('\n✅ Cliente de prueba creado exitosamente!');
    console.log('\n📌 Credenciales de acceso en la app móvil:');
    console.log('─'.repeat(50));
    console.log(`📧 Email:        ${testEmail}`);
    console.log(`🔑 Contraseña:   ${testPassword}`);
    console.log('─'.repeat(50));
    console.log('\n💡 Ahora puedes iniciar sesión en la aplicación móvil con estas credenciales.');

  } catch (error) {
    console.error('❌ Error al crear el cliente de prueba:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  No se pudo conectar a la base de datos.');
      console.log('   Asegúrate de que PostgreSQL está corriendo y las variables de entorno están configuradas correctamente.');
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

// Ejecutar el script
console.log('🔄 Creando cliente de prueba...\n');
createTestClient().catch(console.error);
