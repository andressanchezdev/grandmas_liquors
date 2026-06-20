-- ============================================================
-- GRANDMA'S LIQUORS - BASE DE DATOS COMPLETA
-- ============================================================
-- Script de inicialización completo compatible con pgAdmin 4
-- Versión: 1.0
-- 
-- INSTRUCCIONES EN PGADMIN 4:
-- 1. Cree una base de datos vacía desde pgAdmin 4.
-- 2. Seleccione esa base de datos y abra Query Tool.
-- 3. Copie y pegue este archivo completo y ejecútelo.
-- 4. Este script trabaja sobre la base actualmente seleccionada:
--    elimina tablas previas del proyecto, recrea la estructura, funciones,
--    triggers y carga los datos semilla solicitados.
-- 5. También puede seguir usándose desde `npm run migrate` sin cambios.
--
-- El script incluye:
--    - Estructura de tablas
--    - Datos iniciales (roles, usuarios, categorías, productos)
--    - Funciones y triggers
-- ============================================================

BEGIN;

-- ============================================================
-- PARTE 1: LIMPIAR TABLAS EXISTENTES
-- ============================================================

DROP TRIGGER IF EXISTS trigger_sync_cliente_from_usuario ON usuarios CASCADE;
DROP TRIGGER IF EXISTS trigger_sync_usuario_from_cliente ON clientes CASCADE;
DROP FUNCTION IF EXISTS sync_cliente_from_usuario() CASCADE;
DROP FUNCTION IF EXISTS sync_usuario_from_cliente() CASCADE;

DROP TABLE IF EXISTS schema_migrations CASCADE;
DROP TABLE IF EXISTS api_rate_limit_log CASCADE;
DROP TABLE IF EXISTS usuarios_login_intentos CASCADE;
DROP TABLE IF EXISTS usuarios_password_resets CASCADE;
DROP TABLE IF EXISTS usuarios_password_historial CASCADE;
DROP TABLE IF EXISTS usuarios_backup CASCADE;
DROP TABLE IF EXISTS usuarios_sesiones CASCADE;
DROP TABLE IF EXISTS usuarios_auditoria CASCADE;
DROP TABLE IF EXISTS roles_auditoria CASCADE;
DROP TABLE IF EXISTS proveedores_auditoria CASCADE;
DROP TABLE IF EXISTS compras_estado_historial CASCADE;
DROP TABLE IF EXISTS productos_auditoria CASCADE;
DROP TABLE IF EXISTS categorias_auditoria CASCADE;
DROP TABLE IF EXISTS clientes_auditoria CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS detalle_ventas CASCADE;
DROP TABLE IF EXISTS detalle_compras CASCADE;
DROP TABLE IF EXISTS detalle_pedidos CASCADE;
DROP TABLE IF EXISTS producto_insumos CASCADE;
DROP TABLE IF EXISTS entregas_insumos CASCADE;
DROP TABLE IF EXISTS insumo_movimientos CASCADE;
DROP TABLE IF EXISTS produccion CASCADE;
DROP TABLE IF EXISTS domicilios CASCADE;
DROP TABLE IF EXISTS abonos CASCADE;
DROP TABLE IF EXISTS ventas CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS compras CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS insumos CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ============================================================
-- PARTE 2: CREAR TABLAS
-- ============================================================

-- TABLA: roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL
        CHECK (char_length(trim(nombre)) BETWEEN 3 AND 50),
    descripcion TEXT,
    permisos TEXT[],
    estado VARCHAR(20) DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: schema_migrations
CREATE TABLE schema_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE,
    version VARCHAR(255) UNIQUE,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- TABLA: api_rate_limit_log (soporte para rate limiting distribuido)
