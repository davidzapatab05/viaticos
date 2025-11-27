# Sistema de Gestión de Viáticos

Sistema web para la gestión de gastos de viáticos con captura de fotos y almacenamiento en OneDrive, desarrollado con Next.js 16 y Cloudflare Workers.

## 📋 Descripción

Aplicación web que permite a los usuarios registrar sus gastos de viáticos con evidencia fotográfica. Los administradores pueden gestionar usuarios y visualizar todos los registros. Las fotos se almacenan automáticamente en OneDrive organizadas por usuario y fecha.

## 🏗️ Arquitectura

### Frontend
- **Framework**: Next.js 16.0.3 con React 19
- **UI**: Tailwind CSS + Radix UI components
- **Autenticación**: Firebase Authentication
- **Estado**: React Context API
- **Notificaciones**: SweetAlert2

### Backend
- **Runtime**: Cloudflare Workers
- **Base de datos**: Cloudflare D1 (SQLite)
- **Almacenamiento**: Microsoft OneDrive (Graph API)
- **Deployment**: Vercel (frontend) + Cloudflare (backend)

## 🗄️ Estructura de Base de Datos

### Tabla `user_roles`
```sql
- user_id (TEXT, PK): ID del usuario de Firebase
- role (TEXT): 'super_admin' | 'admin' | 'usuario'
- estado (TEXT): 'activo' | 'inactivo'
- crear_carpeta (INTEGER): Permiso para crear carpetas en OneDrive
- email (TEXT): Email del usuario
- displayName (TEXT): Nombre del usuario
- created_at, updated_at (TEXT): Timestamps
```

### Tabla `viaticos`
```sql
- id (TEXT, PK): UUID del viático
- usuario_id (TEXT, FK): Referencia a user_roles
- fecha (TEXT): Fecha del gasto
- tipo (TEXT): Tipo de gasto (transporte, alimentación, etc.)
- monto (REAL): Monto del gasto
- descripcion (TEXT): Descripción del gasto
- folder_path (TEXT): Ruta de la carpeta en OneDrive
- created_at, updated_at (TEXT): Timestamps
```

## 🚀 Características

### Roles y Permisos

#### Super Admin
- Gestión completa de usuarios (crear, editar, eliminar)
- Asignación de roles
- Visualización de todos los viáticos
- Configuración del sistema

#### Admin
- Visualización de todos los viáticos
- Gestión limitada de usuarios

#### Usuario
- Registro de viáticos propios
- Captura de fotos con cámara
- Visualización de historial personal
- Edición/eliminación de registros propios

### Funcionalidades Principales

1. **Registro de Viáticos**
   - Formulario con fecha, tipo, monto y descripción
   - Captura múltiple de fotos desde cámara
   - Subida automática a OneDrive
   - Organización por carpetas (usuario/fecha)

2. **Gestión de Usuarios** (Admin)
   - CRUD completo de usuarios
   - Asignación de roles
   - Control de estado (activo/inactivo)
   - Permisos de creación de carpetas

3. **Dashboard**
   - Visualización de viáticos según rol
   - Filtros por fecha, tipo, usuario
   - Estadísticas y resúmenes
   - Exportación de datos

## 📁 Estructura del Proyecto

```
viaticos/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/             # Panel de administración
│   │   ├── dashboard/         # Dashboard principal
│   │   ├── login/             # Página de login
│   │   ├── mis-viaticos/      # Historial de viáticos
│   │   ├── nuevo-viatico/     # Formulario de registro
│   │   ├── api/               # API routes
│   │   │   └── config/        # Configuración de Firebase
│   │   ├── manifest.ts        # PWA manifest
│   │   └── sw.ts              # Service Worker (deshabilitado)
│   ├── components/            # Componentes React
│   │   └── ui/               # Componentes de UI (Radix)
│   ├── contexts/              # React Contexts
│   │   └── AuthContext.tsx   # Contexto de autenticación
│   ├── services/              # Servicios API
│   │   └── api.ts            # Cliente API para Cloudflare Workers
│   ├── config/                # Configuración
│   └── lib/                   # Utilidades
├── database/                  # Esquemas SQL
├── migrations/                # Migraciones D1
├── public/                    # Archivos estáticos
├── middleware.ts              # Middleware de autenticación
├── wrangler.toml             # Configuración Cloudflare Workers
└── next.config.js            # Configuración Next.js
```

## 🔧 Configuración

### Variables de Entorno

