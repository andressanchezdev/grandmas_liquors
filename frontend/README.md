# Frontend - Liqueur Sales Management App

Frontend React para la aplicación de Gestión de Ventas de Licores. Proporciona una interfaz web para gestionar:

- Categorías y Productos
- Clientes y Proveedores
- Pedidos, Ventas y Abonos
- Domicilios/Entregas
- Compras a Proveedores
- Insumos y Producción
- Dashboard y Reportes

---

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── app/
│   │   ├── components/     # Componentes React
│   │   ├── services/       # Servicios API
│   │   └── App.tsx         # Componente principal
├── public/                 # Archivos estáticos
├── .env                    # Variables de entorno (desarrollo)
├── .env.development        # Variables de entorno (desarrollo)
├── .env.production         # Variables de entorno (producción)
├── vite.config.ts          # Configuración de Vite
├── package.json            # Dependencias
└── README.md               # Este archivo
```

---

## Requisitos Previos

- **Node.js** (v18 o superior)
- **npm** o **yarn**

---

## Instalación

### 1. Instalar Dependencias

```bash
npm install
```

O si usas yarn:

```bash
yarn install
```

### 2. Configurar Variables de Entorno

#### Variables de Entorno - Desarrollo (.env)

```env
# API Configuration para Desarrollo
# Usa el proxy de Vite para desarrollo local
VITE_API_BASE_URL=http://localhost:3000
VITE_API_PROXY_TARGET=http://localhost:3002
```

#### Variables de Entorno - Producción (.env.production)

```env
# API Configuration para Producción
VITE_API_BASE_URL=http://aplicationgl-env-1.eba-jyti25ie.us-east-2.elasticbeanstalk.com
VITE_API_PROXY_TARGET=http://aplicationgl-env-1.eba-jyti25ie.us-east-2.elasticbeanstalk.com
```

#### Descripción de Variables

| Variable | Descripción | Valor |
|----------|-------------|-------|
| `VITE_API_BASE_URL` | URL base de la API para producción | URL de Elastic Beanstalk |
| `VITE_API_PROXY_TARGET` | URL del proxy para desarrollo | `http://localhost:3002` en desarrollo |

---

## Ejecutar el Servidor

### Desarrollo

```bash
npm run dev
```

El servidor se iniciará en `http://localhost:3000`

### Producción

#### Build para Producción

```bash
npm run build
```

Esto generará los archivos optimizados en el directorio `dist/`.

#### Preview del Build

```bash
npm run preview
```

---

## Tecnologías Utilizadas

- **React 18** - Framework UI
- **Vite** - Build tool y dev server
- **React Router** - Enrutamiento
- **Radix UI** - Componentes UI accesibles
- **Tailwind CSS** - Estilos
- **Recharts** - Gráficos y visualizaciones
- **React Hook Form** - Formularios
- **DOMPurify** - Sanitización XSS

---

## Optimizaciones Implementadas

- **Lazy Loading**: Las páginas se cargan bajo demanda usando `React.lazy()`
- **Code Splitting**: El bundle se divide en chunks para reducir el tamaño inicial
- **Suspense**: Componentes de carga mientras se cargan los chunks
- **Tree Shaking**: Código no utilizado eliminado en el build

---

## Despliegue

### AWS S3 + CloudFront

1. Build del proyecto:
```bash
npm run build
```

2. Subir el contenido de `dist/` a S3

3. Configurar CloudFront para distribuir el contenido

### Vercel/Netlify

1. Conectar repositorio a Vercel/Netlify

2. Configurar variables de entorno en la plataforma

3. Deploy automático

---

## Notas Importantes

- Las variables de entorno deben comenzar con `VITE_` para ser accesibles en el frontend
- En desarrollo, Vite usa un proxy para redirigir las requests de API al backend
- En producción, las requests de API van directamente a la URL configurada en `VITE_API_BASE_URL`