CREATE TABLE api_rate_limit_log (
    id BIGSERIAL PRIMARY KEY,
    route_key VARCHAR(120) NOT NULL,
    identifier VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_rate_limit_route_identifier_created_at
    ON api_rate_limit_log (route_key, identifier, created_at);

-- TABLA: categorias
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    cantidad_productos INTEGER NOT NULL DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categorias_estado ON categorias(estado);

-- TABLA: productos
CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    descripcion TEXT,
    precio DECIMAL(18,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 10,
    imagen_url VARCHAR(255),
    estado VARCHAR(20) DEFAULT 'Activo',
    tipo_producto VARCHAR(30) NOT NULL DEFAULT 'terminado'
        CHECK (tipo_producto IN ('terminado','preparacion','insumo')),
    insumo_unidad_medida VARCHAR(30), -- presentacion: texto libre; UI catalogo insumo usa Unidades/Mililitros
    insumo_cantidad_medida NUMERIC(12,4), -- volumen/unidad: factor de receta en produccion (no afecta el descuento de stock al entregar al productor)
    ficha_tecnica JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE productos
    ADD CONSTRAINT productos_preparacion_stock_cero_chk
    CHECK (tipo_producto <> 'preparacion' OR COALESCE(stock, 0) = 0);

CREATE UNIQUE INDEX ux_productos_nombre_tipo_normalizado
    ON productos (LOWER(TRIM(nombre)), tipo_producto);

CREATE INDEX idx_productos_categoria_id ON productos(categoria_id);
CREATE INDEX idx_productos_estado ON productos(estado);
CREATE INDEX idx_productos_tipo_producto ON productos(tipo_producto);
CREATE INDEX idx_productos_categoria_estado ON productos(categoria_id, estado);

-- TABLA: usuarios
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    tipo_documento VARCHAR(20) NOT NULL,
    documento VARCHAR(20) UNIQUE NOT NULL,
    direccion TEXT,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    rol_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    estado VARCHAR(20) DEFAULT 'Activo',
    password_email_expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_estado ON usuarios(estado);
CREATE INDEX idx_usuarios_rol_id ON usuarios(rol_id);
CREATE INDEX idx_usuarios_email_estado ON usuarios(email, estado);

-- TABLA: clientes
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    tipo_documento VARCHAR(20) NOT NULL,
    documento VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    foto_url VARCHAR(255),
    estado VARCHAR(20) DEFAULT 'Activo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_clientes_email_normalizado
    ON clientes (LOWER(TRIM(email)))
    WHERE email IS NOT NULL AND TRIM(email) <> '';

CREATE INDEX idx_clientes_estado ON clientes(estado);
CREATE INDEX idx_clientes_usuario_id ON clientes(usuario_id);

-- TABLA: proveedores
CREATE TABLE proveedores (
    id SERIAL PRIMARY KEY,
    tipo_persona VARCHAR(20) NOT NULL,
    nombre_empresa VARCHAR(150),
    nit VARCHAR(30),
    nombre VARCHAR(100),
    apellido VARCHAR(100),
    tipo_documento VARCHAR(20),
    numero_documento VARCHAR(20),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    estado VARCHAR(20) DEFAULT 'Activo',
    preferente BOOLEAN DEFAULT FALSE,
    rating NUMERIC(3,2),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ux_proveedores_nit_normalizado
    ON proveedores ((regexp_replace(TRIM(COALESCE(nit, '')), '\D', '', 'g')))
    WHERE nit IS NOT NULL AND TRIM(nit) <> '';

CREATE UNIQUE INDEX ux_proveedores_documento_normalizado
    ON proveedores ((regexp_replace(TRIM(COALESCE(numero_documento, '')), '\D', '', 'g')))
    WHERE numero_documento IS NOT NULL AND TRIM(numero_documento) <> '';

CREATE UNIQUE INDEX ux_proveedores_email_normalizado
    ON proveedores (LOWER(TRIM(email)))
    WHERE email IS NOT NULL AND TRIM(email) <> '';

CREATE UNIQUE INDEX ux_proveedores_telefono_normalizado
    ON proveedores ((regexp_replace(TRIM(COALESCE(telefono, '')), '\D', '', 'g')))
    WHERE telefono IS NOT NULL AND TRIM(telefono) <> '';

-- TABLA: pedidos
CREATE TABLE pedidos (
    id SERIAL PRIMARY KEY,
    numero_pedido VARCHAR(50) UNIQUE NOT NULL,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    fecha DATE NOT NULL,
    fecha_entrega DATE,
    detalles TEXT,
    direccion TEXT,
    telefono VARCHAR(20),
    total DECIMAL(10,2) DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'Pendiente',
    metodo_pago VARCHAR(50) DEFAULT 'Efectivo',
    esquema_abono VARCHAR(20) DEFAULT '100%',
    monto_abonado DECIMAL(18,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pedidos_cliente_id ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_fecha ON pedidos(fecha);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_cliente_estado ON pedidos(cliente_id, estado);
CREATE INDEX idx_pedidos_cliente_fecha ON pedidos(cliente_id, fecha);
ALTER TABLE pedidos
    ADD CONSTRAINT pedidos_numero_formato_chk
    CHECK (numero_pedido ~ '^P[0-9]{3,}$');

-- TABLA: detalle_pedidos
CREATE TABLE detalle_pedidos (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(18,2) NOT NULL,
    subtotal DECIMAL(18,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_detalle_pedidos_pedido_id ON detalle_pedidos(pedido_id);
CREATE INDEX idx_detalle_pedidos_producto_id ON detalle_pedidos(producto_id);

-- TABLA: ventas
CREATE TABLE ventas (
    id SERIAL PRIMARY KEY,
    numero_venta VARCHAR(50) UNIQUE NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE RESTRICT,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    metodopago VARCHAR(50),
    metodo_pago VARCHAR(50),
    abono_recibido DECIMAL(18,2) DEFAULT 0,
    total DECIMAL(18,2) NOT NULL,
    estado VARCHAR(30) DEFAULT 'Completada',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ventas_cliente_id ON ventas(cliente_id);
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_ventas_estado ON ventas(estado);
CREATE INDEX idx_ventas_cliente_fecha ON ventas(cliente_id, fecha);
CREATE INDEX idx_ventas_pedido_id ON ventas(pedido_id);
ALTER TABLE ventas
    ADD CONSTRAINT ventas_numero_formato_chk
    CHECK (numero_venta ~ '^V[0-9]{3,}$');

-- TABLA: detalle_ventas
CREATE TABLE detalle_ventas (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(18,2) NOT NULL,
    subtotal DECIMAL(18,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_detalle_ventas_venta_id ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_ventas_producto_id ON detalle_ventas(producto_id);

-- TABLA: abonos
CREATE TABLE abonos (
    id SERIAL PRIMARY KEY,
    numero_abono VARCHAR(50) UNIQUE NOT NULL,
    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    monto DECIMAL(10,2) NOT NULL,
    fecha DATE NOT NULL,
    metodo_pago VARCHAR(50) NOT NULL,
    -- Estados validos: Registrado, Verificado, Aplicado, Cancelado, Finalizado.
    -- 'Finalizado' es un estado terminal que se asigna automaticamente cuando el
    -- domicilio del pedido se marca como entregado: en ese momento el abono
    -- inicial se actualiza al 100% del total y se consolida la informacion
    -- de las dos partes del pago en la columna `detalle`.
    estado VARCHAR(20) DEFAULT 'Registrado',
    detalle TEXT,
    comprobante_url TEXT,
    porcentaje_abonado INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_abonos_pedido_id ON abonos(pedido_id);
CREATE INDEX idx_abonos_cliente_id ON abonos(cliente_id);
CREATE INDEX idx_abonos_fecha ON abonos(fecha);
CREATE INDEX idx_abonos_estado ON abonos(estado);
ALTER TABLE abonos
    ADD CONSTRAINT abonos_numero_formato_chk
    CHECK (numero_abono ~ '^A[0-9]{3,}$');

-- TABLA: domicilios
CREATE TABLE domicilios (
    id SERIAL PRIMARY KEY,
    numero_domicilio VARCHAR(50) UNIQUE NOT NULL,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    direccion TEXT NOT NULL,
    repartidor VARCHAR(100),
    repartidor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    hora TIME,
    estado VARCHAR(20) DEFAULT 'Pendiente',
    detalle TEXT,
    motivo_cancelacion VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_domicilios_pedido_id ON domicilios(pedido_id);
CREATE INDEX idx_domicilios_cliente_id ON domicilios(cliente_id);
CREATE INDEX idx_domicilios_estado ON domicilios(estado);
CREATE INDEX idx_domicilios_fecha ON domicilios(fecha);
CREATE INDEX idx_domicilios_repartidor_id ON domicilios(repartidor_id);
ALTER TABLE domicilios
    ADD CONSTRAINT domicilios_numero_formato_chk
    CHECK (numero_domicilio ~ '^D[0-9]{3,}$');

-- TABLA: compras
CREATE TABLE compras (
    id SERIAL PRIMARY KEY,
    numero_compra VARCHAR(50) UNIQUE NOT NULL,
    proveedor_id INTEGER REFERENCES proveedores(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(18,2) DEFAULT 0,
    iva DECIMAL(18,2) DEFAULT 0,
    total DECIMAL(18,2) NOT NULL,
    observaciones TEXT,
    requiere_aprobacion BOOLEAN DEFAULT FALSE,
    aprobacion_extraordinaria BOOLEAN DEFAULT FALSE,
    motivo_aprobacion TEXT,
    estado VARCHAR(20) DEFAULT 'Pendiente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compras_proveedor_id ON compras(proveedor_id);
CREATE INDEX idx_compras_fecha ON compras(fecha);
CREATE INDEX idx_compras_estado ON compras(estado);
ALTER TABLE compras
    ADD CONSTRAINT compras_numero_formato_chk
    CHECK (numero_compra ~ '^C[0-9]{3,}$');

-- TABLA: detalle_compras (lineas: no incluir productos tipo preparacion; validado en API)
CREATE TABLE detalle_compras (
    id SERIAL PRIMARY KEY,
    compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(18,2) NOT NULL,
    subtotal DECIMAL(18,2) NOT NULL,
    porcentaje_ganancia NUMERIC(12,2) DEFAULT 0 CHECK (porcentaje_ganancia >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_detalle_compras_compra_id ON detalle_compras(compra_id);
CREATE INDEX idx_detalle_compras_producto_id ON detalle_compras(producto_id);

-- TABLA: insumos
CREATE TABLE insumos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    cantidad DECIMAL(10,2) DEFAULT 0,
    unidad VARCHAR(20) NOT NULL,
    stock_minimo DECIMAL(10,2) DEFAULT 10,
    estado VARCHAR(20) DEFAULT 'Activo',
    ultimo_operario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    ultima_fecha TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_insumos_estado ON insumos(estado);

-- TABLA: producto_insumos (receta: insumo legacy por id; la produccion descuenta entregas al productor segun suma cantidad_requerida * cantidad preparacion del pedido)
CREATE TABLE producto_insumos (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    insumo_id INTEGER NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
    cantidad_requerida DECIMAL(12,4) NOT NULL CHECK (cantidad_requerida > 0),
    unidad VARCHAR(20) NOT NULL,
    notas TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (producto_id, insumo_id)
);

CREATE INDEX idx_producto_insumos_producto_id ON producto_insumos(producto_id);
CREATE INDEX idx_producto_insumos_insumo_id ON producto_insumos(insumo_id);

-- TABLA: entregas_insumos (al registrar una entrega se descuenta stock en productos tipo insumo o en insumos legacy)
CREATE TABLE entregas_insumos (
    id SERIAL PRIMARY KEY,
    numero_entrega VARCHAR(50) UNIQUE NOT NULL,
    insumo_id INTEGER REFERENCES insumos(id) ON DELETE CASCADE,
    producto_catalogo_id INTEGER REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad DECIMAL(10,2) NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    operario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    hora TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    anulada BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT entregas_insumos_catalogo_xor_chk CHECK (
        (insumo_id IS NOT NULL AND producto_catalogo_id IS NULL)
        OR (insumo_id IS NULL AND producto_catalogo_id IS NOT NULL)
    )
);

CREATE INDEX idx_entregas_insumos_insumo_id ON entregas_insumos(insumo_id);
CREATE INDEX idx_entregas_insumos_producto_catalogo_id ON entregas_insumos(producto_catalogo_id);
CREATE INDEX idx_entregas_insumos_fecha ON entregas_insumos(fecha);
CREATE INDEX idx_entregas_insumos_operario_id ON entregas_insumos(operario_id);
ALTER TABLE entregas_insumos
    ADD CONSTRAINT entregas_numero_formato_chk
    CHECK (numero_entrega ~ '^E[0-9]{3,}$');

-- TABLA: insumo_movimientos
CREATE TABLE insumo_movimientos (
    id SERIAL PRIMARY KEY,
    insumo_id INTEGER NOT NULL REFERENCES insumos(id) ON DELETE CASCADE,
    tipo_movimiento VARCHAR(30) NOT NULL,
    cantidad DECIMAL(12,4) NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    saldo_anterior DECIMAL(12,4),
    saldo_nuevo DECIMAL(12,4),
    referencia_tabla VARCHAR(50),
    referencia_id INTEGER,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    razon TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_insumo_movimientos_insumo_id ON insumo_movimientos(insumo_id);
CREATE INDEX idx_insumo_movimientos_created_at ON insumo_movimientos(created_at);

-- TABLA: produccion
CREATE TABLE produccion (
    id SERIAL PRIMARY KEY,
    numero_produccion VARCHAR(50) UNIQUE NOT NULL,
    producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE SET NULL, -- regla negocio: un pedido solo una produccion (API)
    cantidad INTEGER NOT NULL CHECK (cantidad > 0),
    fecha DATE NOT NULL,
    responsable VARCHAR(150),
    productor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    tiempo_preparacion_minutos INTEGER DEFAULT 1 CHECK (tiempo_preparacion_minutos > 0),
    estado VARCHAR(40) DEFAULT 'Orden Recibida'
        CHECK (estado IN ('Orden Recibida','Orden en preparacion','Orden Lista','Cancelada')),
    notes TEXT,
    -- insumos_gastados: descuento solo en entregas_insumos (FIFO); no modifica productos.stock del inventario central
    insumos_gastados JSONB DEFAULT '[]'::jsonb,
    detalle_preparacion JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_produccion_producto_id ON produccion(producto_id);
CREATE INDEX idx_produccion_pedido_id ON produccion(pedido_id);
CREATE INDEX idx_produccion_estado ON produccion(estado);
CREATE INDEX idx_produccion_fecha ON produccion(fecha);
CREATE INDEX idx_produccion_productor_id ON produccion(productor_id);
ALTER TABLE produccion
    ADD CONSTRAINT produccion_numero_formato_chk
    CHECK (numero_produccion ~ '^O[0-9]{3,}$');

-- TABLAS DE AUDITORÍA
CREATE TABLE productos_auditoria (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER,
    accion VARCHAR(20) NOT NULL,
    usuario_id INTEGER,
    cambios JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_productos_auditoria_producto_id ON productos_auditoria(producto_id);
CREATE INDEX idx_productos_auditoria_created_at ON productos_auditoria(created_at);

CREATE TABLE categorias_auditoria (
    id SERIAL PRIMARY KEY,
    categoria_id INTEGER,
    accion VARCHAR(20) NOT NULL,
    usuario_id INTEGER,
    cambios JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categorias_auditoria_categoria_id ON categorias_auditoria(categoria_id);
CREATE INDEX idx_categorias_auditoria_created_at ON categorias_auditoria(created_at);

CREATE TABLE clientes_auditoria (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER,
    accion VARCHAR(20) NOT NULL,
    usuario_id INTEGER,
    cambios JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clientes_auditoria_cliente_id ON clientes_auditoria(cliente_id);
CREATE INDEX idx_clientes_auditoria_created_at ON clientes_auditoria(created_at);

CREATE TABLE proveedores_auditoria (
    id SERIAL PRIMARY KEY,
    proveedor_id INTEGER,
    accion VARCHAR(20) NOT NULL,
    usuario_id INTEGER,
    cambios JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_proveedores_auditoria_proveedor_id ON proveedores_auditoria(proveedor_id);
CREATE INDEX idx_proveedores_auditoria_created_at ON proveedores_auditoria(created_at);

CREATE TABLE compras_estado_historial (
    id SERIAL PRIMARY KEY,
    compra_id INTEGER NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(20),
    estado_nuevo VARCHAR(20) NOT NULL,
    motivo TEXT,
    usuario_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compras_estado_historial_compra_id ON compras_estado_historial(compra_id);
CREATE INDEX idx_compras_estado_historial_created_at ON compras_estado_historial(created_at);

CREATE TABLE roles_auditoria (
    id SERIAL PRIMARY KEY,
    rol_id INTEGER,
    accion VARCHAR(20) NOT NULL,
    usuario_id INTEGER,
    cambios JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_roles_auditoria_rol_id ON roles_auditoria(rol_id);
CREATE INDEX idx_roles_auditoria_created_at ON roles_auditoria(created_at);

CREATE TABLE usuarios_auditoria (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER,
    accion VARCHAR(20) NOT NULL,
    actor_id INTEGER,
    cambios JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_auditoria_usuario_id ON usuarios_auditoria(usuario_id);
CREATE INDEX idx_usuarios_auditoria_created_at ON usuarios_auditoria(created_at);

CREATE TABLE usuarios_sesiones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    jti VARCHAR(120) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(64),
    user_agent TEXT
);

CREATE INDEX idx_usuarios_sesiones_usuario_id ON usuarios_sesiones(usuario_id);
CREATE INDEX idx_usuarios_sesiones_expires_at ON usuarios_sesiones(expires_at);
CREATE INDEX idx_usuarios_sesiones_revoked_at ON usuarios_sesiones(revoked_at);

CREATE TABLE usuarios_backup (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    actor_id INTEGER,
    reason TEXT,
    snapshot JSONB NOT NULL,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios_password_historial (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_password_historial_usuario_id ON usuarios_password_historial(usuario_id);
CREATE INDEX idx_usuarios_password_historial_created_at ON usuarios_password_historial(created_at);

CREATE TABLE usuarios_password_resets (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_password_resets_usuario_id ON usuarios_password_resets(usuario_id);
CREATE INDEX idx_usuarios_password_resets_expires_at ON usuarios_password_resets(expires_at);

CREATE TABLE usuarios_login_intentos (
    email VARCHAR(255) PRIMARY KEY,
    attempts INTEGER NOT NULL DEFAULT 0,
    blocked_until TIMESTAMP NULL,
    last_attempt_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- PARTE 3: DATOS INICIALES
-- ============================================================

-- Insertar roles
-- Nota:
--  * "Administrador" tiene bypass total en el frontend (ver routePermissions.ts),
--    asi que mantener permisos = '{}' es valido y no rompe nada.
--  * Los permisos sembrados para los demas roles son los conjuntos minimos
--    para que cada perfil pueda iniciar sesion y trabajar sin requerir
--    configuracion manual posterior por parte del Admin.
--  * Los permisos del rol "Cliente" son OBLIGATORIOS: sin ellos un cliente
--    recien registrado no veria la tienda ni sus pedidos. La lista debe
--    coincidir con CLIENT_ALLOWED_PERMISSIONS en src/models/entities.models.js.
INSERT INTO roles (nombre, descripcion, permisos, estado) VALUES
('Administrador', 'Acceso total a todas las funcionalidades', '{}', 'Activo'),
('Asesor', 'Operación completa excepto configuración y usuarios (solo Administrador)', ARRAY[
  'Ver Dashboard',
  'Ver Clientes', 'Crear Clientes', 'Editar Clientes', 'Eliminar Clientes',
  'Ver Ventas', 'Crear Ventas', 'Editar Ventas', 'Eliminar Ventas',
  'Ver Pedidos', 'Crear Pedidos', 'Editar Pedidos', 'Eliminar Pedidos',
  'Ver Abonos', 'Crear Abonos', 'Editar Abonos', 'Eliminar Abonos',
  'Ver Domicilios', 'Crear Domicilios', 'Editar Domicilios', 'Eliminar Domicilios',
  'Ver Productos', 'Crear Productos', 'Editar Productos', 'Eliminar Productos',
  'Ver Categorías', 'Crear Categorías', 'Editar Categorías', 'Eliminar Categorías',
  'Ver Proveedores', 'Crear Proveedores', 'Editar Proveedores', 'Eliminar Proveedores',
  'Ver Compras', 'Crear Compras', 'Editar Compras', 'Eliminar Compras',
  'Ver Insumos', 'Crear Insumos', 'Editar Insumos', 'Eliminar Insumos',
  'Entregar Insumos',
  'Ver Producción', 'Registrar Producción',
  'Ver Producto-Insumos', 'Crear Producto-Insumos', 'Editar Producto-Insumos', 'Eliminar Producto-Insumos'
], 'Activo'),
('Productor', 'Producción propia, entregas de insumos asignadas (solo consulta) y cambio de estado', ARRAY[
  'Ver Dashboard',
  'Ver Producción',
  'Registrar Producción',
  'Ver Insumos'
], 'Activo'),
('Repartidor', 'Puede gestionar domicilios y entregas', ARRAY[
  'Ver Dashboard',
  'Ver Domicilios', 'Editar Domicilios'
], 'Activo'),
('Cliente', 'Tienda y mis pedidos (estado de domicilio incluido en el pedido)', ARRAY[
  'Cliente',
  'Ver Dashboard',
  'Ver Tienda',
  'Ver Mis Pedidos'
], 'Activo');

-- Insertar usuarios semilla
-- Conteo solicitado: 10 usuarios internos
--   * 1 Administrador
--   * 3 Asesores
--   * 3 Productores
--   * 3 Repartidores
-- Todos los usuarios sembrados usan la misma contraseña: password_123
INSERT INTO usuarios (nombre, apellido, tipo_documento, documento, email, telefono, direccion, password_hash, rol_id, estado) VALUES
('Admin', 'Sistema', 'CC', '100012345600', 'admin@grandmas.com', '3001234500', 'Oficina Central', '$2b$10$npauCy3OmoZRWSMfDCfLGO1AfbaCFv54unyLryPZ6SsX0gFPhVuqC', 1, 'Activo'),
('Laura', 'Gomez', 'CC', '100012345601', 'asesor1@grandmas.com', '3001234501', 'Sucursal Norte', '$2b$10$npauCy3OmoZRWSMfDCfLGO1AfbaCFv54unyLryPZ6SsX0gFPhVuqC', 2, 'Activo'),
('Mateo', 'Rios', 'CC', '100012345602', 'asesor2@grandmas.com', '3001234502', 'Sucursal Centro', '$2b$10$npauCy3OmoZRWSMfDCfLGO1AfbaCFv54unyLryPZ6SsX0gFPhVuqC', 2, 'Activo'),
('Sara', 'Lopez', 'CC', '100012345603', 'asesor3@grandmas.com', '3001234503', 'Sucursal Sur', '$2b$10$npauCy3OmoZRWSMfDCfLGO1AfbaCFv54unyLryPZ6SsX0gFPhVuqC', 2, 'Activo'),
('Daniel', 'Mora', 'CC', '100012345604', 'productor1@grandmas.com', '3001234504', 'Planta 1', '$2b$10$npauCy3OmoZRWSMfDCfLGO1AfbaCFv54unyLryPZ6SsX0gFPhVuqC', 3, 'Activo'),
('Paula', 'Vargas', 'CC', '100012345605', 'productor2@grandmas.com', '3001234505', 'Planta 2', '$2b$10$npauCy3OmoZRWSMfDCfLGO1AfbaCFv54unyLryPZ6SsX0gFPhVuqC', 3, 'Activo'),
('Julian', 'Castro', 'CC', '100012345606', 'productor3@grandmas.com', '3001234506', 'Planta 3', '$2b$10$npauCy3OmoZRWSMfDCfLGO1AfbaCFv54unyLryPZ6SsX0gFPhVuqC', 3, 'Activo'),
('Nicolas', 'Perez', 'CC', '100012345607', 'repartidor1@grandmas.com', '3001234507', 'Zona Occidente', '$2b$10$npauCy3OmoZRWSMfDCfLGO1AfbaCFv54unyLryPZ6SsX0gFPhVuqC', 4, 'Activo'),
('Valentina', 'Reyes', 'CC', '100012345608', 'repartidor2@grandmas.com', '3001234508', 'Zona Oriente', '$2b$10$npauCy3OmoZRWSMfDCfLGO1AfbaCFv54unyLryPZ6SsX0gFPhVuqC', 4, 'Activo'),
('Camilo', 'Torres', 'CC', '100012345609', 'repartidor3@grandmas.com', '3001234509', 'Zona Metropolitana', '$2b$10$npauCy3OmoZRWSMfDCfLGO1AfbaCFv54unyLryPZ6SsX0gFPhVuqC', 4, 'Activo');

INSERT INTO usuarios_password_historial (usuario_id, password_hash)
SELECT id, password_hash
FROM usuarios;

-- Insertar categorías de productos (12)
INSERT INTO categorias (nombre, descripcion, estado) VALUES
('Whiskies', 'Whiskies nacionales e importados para venta directa', 'Activo'),
('Rones', 'Rones blancos, dorados y anejo premium', 'Activo'),
('Vinos', 'Vinos tintos, blancos y espumosos', 'Activo'),
('Cervezas', 'Cervezas artesanales y comerciales listas para venta', 'Activo'),
('Tequilas', 'Tequilas y mezcales de distintas gamas', 'Activo'),
('Vodkas', 'Vodkas tradicionales y saborizados', 'Activo'),
('Cremas', 'Cremas licorosas listas para consumo', 'Activo'),
('Ginebras', 'Ginebras botanicas y citricas', 'Activo'),
('Aguardientes', 'Aguardientes clasicos y sin azucar', 'Activo'),
('Cocteleria lista', 'Bebidas y mezclas listas para servir', 'Activo'),
('Preparaciones', 'Bases y macerados de elaboracion interna', 'Activo'),
('Insumos de produccion', 'Materias primas y suministros para elaboracion', 'Activo');

-- Insertar productos (112) - 15 terminados, 56 insumos, 41 de preparación
INSERT INTO productos (id, nombre, categoria_id, descripcion, precio, stock, stock_minimo, estado, tipo_producto, insumo_unidad_medida, insumo_cantidad_medida, ficha_tecnica, imagen_url) VALUES
(1, 'Whisky Andino 750ml', 1, 'Whisky suave con notas de roble y vainilla', 68000.00, 24, 6, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_01.webp'),
(2, 'Whisky Reserva Roble 750ml', 1, 'Whisky madurado con perfil intenso y especiado', 82000.00, 18, 5, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_02.webp'),
(3, 'Ron Caribe Dorado 750ml', 2, 'Ron dorado ideal para cocteleria y consumo solo', 42000.00, 32, 8, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_03.webp'),
(4, 'Ron Anejo Gran Barrica 750ml', 2, 'Ron anejo con final largo y aroma tostado', 59000.00, 20, 6, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_04.webp'),
(5, 'Vino Tinto Casa Vieja 750ml', 3, 'Vino tinto afrutado de cuerpo medio', 36000.00, 28, 8, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_05.webp'),
(6, 'Vino Blanco Monteluna 750ml', 3, 'Vino blanco fresco con notas citricas', 34000.00, 22, 6, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_06.webp'),
(7, 'Espumoso Brisa Rosa 750ml', 3, 'Espumoso semidulce para celebraciones', 39000.00, 16, 5, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_07.webp'),
(8, 'Cerveza Rubia Artesanal 330ml', 4, 'Cerveza ligera con amargor balanceado', 6500.00, 72, 18, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_08.webp'),
(9, 'Cerveza Roja Artesanal 330ml', 4, 'Cerveza maltosa con notas caramelizadas', 6900.00, 65, 15, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_09.webp'),
(10, 'Cerveza Negra Porter 330ml', 4, 'Cerveza oscura con notas a cacao y cafe', 7200.00, 54, 14, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_10.webp'),
(11, 'Tequila Agave Azul 750ml', 5, 'Tequila joven 100 por ciento agave', 76000.00, 14, 4, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_11.webp'),
(12, 'Tequila Reposado Sierra 750ml', 5, 'Tequila reposado con notas de miel y madera', 89000.00, 12, 4, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_12.webp'),
(13, 'Vodka Cristal 700ml', 6, 'Vodka clasico de perfil limpio y neutro', 47000.00, 26, 7, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_13.webp'),
(14, 'Vodka Citrus 700ml', 6, 'Vodka saborizado con limon y cascara de naranja', 49000.00, 19, 5, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_14.webp'),
(15, 'Ginebra Botanica 750ml', 8, 'Ginebra artesanal con botanicos colombianos', 78000.00, 15, 4, 'Activo', 'terminado', NULL, NULL, NULL, '/uploads/productos/seed_15.webp'),
(16, 'Tequila Base', 12, 'Tequila a granel para coctelería', 45000.00, 50, 10, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_16.webp'),
(17, 'Triple Sec Base', 12, 'Licor triple sec para coctelería', 38000.00, 30, 8, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_17.webp'),
(18, 'Jugo de Limon', 12, 'Jugo de limón natural filtrado', 12000.00, 40, 10, 'Activo', 'insumo', 'Mililitros', 1000.0000, NULL, '/uploads/productos/seed_18.webp'),
(19, 'Sal x kg', 12, 'Sal refinada', 2500.00, 10, 2, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_19.webp'),
(20, 'Ron Blanco Base', 12, 'Ron blanco para mezclas', 35000.00, 60, 12, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_20.webp'),
(21, 'Crema de Coco', 12, 'Crema de coco para piña colada y cocoloco', 15000.00, 45, 10, 'Activo', 'insumo', 'Mililitros', 500.0000, NULL, '/uploads/productos/seed_21.webp'),
(22, 'Jugo de Pina', 12, 'Jugo de piña pasteurizado', 10000.00, 50, 10, 'Activo', 'insumo', 'Mililitros', 1000.0000, NULL, '/uploads/productos/seed_22.webp'),
(23, 'Leche Condensada', 12, 'Leche condensada pote', 12000.00, 30, 8, 'Activo', 'insumo', 'Mililitros', 350.0000, NULL, '/uploads/productos/seed_23.webp'),
(24, 'Whisky Base', 12, 'Whisky estándar para mezclas', 55000.00, 40, 10, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_24.webp'),
(25, 'Hielo Bolsas', 12, 'Bolsa de hielo en cubos', 3500.00, 100, 20, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_25.webp'),
(26, 'Hierbabuena Fresca', 12, 'Atado de hierbabuena fresca', 2000.00, 50, 10, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_26.webp'),
(27, 'Lima Unidad', 12, 'Limas frescas', 500.00, 200, 50, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_27.webp'),
(28, 'Azucar x kg', 12, 'Azúcar blanca', 3200.00, 30, 5, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_28.webp'),
(29, 'Soda Lata 300ml', 12, 'Agua con gas en lata', 2500.00, 120, 30, 'Activo', 'insumo', 'Mililitros', 300.0000, NULL, '/uploads/productos/seed_29.webp'),
(30, 'Amargo de Angostura', 12, 'Licor amargo concentrado', 75000.00, 10, 2, 'Activo', 'insumo', 'Mililitros', 100.0000, NULL, '/uploads/productos/seed_30.webp'),
(31, 'Naranja Unidad', 12, 'Naranjas frescas', 600.00, 150, 40, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_31.webp'),
(32, 'Fresas Frescas', 12, 'Fresas seleccionadas', 8000.00, 40, 10, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_32.webp'),
(33, 'Jugo de Naranja', 12, 'Jugo de naranja natural', 9000.00, 40, 10, 'Activo', 'insumo', 'Mililitros', 1000.0000, NULL, '/uploads/productos/seed_33.webp'),
(34, 'Granadina Jarabe', 12, 'Jarabe de granadina', 18000.00, 20, 5, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_34.webp'),
(35, 'Ginebra Base', 12, 'Ginebra estándar para coctelería', 48000.00, 30, 8, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_35.webp'),
(36, 'Campari Base', 12, 'Licor amargo Campari', 65000.00, 25, 6, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_36.webp'),
(37, 'Vermut Rojo Base', 12, 'Vermut rosso dulce', 42000.00, 25, 6, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_37.webp'),
(38, 'Prosecco Botella', 12, 'Vino espumoso Prosecco', 52000.00, 30, 8, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_38.webp'),
(39, 'Cola Lata 300ml', 12, 'Gaseosa sabor cola en lata', 2200.00, 150, 40, 'Activo', 'insumo', 'Mililitros', 300.0000, NULL, '/uploads/productos/seed_39.webp'),
(40, 'Cachaca Base', 12, 'Licor brasileño Cachaça', 46000.00, 20, 5, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_40.webp'),
(41, 'Vodka Base', 12, 'Vodka estándar para mezclas', 39000.00, 40, 10, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_41.webp'),
(42, 'Jugo de Tomate', 12, 'Jugo de tomate para Bloody Mary', 11000.00, 30, 8, 'Activo', 'insumo', 'Mililitros', 1000.0000, NULL, '/uploads/productos/seed_42.webp'),
(43, 'Especias Varias', 12, 'Salsas y condimentos para Bloody Mary', 15000.00, 15, 3, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_43.webp'),
(44, 'Apio Unidad', 12, 'Tallos de apio fresco', 1500.00, 50, 15, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_44.webp'),
(45, 'Vino Tinto Base', 12, 'Vino tinto joven para sangría', 28000.00, 50, 10, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_45.webp'),
(46, 'Frutas Varias', 12, 'Mezcla de frutas picadas para sangría', 6000.00, 30, 5, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_46.webp'),
(47, 'Brandy Base', 12, 'Licor Brandy para mezcla', 54000.00, 20, 5, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_47.webp'),
(48, 'Agua Tonica Lata', 12, 'Agua tónica en lata', 2600.00, 120, 30, 'Activo', 'insumo', 'Mililitros', 300.0000, NULL, '/uploads/productos/seed_48.webp'),
(49, 'Enebro Bayas', 12, 'Bayas de enebro deshidratadas x bolsa', 9000.00, 15, 4, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_49.webp'),
(50, 'Pisco Base', 12, 'Licor Pisco para chilcano y sour', 59000.00, 25, 6, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_50.webp'),
(51, 'Ginger Ale Lata', 12, 'Gaseosa ginger ale en lata', 2600.00, 120, 30, 'Activo', 'insumo', 'Mililitros', 300.0000, NULL, '/uploads/productos/seed_51.webp'),
(52, 'Cerveza Base', 12, 'Cerveza rubia para michelada', 3500.00, 200, 45, 'Activo', 'insumo', 'Mililitros', 330.0000, NULL, '/uploads/productos/seed_52.webp'),
(53, 'Salsa Picante', 12, 'Salsa de chile picante', 8500.00, 20, 5, 'Activo', 'insumo', 'Mililitros', 150.0000, NULL, '/uploads/productos/seed_53.webp'),
(54, 'Licor 43 Base', 12, 'Licor 43 español para carajillo', 89000.00, 18, 5, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_54.webp'),
(55, 'Cafe Expreso', 12, 'Café expreso concentrado', 18000.00, 40, 10, 'Activo', 'insumo', 'Mililitros', 1000.0000, NULL, '/uploads/productos/seed_55.webp'),
(56, 'Flor de Jamaica', 12, 'Flor de jamaica seca x paquete', 8000.00, 25, 6, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_56.webp'),
(57, 'Agua Purificada', 12, 'Agua filtrada pura', 1500.00, 100, 20, 'Activo', 'insumo', 'Mililitros', 1000.0000, NULL, '/uploads/productos/seed_57.webp'),
(58, 'Clara de Huevo', 12, 'Clara de huevo deshidratada / fresca', 12000.00, 15, 4, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_58.webp'),
(59, 'Crema de Leche', 12, 'Crema de leche líquida', 14000.00, 20, 5, 'Activo', 'insumo', 'Mililitros', 500.0000, NULL, '/uploads/productos/seed_59.webp'),
(60, 'Almibar Simple', 12, 'Jarabe de azúcar y agua', 8000.00, 30, 8, 'Activo', 'insumo', 'Mililitros', 1000.0000, NULL, '/uploads/productos/seed_60.webp'),
(61, 'Jugo de Arandano', 12, 'Jugo de arándanos embotellado', 16000.00, 25, 6, 'Activo', 'insumo', 'Mililitros', 1000.0000, NULL, '/uploads/productos/seed_61.webp'),
(62, 'Licor de Durazno', 12, 'Licor Peach Schnapps para mezclas', 34000.00, 20, 5, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_62.webp'),
(63, 'Pure de Durazno', 12, 'Puré de durazno concentrado', 18000.00, 15, 4, 'Activo', 'insumo', 'Mililitros', 500.0000, NULL, '/uploads/productos/seed_63.webp'),
(64, 'Menta Fresca', 12, 'Hojas de menta fresca', 2500.00, 30, 8, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_64.webp'),
(65, 'Jarabe de Frambuesa', 12, 'Sirope de frambuesa dulce', 22000.00, 15, 4, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_65.webp'),
(66, 'Ron Oscuro Base', 12, 'Ron oscuro para coctelería', 44000.00, 20, 5, 'Activo', 'insumo', 'Mililitros', 750.0000, NULL, '/uploads/productos/seed_66.webp'),
(67, 'Cerveza de Jengibre', 12, 'Ginger Beer para Moscow Mule', 4800.00, 100, 25, 'Activo', 'insumo', 'Mililitros', 330.0000, NULL, '/uploads/productos/seed_67.webp'),
(68, 'Canela Astillas', 12, 'Canela en astillas x bolsa', 6000.00, 20, 5, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_68.webp'),
(69, 'Panela Bloque', 12, 'Panela de caña de azúcar', 4500.00, 50, 10, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_69.webp'),
(70, 'Limon Unidad', 12, 'Limón de castilla fresco', 400.00, 300, 80, 'Activo', 'insumo', 'Unidades', 1.0000, NULL, '/uploads/productos/seed_70.webp'),
(71, 'Esencia de Vainilla', 12, 'Esencia de vainilla x frasco', 12000.00, 20, 5, 'Activo', 'insumo', 'Mililitros', 250.0000, NULL, '/uploads/productos/seed_71.webp'),
(72, 'Margarita Clásica', 11, 'Preparación artesanal de Margarita Clásica', 25000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":16,"insumo_nombre":"Tequila Base","cantidad":50,"unidad":"Mililitros"},{"producto_catalogo_id":17,"insumo_nombre":"Triple Sec Base","cantidad":25,"unidad":"Mililitros"},{"producto_catalogo_id":18,"insumo_nombre":"Jugo de Limon","cantidad":20,"unidad":"Mililitros"},{"producto_catalogo_id":19,"insumo_nombre":"Sal x kg","cantidad":1,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_72.webp'),
(73, 'Cocoloco', 11, 'Preparación artesanal de Cocoloco', 28000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":20,"insumo_nombre":"Ron Blanco Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":21,"insumo_nombre":"Crema de Coco","cantidad":30,"unidad":"Mililitros"},{"producto_catalogo_id":22,"insumo_nombre":"Jugo de Pina","cantidad":60,"unidad":"Mililitros"},{"producto_catalogo_id":23,"insumo_nombre":"Leche Condensada","cantidad":15,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_73.webp'),
(74, 'Whisky en Rocas', 11, 'Preparación artesanal de Whisky en Rocas', 30000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":24,"insumo_nombre":"Whisky Base","cantidad":60,"unidad":"Mililitros"},{"producto_catalogo_id":25,"insumo_nombre":"Hielo Bolsas","cantidad":3,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_74.webp'),
(75, 'Mojito Cubano', 11, 'Preparación artesanal de Mojito Cubano', 22000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":20,"insumo_nombre":"Ron Blanco Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":64,"insumo_nombre":"Menta Fresca","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":27,"insumo_nombre":"Lima Unidad","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":28,"insumo_nombre":"Azucar x kg","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":29,"insumo_nombre":"Soda Lata 300ml","cantidad":120,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_75.webp'),
(76, 'Piña Colada', 11, 'Preparación artesanal de Piña Colada', 26000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":20,"insumo_nombre":"Ron Blanco Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":21,"insumo_nombre":"Crema de Coco","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":22,"insumo_nombre":"Jugo de Pina","cantidad":90,"unidad":"Mililitros"},{"producto_catalogo_id":25,"insumo_nombre":"Hielo Bolsas","cantidad":4,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_76.webp'),
(77, 'Old Fashioned', 11, 'Preparación artesanal de Old Fashioned', 32000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":24,"insumo_nombre":"Whisky Base","cantidad":60,"unidad":"Mililitros"},{"producto_catalogo_id":28,"insumo_nombre":"Azucar x kg","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":30,"insumo_nombre":"Amargo de Angostura","cantidad":2,"unidad":"Mililitros"},{"producto_catalogo_id":31,"insumo_nombre":"Naranja Unidad","cantidad":1,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_77.webp'),
(78, 'Daiquiri de Fresa', 11, 'Preparación artesanal de Daiquiri de Fresa', 24000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":20,"insumo_nombre":"Ron Blanco Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":32,"insumo_nombre":"Fresas Frescas","cantidad":4,"unidad":"Unidades"},{"producto_catalogo_id":18,"insumo_nombre":"Jugo de Limon","cantidad":15,"unidad":"Mililitros"},{"producto_catalogo_id":28,"insumo_nombre":"Azucar x kg","cantidad":1,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_78.webp'),
(79, 'Tequila Sunrise', 11, 'Preparación artesanal de Tequila Sunrise', 25000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":16,"insumo_nombre":"Tequila Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":33,"insumo_nombre":"Jugo de Naranja","cantidad":120,"unidad":"Mililitros"},{"producto_catalogo_id":34,"insumo_nombre":"Granadina Jarabe","cantidad":15,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_79.webp'),
(80, 'Negroni', 11, 'Preparación artesanal de Negroni', 29000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":35,"insumo_nombre":"Ginebra Base","cantidad":30,"unidad":"Mililitros"},{"producto_catalogo_id":36,"insumo_nombre":"Campari Base","cantidad":30,"unidad":"Mililitros"},{"producto_catalogo_id":37,"insumo_nombre":"Vermut Rojo Base","cantidad":30,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_80.webp'),
(81, 'Aperol Spritz', 11, 'Preparación artesanal de Aperol Spritz', 34000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":36,"insumo_nombre":"Campari Base","cantidad":60,"unidad":"Mililitros"},{"producto_catalogo_id":38,"insumo_nombre":"Prosecco Botella","cantidad":90,"unidad":"Mililitros"},{"producto_catalogo_id":29,"insumo_nombre":"Soda Lata 300ml","cantidad":30,"unidad":"Mililitros"},{"producto_catalogo_id":31,"insumo_nombre":"Naranja Unidad","cantidad":1,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_81.webp'),
(82, 'Paloma', 11, 'Preparación artesanal de Paloma', 23000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":16,"insumo_nombre":"Tequila Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":33,"insumo_nombre":"Jugo de Naranja","cantidad":90,"unidad":"Mililitros"},{"producto_catalogo_id":29,"insumo_nombre":"Soda Lata 300ml","cantidad":60,"unidad":"Mililitros"},{"producto_catalogo_id":19,"insumo_nombre":"Sal x kg","cantidad":1,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_82.webp'),
(83, 'Cuba Libre', 11, 'Preparación artesanal de Cuba Libre', 20000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":20,"insumo_nombre":"Ron Blanco Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":39,"insumo_nombre":"Cola Lata 300ml","cantidad":120,"unidad":"Mililitros"},{"producto_catalogo_id":18,"insumo_nombre":"Jugo de Limon","cantidad":10,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_83.webp'),
(84, 'Caipirinha', 11, 'Preparación artesanal de Caipirinha', 22000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":40,"insumo_nombre":"Cachaca Base","cantidad":60,"unidad":"Mililitros"},{"producto_catalogo_id":27,"insumo_nombre":"Lima Unidad","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":28,"insumo_nombre":"Azucar x kg","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":25,"insumo_nombre":"Hielo Bolsas","cantidad":4,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_84.webp'),
(85, 'Bloody Mary', 11, 'Preparación artesanal de Bloody Mary', 25000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":41,"insumo_nombre":"Vodka Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":42,"insumo_nombre":"Jugo de Tomate","cantidad":120,"unidad":"Mililitros"},{"producto_catalogo_id":43,"insumo_nombre":"Especias Varias","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":44,"insumo_nombre":"Apio Unidad","cantidad":1,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_85.webp'),
(86, 'Sangría', 11, 'Preparación artesanal de Sangría', 26000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":45,"insumo_nombre":"Vino Tinto Base","cantidad":120,"unidad":"Mililitros"},{"producto_catalogo_id":46,"insumo_nombre":"Frutas Varias","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":47,"insumo_nombre":"Brandy Base","cantidad":15,"unidad":"Mililitros"},{"producto_catalogo_id":29,"insumo_nombre":"Soda Lata 300ml","cantidad":60,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_86.webp'),
(87, 'Gin Tonic', 11, 'Preparación artesanal de Gin Tonic', 27000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":35,"insumo_nombre":"Ginebra Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":48,"insumo_nombre":"Agua Tonica Lata","cantidad":120,"unidad":"Mililitros"},{"producto_catalogo_id":49,"insumo_nombre":"Enebro Bayas","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":27,"insumo_nombre":"Lima Unidad","cantidad":1,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_87.webp'),
(88, 'Chilcano de Pisco', 11, 'Preparación artesanal de Chilcano de Pisco', 28000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":50,"insumo_nombre":"Pisco Base","cantidad":60,"unidad":"Mililitros"},{"producto_catalogo_id":18,"insumo_nombre":"Jugo de Limon","cantidad":15,"unidad":"Mililitros"},{"producto_catalogo_id":51,"insumo_nombre":"Ginger Ale Lata","cantidad":120,"unidad":"Mililitros"},{"producto_catalogo_id":30,"insumo_nombre":"Amargo de Angostura","cantidad":1,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_88.webp'),
(89, 'Michelada', 11, 'Preparación artesanal de Michelada', 15000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":52,"insumo_nombre":"Cerveza Base","cantidad":330,"unidad":"Mililitros"},{"producto_catalogo_id":18,"insumo_nombre":"Jugo de Limon","cantidad":30,"unidad":"Mililitros"},{"producto_catalogo_id":53,"insumo_nombre":"Salsa Picante","cantidad":5,"unidad":"Mililitros"},{"producto_catalogo_id":19,"insumo_nombre":"Sal x kg","cantidad":1,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_89.webp'),
(90, 'Carajillo', 11, 'Preparación artesanal de Carajillo', 28000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":54,"insumo_nombre":"Licor 43 Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":55,"insumo_nombre":"Cafe Expreso","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":25,"insumo_nombre":"Hielo Bolsas","cantidad":3,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_90.webp'),
(91, 'Agua Fresca de Jamaica', 11, 'Preparación artesanal de Agua Fresca de Jamaica', 10000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":56,"insumo_nombre":"Flor de Jamaica","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":28,"insumo_nombre":"Azucar x kg","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":57,"insumo_nombre":"Agua Purificada","cantidad":200,"unidad":"Mililitros"},{"producto_catalogo_id":25,"insumo_nombre":"Hielo Bolsas","cantidad":4,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_91.webp'),
(92, 'Limoncello Macerado', 11, 'Preparación artesanal de Limoncello Macerado', 22000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":57,"insumo_nombre":"Agua Purificada","cantidad":500,"unidad":"Mililitros"},{"producto_catalogo_id":70,"insumo_nombre":"Limon Unidad","cantidad":5,"unidad":"Unidades"},{"producto_catalogo_id":28,"insumo_nombre":"Azucar x kg","cantidad":2,"unidad":"Unidades"},{"producto_catalogo_id":71,"insumo_nombre":"Esencia de Vainilla","cantidad":5,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_92.webp'),
(93, 'Crema Irlandesa Casera', 11, 'Preparación artesanal de Crema Irlandesa Casera', 28000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":24,"insumo_nombre":"Whisky Base","cantidad":150,"unidad":"Mililitros"},{"producto_catalogo_id":23,"insumo_nombre":"Leche Condensada","cantidad":150,"unidad":"Mililitros"},{"producto_catalogo_id":59,"insumo_nombre":"Crema de Leche","cantidad":150,"unidad":"Mililitros"},{"producto_catalogo_id":71,"insumo_nombre":"Esencia de Vainilla","cantidad":5,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_93.webp'),
(94, 'Cosmopolitan', 11, 'Preparación artesanal de Cosmopolitan', 26000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":41,"insumo_nombre":"Vodka Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":17,"insumo_nombre":"Triple Sec Base","cantidad":15,"unidad":"Mililitros"},{"producto_catalogo_id":61,"insumo_nombre":"Jugo de Arandano","cantidad":30,"unidad":"Mililitros"},{"producto_catalogo_id":18,"insumo_nombre":"Jugo de Limon","cantidad":15,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_94.webp'),
(95, 'Manhattan', 11, 'Preparación artesanal de Manhattan', 32000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":24,"insumo_nombre":"Whisky Base","cantidad":60,"unidad":"Mililitros"},{"producto_catalogo_id":37,"insumo_nombre":"Vermut Rojo Base","cantidad":30,"unidad":"Mililitros"},{"producto_catalogo_id":30,"insumo_nombre":"Amargo de Angostura","cantidad":2,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_95.webp'),
(96, 'Martini Seco', 11, 'Preparación artesanal de Martini Seco', 27000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":35,"insumo_nombre":"Ginebra Base","cantidad":60,"unidad":"Mililitros"},{"producto_catalogo_id":37,"insumo_nombre":"Vermut Rojo Base","cantidad":10,"unidad":"Mililitros"},{"producto_catalogo_id":43,"insumo_nombre":"Especias Varias","cantidad":1,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_96.webp'),
(97, 'Moscow Mule', 11, 'Preparación artesanal de Moscow Mule', 29000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":41,"insumo_nombre":"Vodka Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":67,"insumo_nombre":"Cerveza de Jengibre","cantidad":120,"unidad":"Mililitros"},{"producto_catalogo_id":18,"insumo_nombre":"Jugo de Limon","cantidad":15,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_97.webp'),
(98, 'Tom Collins', 11, 'Preparación artesanal de Tom Collins', 24000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":35,"insumo_nombre":"Ginebra Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":18,"insumo_nombre":"Jugo de Limon","cantidad":30,"unidad":"Mililitros"},{"producto_catalogo_id":60,"insumo_nombre":"Almibar Simple","cantidad":15,"unidad":"Mililitros"},{"producto_catalogo_id":29,"insumo_nombre":"Soda Lata 300ml","cantidad":60,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_98.webp'),
(99, 'Sex on the Beach', 11, 'Preparación artesanal de Sex on the Beach', 28000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":41,"insumo_nombre":"Vodka Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":62,"insumo_nombre":"Licor de Durazno","cantidad":30,"unidad":"Mililitros"},{"producto_catalogo_id":33,"insumo_nombre":"Jugo de Naranja","cantidad":60,"unidad":"Mililitros"},{"producto_catalogo_id":61,"insumo_nombre":"Jugo de Arandano","cantidad":60,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_99.webp'),
(100, 'Bellini', 11, 'Preparación artesanal de Bellini', 28000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":38,"insumo_nombre":"Prosecco Botella","cantidad":100,"unidad":"Mililitros"},{"producto_catalogo_id":63,"insumo_nombre":"Pure de Durazno","cantidad":50,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_100.webp'),
(101, 'Tequila Sour', 11, 'Preparación artesanal de Tequila Sour', 25000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":16,"insumo_nombre":"Tequila Base","cantidad":50,"unidad":"Mililitros"},{"producto_catalogo_id":18,"insumo_nombre":"Jugo de Limon","cantidad":25,"unidad":"Mililitros"},{"producto_catalogo_id":60,"insumo_nombre":"Almibar Simple","cantidad":15,"unidad":"Mililitros"},{"producto_catalogo_id":58,"insumo_nombre":"Clara de Huevo","cantidad":1,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_101.webp'),
(102, 'Pisco Sour', 11, 'Preparación artesanal de Pisco Sour', 29000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":50,"insumo_nombre":"Pisco Base","cantidad":50,"unidad":"Mililitros"},{"producto_catalogo_id":18,"insumo_nombre":"Jugo de Limon","cantidad":25,"unidad":"Mililitros"},{"producto_catalogo_id":60,"insumo_nombre":"Almibar Simple","cantidad":15,"unidad":"Mililitros"},{"producto_catalogo_id":58,"insumo_nombre":"Clara de Huevo","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":30,"insumo_nombre":"Amargo de Angostura","cantidad":1,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_102.webp'),
(103, 'White Russian', 11, 'Preparación artesanal de White Russian', 27000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":41,"insumo_nombre":"Vodka Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":54,"insumo_nombre":"Licor 43 Base","cantidad":30,"unidad":"Mililitros"},{"producto_catalogo_id":59,"insumo_nombre":"Crema de Leche","cantidad":30,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_103.webp'),
(104, 'Black Russian', 11, 'Preparación artesanal de Black Russian', 25000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":41,"insumo_nombre":"Vodka Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":54,"insumo_nombre":"Licor 43 Base","cantidad":30,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_104.webp'),
(105, 'Daiquiri Clásico', 11, 'Preparación artesanal de Daiquiri Clásico', 22000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":20,"insumo_nombre":"Ron Blanco Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":18,"insumo_nombre":"Jugo de Limon","cantidad":25,"unidad":"Mililitros"},{"producto_catalogo_id":60,"insumo_nombre":"Almibar Simple","cantidad":15,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_105.webp'),
(106, 'Mint Julep', 11, 'Preparación artesanal de Mint Julep', 26000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":24,"insumo_nombre":"Whisky Base","cantidad":60,"unidad":"Mililitros"},{"producto_catalogo_id":64,"insumo_nombre":"Menta Fresca","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":28,"insumo_nombre":"Azucar x kg","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":57,"insumo_nombre":"Agua Purificada","cantidad":10,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_106.webp'),
(107, 'Clover Club', 11, 'Preparación artesanal de Clover Club', 28000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":35,"insumo_nombre":"Ginebra Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":65,"insumo_nombre":"Jarabe de Frambuesa","cantidad":15,"unidad":"Mililitros"},{"producto_catalogo_id":18,"insumo_nombre":"Jugo de Limon","cantidad":15,"unidad":"Mililitros"},{"producto_catalogo_id":58,"insumo_nombre":"Clara de Huevo","cantidad":1,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_107.webp'),
(108, 'Dark and Stormy', 11, 'Preparación artesanal de Dark and Stormy', 26000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":66,"insumo_nombre":"Ron Oscuro Base","cantidad":60,"unidad":"Mililitros"},{"producto_catalogo_id":67,"insumo_nombre":"Cerveza de Jengibre","cantidad":120,"unidad":"Mililitros"},{"producto_catalogo_id":27,"insumo_nombre":"Lima Unidad","cantidad":1,"unidad":"Unidades"}]}'::jsonb, '/uploads/productos/seed_108.webp'),
(109, 'Irish Coffee', 11, 'Preparación artesanal de Irish Coffee', 29000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":24,"insumo_nombre":"Whisky Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":55,"insumo_nombre":"Cafe Expreso","cantidad":120,"unidad":"Mililitros"},{"producto_catalogo_id":28,"insumo_nombre":"Azucar x kg","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":59,"insumo_nombre":"Crema de Leche","cantidad":30,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_109.webp'),
(110, 'Mimosa', 11, 'Preparación artesanal de Mimosa', 22000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":38,"insumo_nombre":"Prosecco Botella","cantidad":75,"unidad":"Mililitros"},{"producto_catalogo_id":33,"insumo_nombre":"Jugo de Naranja","cantidad":75,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_110.webp'),
(111, 'Sangría Blanca', 11, 'Preparación artesanal de Sangría Blanca', 26000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":38,"insumo_nombre":"Prosecco Botella","cantidad":120,"unidad":"Mililitros"},{"producto_catalogo_id":46,"insumo_nombre":"Frutas Varias","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":17,"insumo_nombre":"Triple Sec Base","cantidad":15,"unidad":"Mililitros"},{"producto_catalogo_id":29,"insumo_nombre":"Soda Lata 300ml","cantidad":60,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_111.webp'),
(112, 'Canelazo', 11, 'Preparación artesanal de Canelazo', 18000.00, 0, 0, 'Activo', 'preparacion', NULL, NULL, '{"insumos":[{"producto_catalogo_id":20,"insumo_nombre":"Ron Blanco Base","cantidad":45,"unidad":"Mililitros"},{"producto_catalogo_id":68,"insumo_nombre":"Canela Astillas","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":69,"insumo_nombre":"Panela Bloque","cantidad":1,"unidad":"Unidades"},{"producto_catalogo_id":18,"insumo_nombre":"Jugo de Limon","cantidad":15,"unidad":"Mililitros"}]}'::jsonb, '/uploads/productos/seed_112.webp');



-- Actualizar secuencia de productos
SELECT setval('productos_id_seq', (SELECT MAX(id) FROM productos));

UPDATE categorias c
SET cantidad_productos = (
    SELECT COUNT(*)
    FROM productos p
    WHERE p.categoria_id = c.id
);

-- Insertar proveedores (12)
INSERT INTO proveedores (tipo_persona, nombre_empresa, nit, nombre, apellido, tipo_documento, numero_documento, email, telefono, direccion, estado, preferente, rating, observaciones) VALUES
('Juridica', 'Distribuidora Andina SAS', '900800123401', 'Laura', 'Suarez', NULL, NULL, 'contacto@andina.com', '6015551101', 'Bogota, Centro logistico 12', 'Activo', TRUE, 4.80, 'Proveedor principal de destilados'),
('Juridica', 'Casa del Ron SAS', '900800123402', 'Andres', 'Nieto', NULL, NULL, 'ventas@casadelron.com', '6015551102', 'Barranquilla, Via 40 bodega 8', 'Activo', TRUE, 4.70, 'Especialista en rones importados'),
('Juridica', 'Importadora Premium Ltda', '900800123403', 'Paola', 'Mendez', NULL, NULL, 'info@premiumltda.com', '6015551103', 'Bogota, Zona Franca modulo 5', 'Activo', FALSE, 4.50, 'Portafolio premium de whiskies y ginebras'),
('Juridica', 'Bebidas del Valle SAS', '900800123404', 'Felipe', 'Guerra', NULL, NULL, 'comercial@bebidasdelvalle.com', '6025551104', 'Cali, Parque industrial Yumbo', 'Activo', FALSE, 4.40, 'Licores nacionales y cocteleria'),
('Juridica', 'Vidrios y Envases SAS', '900800123405', 'Monica', 'Ortiz', NULL, NULL, 'servicio@vidriosenvases.com', '6045551105', 'Medellin, Autopista sur km 4', 'Activo', TRUE, 4.90, 'Envases y tapas para produccion'),
('Juridica', 'Sabores y Esencias SAS', '900800123406', 'Karen', 'Pardo', NULL, NULL, 'pedidos@saboresyesencias.com', '6015551106', 'Bogota, Fontibon bodega 14', 'Activo', FALSE, 4.60, 'Esencias y aditivos alimentarios'),
('Natural', NULL, NULL, 'Carlos', 'Martinez', 'CC', '100012349001', 'carlos.martinez@proveedores.com', '3105551107', 'Medellin, barrio Laureles', 'Activo', FALSE, 4.20, 'Proveedor independiente de frutas'),
('Natural', NULL, NULL, 'Marta', 'Rojas', 'CC', '100012349002', 'marta.rojas@proveedores.com', '3115551108', 'Bogota, barrio Kennedy', 'Activo', FALSE, 4.30, 'Suministro de insumos secos'),
('Natural', NULL, NULL, 'Jorge', 'Bernal', 'CC', '100012349003', 'jorge.bernal@proveedores.com', '3125551109', 'Cali, barrio San Fernando', 'Activo', FALSE, 4.10, 'Proveedor ocasional de botellas'),
('Natural', NULL, NULL, 'Liliana', 'Acosta', 'CC', '100012349004', 'liliana.acosta@proveedores.com', '3135551110', 'Pereira, sector industrial', 'Activo', FALSE, 4.00, 'Suministro regional de empaques'),
('Natural', NULL, NULL, 'Oscar', 'Forero', 'CC', '100012349005', 'oscar.forero@proveedores.com', '3145551111', 'Bucaramanga, centro empresarial', 'Activo', FALSE, 4.35, 'Proveedor de insumos de cocteleria'),
('Natural', NULL, NULL, 'Diana', 'Moreno', 'CC', '100012349006', 'diana.moreno@proveedores.com', '3155551112', 'Manizales, avenida Santander', 'Activo', FALSE, 4.25, 'Proveedor de pulpas y frutas congeladas');

-- Insertar clientes (10)
INSERT INTO clientes (usuario_id, nombre, apellido, tipo_documento, documento, email, telefono, direccion, estado) VALUES
(NULL, 'Sofia', 'Ramirez', 'CC', '100045670001', 'sofia.ramirez@clientes.com', '3205552001', 'Medellin, Calle 10 25 41', 'Activo'),
(NULL, 'Juan', 'Herrera', 'CC', '100045670002', 'juan.herrera@clientes.com', '3205552002', 'Bogota, Carrera 15 99 21', 'Activo'),
(NULL, 'Valeria', 'Quintero', 'CC', '100045670003', 'valeria.quintero@clientes.com', '3205552003', 'Cali, Avenida 3 norte 45 18', 'Activo'),
(NULL, 'Sebastian', 'Ospina', 'CC', '100045670004', 'sebastian.ospina@clientes.com', '3205552004', 'Pereira, Calle 22 14 09', 'Activo'),
(NULL, 'Camila', 'Restrepo', 'CC', '100045670005', 'camila.restrepo@clientes.com', '3205552005', 'Envigado, Transversal 34 28 55', 'Activo'),
(NULL, 'Andres', 'Luna', 'CC', '100045670006', 'andres.luna@clientes.com', '3205552006', 'Barranquilla, Calle 84 51 10', 'Activo'),
(NULL, 'Mariana', 'Salazar', 'CC', '100045670007', 'mariana.salazar@clientes.com', '3205552007', 'Bucaramanga, Carrera 33 52 18', 'Activo'),
(NULL, 'Felipe', 'Cano', 'CC', '100045670008', 'felipe.cano@clientes.com', '3205552008', 'Manizales, Avenida Paralela 61 44', 'Activo'),
(NULL, 'Daniela', 'Rincon', 'CC', '100045670009', 'daniela.rincon@clientes.com', '3205552009', 'Bogota, Calle 134 19 77', 'Activo'),
(NULL, 'Tomas', 'Arango', 'CC', '100045670010', 'tomas.arango@clientes.com', '3205552010', 'Medellin, Circular 5 70 12', 'Activo');

-- La tabla insumos permanece vacía en el seed porque el modulo de inventario
-- de insumos trabaja principalmente sobre productos de tipo "insumo".

-- ============================================================
-- PARTE 4: FUNCIONES Y TRIGGERS (Sin cambios)
-- ============================================================

CREATE OR REPLACE FUNCTION sync_cliente_from_usuario()
RETURNS TRIGGER AS $$
DECLARE
    cliente_role_id INTEGER;
BEGIN
    SELECT id INTO cliente_role_id FROM roles WHERE nombre = 'Cliente' LIMIT 1;
    IF cliente_role_id IS NULL THEN RETURN NEW; END IF;
    
    IF NEW.rol_id = cliente_role_id THEN
        INSERT INTO clientes (usuario_id, nombre, apellido, tipo_documento, documento, email, telefono, direccion, estado)
        VALUES (NEW.id, NEW.nombre, NEW.apellido, NEW.tipo_documento, NEW.documento, NEW.email, NEW.telefono, NEW.direccion, NEW.estado)
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_cliente_from_usuario
AFTER INSERT OR UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION sync_cliente_from_usuario();

COMMIT;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
-- Base de datos inicializada exitosamente.
--
-- CREDENCIALES DE PRUEBA (todas comparten la misma contrasena):
--   Contrasena: password_123
--
--   Usuarios internos sembrados:
--     Administrador: admin@grandmas.com
--     Asesores: asesor1@grandmas.com, asesor2@grandmas.com, asesor3@grandmas.com
--     Productores: productor1@grandmas.com, productor2@grandmas.com, productor3@grandmas.com
--     Repartidores: repartidor1@grandmas.com, repartidor2@grandmas.com, repartidor3@grandmas.com
--   Nota: los 10 registros de clientes se siembran en la tabla `clientes`
--   para pruebas funcionales de ventas, pedidos y domicilios.
--
-- Para regenerar las contrasenas con un valor distinto, edita la seccion
-- "Insertar usuarios de ejemplo" arriba y ejecuta:
--   node -e "console.log(require('bcryptjs').hashSync('TU_NUEVA_PASSWORD', 10))"
-- ============================================================