#### `.env.local` (Frontend)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_CLOUDFLARE_API_URL=
```

#### `wrangler.toml` (Backend)
```toml
[vars]
ONEDRIVE_CLIENT_ID=
ONEDRIVE_DRIVE_ID=
ONEDRIVE_REDIRECT_URI=
ONEDRIVE_TENANT_ID=
ONEDRIVE_VIATICOS_FOLDER_ID=
SUPER_ADMIN_EMAIL=
ALLOWED_ORIGINS=
```

### Firebase Setup
1. Crear proyecto en Firebase Console
2. Habilitar Authentication (Email/Password)
3. Configurar dominio autorizado
4. Copiar credenciales a `.env.local`

### Cloudflare Setup
1. Crear cuenta en Cloudflare
2. Crear D1 database: `wrangler d1 create viaticos-db`
3. Ejecutar migraciones: `npm run d1:migrate`
4. Configurar OneDrive App Registration en Azure AD
5. Actualizar `wrangler.toml` con credenciales

### OneDrive Setup
1. Registrar app en Azure AD
2. Configurar permisos: `Files.ReadWrite.All`
3. Crear carpeta raíz "Viáticos" en OneDrive
4. Obtener IDs de Drive y Folder
5. Configurar redirect URI para OAuth

## 📦 Instalación

```bash
# Clonar repositorio
git clone https://github.com/davidzapatab05/viaticos.git
cd viaticos

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar migraciones
npm run d1:migrate

# Desarrollo
npm run dev              # Frontend (localhost:3000)
npm run worker:dev       # Backend (localhost:8787)

# Producción
npm run build           # Build frontend
npm run worker:deploy   # Deploy backend
```

## 🚀 Deployment

### Frontend (Vercel)
```bash
# Conectar repositorio en Vercel
# Configurar variables de entorno
# Deploy automático en push a main
```

### Backend (Cloudflare Workers)
```bash
npm run worker:deploy
```

## 🛠️ Scripts Disponibles

```bash
npm run dev              # Servidor de desarrollo
npm run build           # Build de producción
npm run start           # Servidor de producción
npm run lint            # Linter
npm run worker:dev      # Cloudflare Worker local
npm run worker:deploy   # Deploy Worker
npm run d1:migrate      # Ejecutar migraciones D1
```

## 🔒 Seguridad

- Autenticación mediante Firebase Authentication
- Middleware de Next.js para protección de rutas
- Validación de roles en backend
- CORS configurado para dominios específicos
- Tokens de Firebase verificados en cada request
- Sanitización de inputs

## 🐛 Problemas Conocidos

### PWA Deshabilitado
- Serwist (PWA plugin) incompatible con Next.js 16
- Service Worker deshabilitado temporalmente
- Funcionalidad offline no disponible
- Seguir progreso en: https://github.com/serwist/serwist/issues/54

### Solución Temporal
```javascript
// next.config.js
const withSerwist = require("@serwist/next").default({
  disable: true, // Deshabilitado hasta compatibilidad
})
```

## 📝 Notas Técnicas

### Autenticación
- Firebase maneja login/logout
- Token almacenado en cookies
- Middleware verifica token en cada request
- Roles verificados en backend

### Almacenamiento de Fotos
- Fotos capturadas con MediaDevices API
- Convertidas a base64
- Enviadas a Cloudflare Worker
- Worker sube a OneDrive vía Graph API
- Estructura: `/Viáticos/{usuario}/{fecha}/{foto}.jpg`

### Base de Datos
- Cloudflare D1 (SQLite serverless)
- Migraciones versionadas
- Índices optimizados para consultas frecuentes
- Foreign keys con CASCADE DELETE

## 🤝 Contribución

Este es un proyecto privado. Para contribuir:
1. Contactar al administrador
2. Fork del repositorio
3. Crear branch feature
4. Commit cambios
5. Push y crear Pull Request

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

## 👤 Autor

**David Zapata**
- Email: davidzapata_051099@hotmail.com
- GitHub: [@davidzapatab05](https://github.com/davidzapatab05)

## 🔄 Historial de Versiones

### v1.1.0 (2025-11-26)
- ✅ Edición de viáticos con validación de fecha (10 AM cutoff)
- ✅ Override de fecha para administradores
- ✅ Restricciones de seguridad en gestión de roles
- ✅ Mejoras de UI/UX (SweetAlert2, Placeholders dinámicos)
- 🐛 Corrección de bugs y estabilidad

### v1.0.0 (2025-01-22)
- ✅ Sistema de autenticación con Firebase
- ✅ Gestión de usuarios con roles
- ✅ Registro de viáticos con fotos
- ✅ Integración con OneDrive
- ✅ Dashboard administrativo
- ✅ Cloudflare Workers + D1
- ⚠️ PWA deshabilitado (incompatibilidad Next.js 16)

## 📞 Soporte

Para reportar bugs o solicitar features, contactar al administrador del sistema.

---

**Última actualización**: 2025-11-26
