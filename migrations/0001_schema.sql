-- Esquema Consolidado
DROP TABLE IF EXISTS user_roles;
CREATE TABLE user_roles (
  user_id TEXT PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'usuario',
  estado TEXT DEFAULT 'activo',
  crear_carpeta INTEGER DEFAULT 1,
  email TEXT,
  displayName TEXT,
  last_closed_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_estado ON user_roles(estado);

DROP TABLE IF EXISTS viaticos;
CREATE TABLE viaticos (
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
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_viaticos_usuario_id ON viaticos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_viaticos_fecha ON viaticos(fecha);
