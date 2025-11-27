-- Migración inicial completa para base de datos de viáticos
-- Incluye todas las tablas necesarias para el sistema

-- =====================================================
-- Tabla: viaticos
-- Almacena los registros de viáticos de los usuarios
-- =====================================================
CREATE TABLE IF NOT EXISTS viaticos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  fecha TEXT NOT NULL,
  monto REAL NOT NULL,
  descripcion TEXT,
  folder_path TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Índices para mejorar rendimiento de consultas
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

-- Índice para búsquedas por email
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);

-- =====================================================
-- Tabla: push_subscriptions
-- Almacena suscripciones de notificaciones push
-- =====================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  subscription_json TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- =====================================================
-- Tabla: config (opcional)
-- Para almacenar configuraciones del sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);