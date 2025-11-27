# Migraciones de Base de Datos

## Migración Inicial

Este directorio contiene la migración inicial para la base de datos de viáticos.

### Aplicar Migración

**Local (desarrollo):**
```bash
wrangler d1 execute viaticos-db --local --file=./migrations/0001_initial_schema.sql
```

**Remoto (producción):**
```bash
wrangler d1 execute viaticos-db --remote --file=./migrations/0001_initial_schema.sql
```

### Estructura de Tablas

#### `viaticos`
Almacena los registros de viáticos de los usuarios.
- `id`: Identificador único
- `usuario_id`: ID del usuario (Firebase UID)
- `fecha`: Fecha del viático
- `monto`: Monto del gasto
- `descripcion`: Descripción del gasto
- `folder_path`: Ruta de la carpeta en OneDrive
- `created_at`, `updated_at`: Timestamps

#### `user_roles`
Gestiona roles, estados y permisos de usuarios.
- `user_id`: ID del usuario (Firebase UID)
- `role`: Rol del usuario (`usuario`, `admin`, `super_admin`)
- `estado`: Estado del usuario (`activo`, `inactivo`)
- `email`: Email del usuario
- `displayName`: Nombre para mostrar
- `last_closed_date`: Última fecha de cierre de viáticos
- `created_at`, `updated_at`: Timestamps

#### `push_subscriptions`
Almacena suscripciones de notificaciones push.
- `id`: ID autoincremental
- `user_id`: ID del usuario
- `subscription_json`: Datos de suscripción en JSON
- `created_at`, `updated_at`: Timestamps (Unix epoch)

#### `config`
Configuraciones del sistema (opcional).
- `key`: Clave de configuración
- `value`: Valor de configuración
- `created_at`, `updated_at`: Timestamps

### Verificar Migración

```bash
# Local
wrangler d1 execute viaticos-db --local --command="SELECT name FROM sqlite_master WHERE type='table';"

# Remoto
wrangler d1 execute viaticos-db --remote --command="SELECT name FROM sqlite_master WHERE type='table';"
```

Deberías ver las tablas: `viaticos`, `user_roles`, `push_subscriptions`, `config`
