-- Migraci?n inicial completa para base de datos de Viáticos
-- Incluye todas las tablas necesarias para el sistema

-- =====================================================
-- Tabla: viaticos
-- Almacena los registros de Viáticos de los usuarios
-- =====================================================
CREATE TABLE IF NOT EXISTS viaticos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  fecha TEXT NOT NULL,
  para TEXT,
  que_sustenta TEXT,
  tipo_comprobante TEXT,
  numero_documento TEXT,
  numero_comprobante TEXT,
  monto REAL NOT NULL,
  descripcion TEXT,
  folder_path TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ?ndices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_viaticos_usuario ON viaticos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_viaticos_fecha ON viaticos(fecha);

-- =====================================================
-- Tabla: user_roles
-- Gestiona roles, estados y permisos de usuarios
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'usuario',
  estado TEXT DEFAULT 'activo',
  email TEXT,
  displayName TEXT,
  last_closed_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ?ndice para b?squedas por email
-- =====================================================
-- Tabla: config (opcional)
-- Para almacenar configuraciones del sistema
-- =====================================================
-- CREATE TABLE IF NOT EXISTS config (
--   key TEXT PRIMARY KEY,
--   value TEXT NOT NULL,
--   created_at TEXT DEFAULT (datetime('now')),
--   updated_at TEXT DEFAULT (datetime('now'))
-- );
