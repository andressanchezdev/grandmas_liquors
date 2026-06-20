# Guía de Migración a Railway

Esta guía explica paso a paso cómo migrar el proyecto Grandmas Liquors a Railway, una plataforma PaaS sencilla ideal para principiantes.

## Requisitos Previos

- Cuenta en GitHub (el proyecto debe estar en un repositorio)
- Cuenta en Railway (https://railway.app)
- Datos de la base de datos actual (local)

---

## PASO 1: Crear Cuenta en Railway y Configurar Proyecto

### 1.1 Crear Cuenta en Railway

1. Ir a https://railway.app
2. Click en **Start a new project** o **Sign up**
3. Registrarse con GitHub (recomendado) o con email
4. Verificar el email si te lo solicitan

### 1.2 Crear Nuevo Proyecto

1. Después de iniciar sesión, click en **New Project**
2. Click en **Deploy from GitHub repo**
3. Autorizar Railway a acceder a tus repositorios de GitHub
4. Buscar y seleccionar el repositorio `grandmas_liquors`
5. Click en **Add Project**

---

## PASO 2: Crear Base de Datos PostgreSQL en Railway

### 2.1 Crear Instancia PostgreSQL

1. En el proyecto Railway, click en **+ New Service**
2. Seleccionar **Database**
3. Seleccionar **PostgreSQL**
4. Railway creará automáticamente una instancia PostgreSQL
5. Espera a que la base de datos esté lista (estado "Running")

### 2.2 Obtener Credenciales de la Base de Datos

1. Click en el servicio PostgreSQL creado
2. Click en la pestaña **Variables**
3. Copia las siguientes variables de entorno:
   - `PGHOST` (host de la base de datos)
   - `PGPORT` (puerto, usualmente 5432)
   - `PGUSER` (usuario de la base de datos)
   - `PGPASSWORD` (contraseña)
   - `PGDATABASE` (nombre de la base de datos)
   - `DATABASE_URL` (URL de conexión completa)

**Nota:** Guarda estas credenciales en un lugar seguro.

---

## PASO 3: Migrar Datos de la Base de Datos Actual

### 3.1 Exportar Datos de la Base de Datos Actual

**Si usas la base de datos RDS actual:**

1. Instalar pg_dump si no lo tienes:
   ```bash
   # Windows (usando Chocolatey)
   choco install postgresql
   
   # O descargar desde: https://www.postgresql.org/download/windows/
   ```

2. Exportar la base de datos:
   ```bash
   pg_dump -h database-1.cxsioou6me7v.us-east-2.rds.amazonaws.com -U postgres -d grandmasliquorsdb > backup.sql
   ```
   - Te pedirá la contraseña: `password_123`

**Si usas una base de datos local:**

```bash
pg_dump -h localhost -U postgres -d grandmasliquorsdb > backup.sql
```

### 3.2 Importar Datos a Railway

**Opción A: Usando Railway CLI (recomendado)**

1. Instalar Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Autenticarse:
   ```bash
   railway login
   ```

3. Conectarse al proyecto:
   ```bash
   railway link
   ```

4. Importar los datos:
   ```bash
   cat backup.sql | railway psql
   ```

**Opción B: Usando pg_restore directamente**

1. Obtener la DATABASE_URL desde Railway (Variables tab)
2. Importar los datos:
   ```bash
   psql $DATABASE_URL < backup.sql
   ```

**Opción C: Usando el panel de Railway**

1. Click en el servicio PostgreSQL
2. Click en la pestaña **Connect**
3. Click en **Open Console**
4. Copiar y pegar el contenido de `backup.sql` en la consola
5. Ejecutar el SQL

---

## PASO 4: Configurar Backend para Railway

### 4.1 Crear Archivo railway.json en Backend

Crear archivo `backend/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  }
}
```

### 4.2 Modificar backend/db.js para Railway

El archivo `backend/db.js` ya está configurado correctamente para Railway con la modificación SSL que hicimos anteriormente:

```javascript
ssl: config.db.ssl ? { rejectUnauthorized: false } : false,
```

### 4.3 Actualizar backend/.env para Railway

Crear o actualizar `backend/.env`:

```bash
# Base de Datos Railway (usar las credenciales de Railway)
DB_HOST=${PGHOST}
DB_PORT=${PGPORT}
DB_USER=${PGUSER}
DB_PASSWORD=${PGPASSWORD}
DB_DATABASE=${PGDATABASE}
DB_SSL=true

# Servidor
NODE_ENV=production
PORT=3002
PUBLIC_BASE_URL=https://tu-backend-url.railway.app

# CORS (actualizar con la URL del frontend desplegado)
CORS_CLOUDFRONT_URL=
CORS_CUSTOM_DOMAIN=
CORS_ORIGINS=https://tu-frontend-url.railway.app

# Uploads
UPLOADS_ROOT=/app/uploads

# Authentication
JWT_SECRET=grandmas_liquors_railway_jwt_secret_min_32_chars
JWT_ISSUER=grandmas-liquors-api
JWT_AUDIENCE=grandmas-liquors-web
AUTH_COOKIE_NAME=gl_session
AUTH_COOKIE_SAME_SITE=lax
AUTH_COOKIE_DOMAIN=
JWT_CLIENTE_TTL_MS=3600000
JWT_STAFF_TTL_MS=10800000
JWT_LONG_SESSION_TTL_MS=604800000
SESSION_IDLE_TIMEOUT_MS=1800000

# Rate Limiting
RATE_LIMIT_ENABLED=true

# Email
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=grandmasliqueurs@gmail.com
MAIL_PASSWORD=yrydvfjtwfdnjnyg
MAIL_FROM="Grandma's Liquors <grandmasliqueurs@gmail.com>"

# System Admin
SYSTEM_ADMIN_EMAIL=grandmasliqueurs@gmail.com
```

### 4.4 Agregar Script de Health Check en Backend

Agregar endpoint de health check en `backend/index.js` (si no existe):

```javascript
// Health check endpoint para Railway
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

---

## PASO 5: Desplegar Backend en Railway

### 5.1 Crear Servicio Backend en Railway

1. En el proyecto Railway, click en **+ New Service**
2. Click en **Deploy from GitHub repo**
3. Seleccionar el repositorio `grandmas_liquors`
4. Click en **Add Service**
5. Click en el servicio creado
6. Click en **Settings**
7. En **Root Directory**, escribir: `backend`
8. Click en **Save**

### 5.2 Configurar Variables de Entorno del Backend

1. Click en la pestaña **Variables**
2. Click en **New Variable** para agregar cada variable

#### Variables de Base de Datos (OBTENER DESDE SERVICIO POSTGRESQL)

**DB_HOST**
- **Valor:** Copiar desde servicio PostgreSQL → Variables → `PGHOST`
- **Descripción:** Host de la base de datos PostgreSQL en Railway
- **Uso en código:** `backend/config.js` (línea 47), `backend/db.js` (línea 9)
- **Ejemplo:** `containers.railway.app` o dirección IP

**DB_PORT**
- **Valor:** Copiar desde servicio PostgreSQL → Variables → `PGPORT`
- **Descripción:** Puerto de conexión a PostgreSQL
- **Uso en código:** `backend/config.js` (línea 57)
- **Ejemplo:** `5432`

**DB_USER**
- **Valor:** Copiar desde servicio PostgreSQL → Variables → `PGUSER`
- **Descripción:** Usuario de la base de datos
- **Uso en código:** `backend/config.js` (línea 58)
- **Ejemplo:** `postgres`

**DB_PASSWORD**
- **Valor:** Copiar desde servicio PostgreSQL → Variables → `PGPASSWORD`
- **Descripción:** Contraseña de la base de datos
- **Uso en código:** `backend/config.js` (línea 59)
- **Ejemplo:** (contraseña generada por Railway)

**DB_DATABASE**
- **Valor:** Copiar desde servicio PostgreSQL → Variables → `PGDATABASE`
- **Descripción:** Nombre de la base de datos
- **Uso en código:** `backend/config.js` (línea 60)
- **Ejemplo:** `railway` o nombre personalizado

**DB_SSL**
- **Valor:** `true`
- **Descripción:** Habilita conexión SSL segura a PostgreSQL
- **Uso en código:** `backend/config.js` (línea 61), `backend/db.js` (línea 14)
- **Nota:** Necesario para Railway PostgreSQL

#### Variables de Servidor

**NODE_ENV**
- **Valor:** `production`
- **Descripción:** Entorno de ejecución
- **Uso en código:** `backend/config.js` (línea 15, 65)
- **Nota:** Activa configuraciones de producción

**PORT**
- **Valor:** `3002`
- **Descripción:** Puerto donde corre el servidor
- **Uso en código:** `backend/config.js` (línea 64), `backend/index.js` (línea 300)
- **Nota:** Railway puede sobrescribir esto, pero es buena práctica definirlo

**PUBLIC_BASE_URL**
- **Valor:** URL del backend desplegado (obtener después del despliegue)
- **Descripción:** URL pública del backend
- **Uso en código:** `backend/config.js` (línea 66)
- **Ejemplo:** `https://grandmas-liquors-backend-production.up.railway.app`
- **Nota:** Actualizar después del primer despliegue

#### Variables de CORS

**CORS_CLOUDFRONT_URL**
- **Valor:** (vacío si no usas CloudFront)
- **Descripción:** URL de CloudFront si usas CDN
- **Uso en código:** `backend/config.js` (líneas 23-24)
- **Nota:** Opcional, dejar vacío si no usas CloudFront

**CORS_CUSTOM_DOMAIN**
- **Valor:** (vacío si no tienes dominio personalizado)
- **Descripción:** Dominio personalizado del frontend
- **Uso en código:** `backend/config.js` (líneas 24-25)
- **Nota:** Opcional, dejar vacío si no tienes dominio personalizado

**CORS_ORIGINS**
- **Valor:** URL del frontend desplegado (obtener después del despliegue)
- **Descripción:** Orígenes permitidos para CORS
- **Uso en código:** `backend/config.js` (líneas 32, 87)
- **Ejemplo:** `https://grandmas-liquors-frontend-production.up.railway.app`
- **Nota:** Actualizar después de desplegar el frontend

#### Variables de Uploads

**UPLOADS_ROOT**
- **Valor:** `/app/uploads`
- **Descripción:** Directorio raíz para archivos subidos
- **Uso en código:** `backend/config.js` (líneas 50-52, 68-72)
- **Nota:** Railway usa `/app` como directorio de aplicación

#### Variables de Autenticación

**JWT_SECRET**
- **Valor:** Generar un secreto seguro (mínimo 32 caracteres)
- **Descripción:** Secreto para firmar tokens JWT
- **Uso en código:** `backend/config.js` (línea 75), `backend/src/middleware/auth.js`
- **Cómo generar:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **Ejemplo:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`
- **Nota:** MUY IMPORTANTE - Mantener este secreto seguro y no compartirlo

**JWT_ISSUER**
- **Valor:** `grandmas-liquors-api`
- **Descripción:** Emisor de los tokens JWT
- **Uso en código:** `backend/config.js` (línea 76), `backend/src/middleware/auth.js`
- **Nota:** Identifica quién emitió el token

**JWT_AUDIENCE**
- **Valor:** `grandmas-liquors-web`
- **Descripción:** Audiencia de los tokens JWT
- **Uso en código:** `backend/config.js` (línea 77), `backend/src/middleware/auth.js`
- **Nota:** Identifica para quién es el token

**AUTH_COOKIE_NAME**
- **Valor:** `gl_session`
- **Descripción:** Nombre de la cookie de sesión
- **Uso en código:** `backend/config.js` (línea 78), `backend/src/middleware/auth.js`
- **Nota:** Nombre de la cookie en el navegador

**AUTH_COOKIE_SAME_SITE**
- **Valor:** `lax`
- **Descripción:** Política SameSite para cookies
- **Uso en código:** `backend/config.js` (línea 80), `backend/src/middleware/auth.js`
- **Opciones:** `strict`, `lax`, `none`
- **Nota:** `lax` permite cookies en navegaciones de primer nivel

**AUTH_COOKIE_DOMAIN**
- **Valor:** (vacío)
- **Descripción:** Dominio de la cookie
- **Uso en código:** `backend/config.js` (línea 79), `backend/src/middleware/auth.js`
- **Nota:** Dejar vacío para usar el dominio actual

**JWT_CLIENTE_TTL_MS**
- **Valor:** `3600000`
- **Descripción:** Tiempo de vida del token para clientes (en milisegundos)
- **Uso en código:** `backend/config.js` (línea 83), `backend/src/middleware/auth.js`
- **Cálculo:** 3600000 ms = 60 minutos = 1 hora
- **Nota:** Tiempo antes de que el token expire para clientes

**JWT_STAFF_TTL_MS**
- **Valor:** `10800000`
- **Descripción:** Tiempo de vida del token para staff (en milisegundos)
- **Uso en código:** `backend/config.js` (línea 84), `backend/src/middleware/auth.js`
- **Cálculo:** 10800000 ms = 180 minutos = 3 horas
- **Nota:** Tiempo antes de que el token expire para staff

**JWT_LONG_SESSION_TTL_MS**
- **Valor:** `604800000`
- **Descripción:** Tiempo de vida de sesión larga (en milisegundos)
- **Uso en código:** `backend/config.js` (línea 85), `backend/src/middleware/auth.js`
- **Cálculo:** 604800000 ms = 10080 minutos = 168 horas = 7 días
- **Nota:** Para sesiones recordadas ("remember me")

**SESSION_IDLE_TIMEOUT_MS**
- **Valor:** `1800000`
- **Descripción:** Tiempo de inactividad antes de cerrar sesión (en milisegundos)
- **Uso en código:** `backend/config.js` (línea 86), `backend/src/middleware/auth.js`
- **Cálculo:** 1800000 ms = 30 minutos
- **Nota:** Cierra sesión si no hay actividad por 30 minutos

#### Variables de Rate Limiting

**RATE_LIMIT_ENABLED**
- **Valor:** `true`
- **Descripción:** Habilita limitación de tasa de solicitudes
- **Uso en código:** `backend/index.js` (líneas de rate limiting)
- **Nota:** Protege contra ataques de fuerza bruta

#### Variables de Email

**MAIL_HOST**
- **Valor:** `smtp.gmail.com`
- **Descripción:** Host del servidor SMTP
- **Uso en código:** `backend/config.js` (línea 90), `backend/src/services/email.service.js`
- **Ejemplo:** `smtp.gmail.com` para Gmail

**MAIL_PORT**
- **Valor:** `587`
- **Descripción:** Puerto del servidor SMTP
- **Uso en código:** `backend/config.js` (línea 91), `backend/src/services/email.service.js`
- **Nota:** 587 para TLS, 465 para SSL

**MAIL_SECURE**
- **Valor:** `false`
- **Descripción:** Si la conexión es segura (SSL/TLS)
- **Uso en código:** `backend/config.js` (línea 92), `backend/src/services/email.service.js`
- **Nota:** `false` para STARTTLS (puerto 587), `true` para SSL (puerto 465)

**MAIL_USER**
- **Valor:** `grandmasliqueurs@gmail.com`
- **Descripción:** Usuario del servidor SMTP
- **Uso en código:** `backend/config.js` (línea 93), `backend/src/services/email.service.js`
- **Nota:** Email completo para autenticación

**MAIL_PASSWORD**
- **Valor:** `yrydvfjtwfdnjnyg`
- **Descripción:** Contraseña del servidor SMTP
- **Uso en código:** `backend/config.js` (línea 94), `backend/src/services/email.service.js`
- **Nota:** Para Gmail, usar "Contraseña de aplicación" no la contraseña normal

**MAIL_FROM**
- **Valor:** `Grandma's Liquors <grandmasliqueurs@gmail.com>`
- **Descripción:** Remitente de los emails
- **Uso en código:** `backend/config.js` (líneas 95-105), `backend/src/services/email.service.js`
- **Nota:** Formato: `"Nombre <email>"` o solo email

#### Variables de Administrador del Sistema

**SYSTEM_ADMIN_EMAIL**
- **Valor:** `grandmasliqueurs@gmail.com`
- **Descripción:** Email del administrador del sistema
- **Uso en código:** `backend/index.js` (líneas 27-29, 43-44)
- **Nota:** Este usuario tiene auto-recuperación de bloqueos al inicio

### 5.3 Desplegar el Backend

1. Click en **Deploy** en la pestaña del servicio
2. Espera a que el despliegue termine (estado "Running")
3. Copia la URL del backend (ej: `https://tu-backend-url.railway.app`)

---

## PASO 6: Configurar Frontend para Railway

### 6.1 Crear Archivo railway.json en Frontend

Crear archivo `frontend/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build",
    "watchPatterns": ["src/**"]
  },
  "deploy": {
    "healthcheckPath": "/",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 6.2 Actualizar frontend/.env.production

Crear o actualizar `frontend/.env.production`:

```bash
VITE_API_BASE_URL=https://tu-backend-url.railway.app
VITE_API_PROXY_TARGET=https://tu-backend-url.railway.app
```

**Nota:** Reemplaza `tu-backend-url.railway.app` con la URL real del backend desplegado.

### 6.3 Modificar frontend/vite.config.ts para Producción

Asegurar que `vite.config.ts` esté configurado correctamente para producción:

```typescript
export default defineConfig({
  // ... configuración existente
  base: '/', // Base path para Railway
  server: {
    port: 3000,
    // ... configuración existente
  },
});
```

---

## PASO 7: Desplegar Frontend en Railway

### 7.1 Crear Servicio Frontend en Railway

1. En el proyecto Railway, click en **+ New Service**
2. Click en **Deploy from GitHub repo**
3. Seleccionar el repositorio `grandmas_liquors`
4. Click en **Add Service**
5. Click en el servicio creado
6. Click en **Settings**
7. En **Root Directory**, escribir: `frontend`
8. Click en **Save**

### 7.2 Configurar Variables de Entorno del Frontend

1. Click en la pestaña **Variables**
2. Click en **New Variable** para agregar cada variable

#### Variables de API del Frontend

**VITE_API_BASE_URL**
- **Valor:** URL del backend desplegado (obtener después del despliegue del backend)
- **Descripción:** URL base para todas las llamadas a la API del backend
- **Uso en código:** `frontend/src/app/services/api/index.ts`, `frontend/src/app/services/api/sales.api.ts`, etc.
- **Ejemplo:** `https://grandmas-liquors-backend-production.up.railway.app`
- **Nota:** Debe incluir el protocolo (https://) y NO debe tener slash al final
- **Importante:** Esta es la variable principal que usa el frontend para conectar con el backend

**VITE_API_PROXY_TARGET**
- **Valor:** URL del backend desplegado (igual que VITE_API_BASE_URL)
- **Descripción:** URL objetivo para el proxy de desarrollo (Vite)
- **Uso en código:** `frontend/vite.config.ts` (configuración de proxy)
- **Ejemplo:** `https://grandmas-liquors-backend-production.up.railway.app`
- **Nota:** En producción, Vite no usa proxy, pero se mantiene para consistencia
- **Importante:** Debe ser igual a VITE_API_BASE_URL

### 7.3 Desplegar el Frontend

1. Click en **Deploy** en la pestaña del servicio
2. Espera a que el despliegue termine (estado "Running")
3. Copia la URL del frontend (ej: `https://tu-frontend-url.railway.app`)

### 7.4 Actualizar CORS del Backend

1. Regresa al servicio backend en Railway
2. Click en **Variables**
3. Actualiza `CORS_ORIGINS` con la URL del frontend
4. Actualiza `PUBLIC_BASE_URL` con la URL del backend
5. Click en **Redeploy**

---

## PASO 8: Configurar Dominio Personal (Opcional)

### 8.1 Configurar Dominio para Frontend

1. Click en el servicio frontend
2. Click en **Settings**
3. Click en **Networking**
4. Click en **Generate Domain**
5. Ingresa tu dominio personal (ej: `grandmasliquors.com`)
6. Configura los DNS según las instrucciones de Railway

### 8.2 Configurar Dominio para Backend

Repetir el proceso para el servicio backend.

---

## PASO 9: Probar la Aplicación Completa

### 9.1 Probar Backend

1. Abre la URL del backend en el navegador
2. Deberías ver el endpoint de health check: `{"status":"ok","timestamp":"..."}`
3. Prueba algunos endpoints de la API:
   - `GET /api/health`
   - `GET /api/productos`

### 9.2 Probar Frontend

1. Abre la URL del frontend en el navegador
2. Intenta iniciar sesión
3. Verifica que la aplicación funcione correctamente
4. Prueba crear un pedido, ver productos, etc.

### 9.3 Verificar Logs

1. En Railway, click en cada servicio
2. Click en la pestaña **Logs**
3. Verifica que no haya errores
4. Si hay errores, revisa las variables de entorno y la configuración

---

## PASO 10: Configurar Storage para Archivos (Opcional)

Railway no tiene almacenamiento persistente por defecto. Para los archivos subidos (uploads), tienes dos opciones:

### Opción A: Usar Railway Volumes (para desarrollo)

1. Click en el servicio backend
2. Click en **Settings**
3. Click en **Volumes**
4. Click en **New Volume**
5. Nombre: `uploads`
6. Mount path: `/app/uploads`

### Opción B: Usar S3 u otro servicio (para producción)

1. Crear un bucket en AWS S3, Cloudflare R2, o Backblaze B2
2. Configurar las variables de entorno para el servicio de storage
3. Modificar el código de upload para usar el servicio externo

---

## Solución de Problemas Comunes

### Problema: Error de conexión a la base de datos

**Solución:**
- Verifica que las variables de entorno de la base de datos sean correctas
- Asegúrate de que `DB_SSL=true` esté configurado
- Verifica que la base de datos PostgreSQL esté en estado "Running"

### Problema: Error de CORS

**Solución:**
- Verifica que `CORS_ORIGINS` incluya la URL del frontend
- Asegúrate de que la URL del frontend esté correcta (sin slash al final)
- Redeploy el backend después de actualizar las variables

### Problema: Frontend no puede conectar al backend

**Solución:**
- Verifica que `VITE_API_BASE_URL` sea correcta en el frontend
- Asegúrate de que el backend esté corriendo
- Verifica los logs del backend para ver si hay errores

### Problema: Archivos subidos no persisten

**Solución:**
- Railway no tiene almacenamiento persistente por defecto
- Configura Railway Volumes o usa un servicio externo como S3

---

## Costos Estimados en Railway

- **PostgreSQL**: ~$5-10/mes (dependiendo del uso)
- **Backend**: ~$5-10/mes (dependiendo del uso)
- **Frontend**: ~$5-10/mes (dependiendo del tráfico)
- **Total estimado**: ~$15-30/mes

Railway tiene un plan gratuito de $5/mes que incluye:
- 500 horas de ejecución
- 1GB de RAM
- Almacenamiento limitado

---

## Ventajas de Railway vs AWS

**Railway:**
- Más sencillo para principiantes
- Configuración automática
- Menor curva de aprendizaje
- Ideal para proyectos pequeños/medianos
- Integración con GitHub
- Despliegue automático en cada push

**AWS:**
- Más escalable para proyectos grandes
- Más control sobre la infraestructura
- Más opciones de configuración
- Más económico a gran escala
- Curva de aprendizaje más pronunciada

---

## Próximos Pasos Después del Despliegue

1. **Monitoreo:** Configurar alertas en Railway para errores y rendimiento
2. **Backups:** Configurar backups automáticos de la base de datos
3. **Dominio:** Configurar dominio personalizado
4. **SSL:** Railway proporciona SSL automáticamente
5. **Logs:** Revisar regularmente los logs para detectar problemas
6. **Actualizaciones:** Railway hace deploy automático en cada push a GitHub

---

## Soporte y Documentación

- **Documentación de Railway:** https://docs.railway.app
- **Soporte de Railway:** https://railway.app/support
- **Comunidad:** https://discord.gg/railway

---

## Resumen del Proceso

1. ✅ Crear cuenta en Railway
2. ✅ Crear base de datos PostgreSQL
3. ✅ Migrar datos de la base de datos actual
4. ✅ Configurar backend para Railway
5. ✅ Desplegar backend en Railway
6. ✅ Configurar frontend para Railway
7. ✅ Desplegar frontend en Railway
8. ✅ Configurar variables de entorno
9. ✅ Probar la aplicación completa
10. ✅ Configurar dominio personal (opcional)

¡Felicidades! Tu aplicación Grandmas Liquors ahora está desplegada en Railway.
