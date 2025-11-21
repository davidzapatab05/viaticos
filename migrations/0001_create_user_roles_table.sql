-- =====================================================
-- MIGRACIÓN 0001: Crear tabla user_roles
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
