-- =====================================================
-- SCHEMA DE BASE DE DATOS - SISTEMA DE VIÁTICOS
-- =====================================================
-- Base de datos: Cloudflare D1 (SQLite)
-- Última actualización: 2025-11-20
-- =====================================================

-- =====================================================
-- TABLA: user_roles
-- Descripción: Almacena información de usuarios y sus roles
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'usuario',
  estado TEXT DEFAULT 'activo',
  crear_carpeta INTEGER DEFAULT 1,
  email TEXT,
  displayName TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Índices para user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_estado ON user_roles(estado);

-- =====================================================
-- TABLA: viaticos
-- Descripción: Almacena los registros de viáticos
-- =====================================================
CREATE TABLE IF NOT EXISTS viaticos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  fecha TEXT NOT NULL,
  para TEXT,
  que_sustenta TEXT DEFAULT 'VIATICO',
  tipo_comprobante TEXT,
  numero_documento TEXT,
  numero_comprobante TEXT,
  monto REAL NOT NULL,
  descripcion TEXT NOT NULL,
  folder_path TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES user_roles(user_id) ON DELETE CASCADE
);

-- Índices para viaticos
CREATE INDEX IF NOT EXISTS idx_viaticos_usuario_id ON viaticos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_viaticos_fecha ON viaticos(fecha);
CREATE INDEX IF NOT EXISTS idx_viaticos_tipo_comprobante ON viaticos(tipo_comprobante);
CREATE INDEX IF NOT EXISTS idx_viaticos_para ON viaticos(para);

-- =====================================================
-- ROLES Y PERMISOS
-- =====================================================
-- Roles disponibles:
--   - 'usuario': Usuario estándar con acceso limitado
--   - 'admin': Administrador con acceso a gestión de usuarios y viáticos
--   - 'super_admin': Super administrador con acceso completo (definido por email en env)
--
-- Estados de usuario:
--   - 'activo': Usuario puede acceder al sistema
--   - 'inactivo': Usuario bloqueado
--
-- crear_carpeta:
--   - 1: Usuario puede crear viáticos y tiene carpeta en OneDrive
--   - 0: Usuario no puede crear viáticos

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. La tabla d1_migrations fue eliminada en la migración 0003
-- 2. Los campos url_onedrive y archivos_metadata fueron eliminados de viaticos
-- 3. El campo folder_path almacena la ruta de la carpeta en OneDrive
-- 4. El super_admin se define por email en la variable de entorno SUPER_ADMIN_EMAIL
-- 5. Cuando se elimina un usuario, se eliminan automáticamente sus viáticos (CASCADE)
-- 6. Las fechas se almacenan en formato ISO 8601 (YYYY-MM-DD)
-- 7. Los montos se almacenan como REAL (números decimales)
-- 8. Campos en viaticos (migraciones 0003, 0004, 0005):
--    - para: EMPRESA o PERSONAL
--    - que_sustenta: Siempre 'VIATICO'
--    - tipo_comprobante: FACTURA, BOLETA, RECIBO POR HONORARIO, SIN COMPROBANTE
--    - numero_documento: RUC o DNI (opcional, puede ser NULL)
--    - numero_comprobante: Número del comprobante (opcional, puede ser NULL)
-- 9. Campos eliminados:
--    - tipo: Ya no se usa (eliminado en migración 0004)
--    - trabajador: Redundante (eliminado en migración 0004)
--    - dia, mes, año: Redundantes, se calculan desde fecha (eliminados en migración 0005)
-- 10. Zona horaria: Todas las fechas usan Perú - Lima (America/Lima, UTC-5)

-- =====================================================
-- ESTRUCTURA DE CARPETAS EN ONEDRIVE
-- =====================================================
-- viaticos/
--   └── {displayName}_{uidShort}/
--       └── {YYYY-MM-DD_HH-MM-SS}_{viaticoId}/
--           ├── {timestamp}_{random}.jpg (o .png, .pdf)
--           └── detalle_viatico.txt
--
-- Ejemplo:
-- viaticos/
--   └── Juan_Perez_a1b2c3d4/
--       └── 2025-11-20_14-30-00_v_1234567890/
--           ├── 2025-11-20_14-30-00_abc12.jpg
--           └── detalle_viatico.txt
