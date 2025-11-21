-- =====================================================
-- MIGRACIÓN 0002: Crear tabla viaticos
-- =====================================================
CREATE TABLE IF NOT EXISTS viaticos (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL,
  fecha TEXT NOT NULL,
  tipo TEXT NOT NULL,
  monto REAL NOT NULL,
  descripcion TEXT,
  folder_path TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES user_roles(user_id) ON DELETE CASCADE
);

-- Índices para viaticos
CREATE INDEX IF NOT EXISTS idx_viaticos_usuario_id ON viaticos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_viaticos_fecha ON viaticos(fecha);
CREATE INDEX IF NOT EXISTS idx_viaticos_tipo ON viaticos(tipo);
