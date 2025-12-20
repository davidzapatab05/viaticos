

/**
 * Cloudflare Worker completo de viÃ¡ticos
 * Incluye: Firebase Auth, roles, CRUD viÃ¡ticos, OneDrive (seguro para cuentas personales)
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function handleCORS(request, env) {
  const origin = request.headers.get('Origin')
  const allowedOrigins = env.ALLOWED_ORIGINS?.split(',') || ['*']

  if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
    return new Response(null, { headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin || '*' } })
  }
  return new Response(null, { status: 403 })
}

function getPeruDateTime() {
  const now = new Date();
  const options = {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  const formatter = new Intl.DateTimeFormat('es-PE', options);
  const parts = formatter.formatToParts(now);
  const p = {};
  parts.forEach(({ type, value }) => p[type] = value);
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

function calculateActiveDate() {
  const now = new Date();
  const peruTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }));
  const hours = peruTime.getHours();

  // Si es antes de las 10 AM, usamos la fecha de ayer
  if (hours < 10) {
    const yesterday = new Date(peruTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, '0');
    const d = String(yesterday.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Si es 10 AM o después, usamos la fecha de hoy
  const y = peruTime.getFullYear();
  const m = String(peruTime.getMonth() + 1).padStart(2, '0');
  const d = String(peruTime.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ===================== Firebase =====================
async function verifyFirebaseToken(token, env) {
  try {
    const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''
    if (!projectId) return { uid: 'anonymous', email: 'unknown@example.com', displayName: 'Anonimo' }

    let decodedToken = null
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        decodedToken = {
          uid: payload.user_id || payload.sub || payload.uid,
          email: payload.email || 'unknown@example.com',
          displayName: payload.name || payload.display_name || null,
        }
      }
    } catch (e) { console.warn('Error decodificando token JWT:', e) }

    try {
      const resp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY || ''}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }) }
      )
      if (resp.ok) {
        const data = await resp.json()
        if (data.users?.[0]) {
          const user = data.users[0]
          // CORREGIDO: Asegurar que obtenemos email y displayName correctamente
          const email = user.email || decodedToken?.email || 'unknown@example.com'
          const displayName = user.displayName || user.name || decodedToken?.displayName || user.displayName || null



          return {
            uid: user.localId || user.uid || decodedToken?.uid,
            email: email,
            displayName: displayName,
          }
        }
      }
    } catch (e) { console.warn('Error verificando token Firebase API:', e) }

    return decodedToken || { uid: 'dev-user', email: 'dev@example.com', displayName: 'UsuarioDev' }
  } catch (error) {
    console.error('Error verificando token:', error)
    return { uid: 'dev-user', email: 'dev@example.com', displayName: 'UsuarioDev' }
  }
}

// ===================== Roles =====================
async function getUserRole(env, uid, email = '') {
  try {
    const superAdminEmail = (env.SUPER_ADMIN_EMAIL || '').toLowerCase()
    if (superAdminEmail && email.toLowerCase() === superAdminEmail) return 'super_admin'
    const res = await env.DB.prepare('SELECT role, estado FROM user_roles WHERE user_id = ?').bind(uid).first()
    return res?.role || 'usuario'
  } catch (e) { console.warn('Error obteniendo rol:', e); return 'usuario' }
}

// Verificar si el usuario es super_admin
async function isSuperAdmin(env, uid, email = '') {
  try {
    const superAdminEmail = (env.SUPER_ADMIN_EMAIL || '').toLowerCase()
    if (superAdminEmail && email.toLowerCase() === superAdminEmail) return true
    const res = await env.DB.prepare('SELECT role FROM user_roles WHERE user_id = ?').bind(uid).first()
    return res?.role === 'super_admin'
  } catch (e) { console.warn('Error verificando super_admin:', e); return false }
}

// Verificar si el usuario es admin o super_admin
async function isAdmin(env, uid, email = '') {
  try {
    const superAdminEmail = (env.SUPER_ADMIN_EMAIL || '').toLowerCase()
    if (superAdminEmail && email.toLowerCase() === superAdminEmail) return true
    const res = await env.DB.prepare('SELECT role FROM user_roles WHERE user_id = ?').bind(uid).first()
    return res?.role === 'admin' || res?.role === 'super_admin'
  } catch (e) { console.warn('Error verificando admin:', e); return false }
}

// Verificar si el usuario estÃ¡ activo
async function isUserActive(env, uid, email = '') {
  try {
    const superAdminEmail = (env.SUPER_ADMIN_EMAIL || '').toLowerCase()
    // Super admin siempre estÃ¡ activo
    if (superAdminEmail && email.toLowerCase() === superAdminEmail) return true

    const res = await env.DB.prepare('SELECT estado FROM user_roles WHERE user_id = ?').bind(uid).first()
    // Si no existe en la tabla, estÃ¡ activo por defecto
    if (!res) return true
    return res.estado === 'activo' || res.estado === null
  } catch (e) {
    console.warn('Error verificando estado:', e)
  }
}

// Actualizar estado del usuario
async function setUserStatus(env, uid, estado) {
  try {
    await env.DB.prepare(
      `UPDATE user_roles SET estado = ?, updated_at = ? WHERE user_id = ?`
    ).bind(estado, getPeruDateTime(), uid).run()
    return true
  } catch (e) { console.error('Error actualizando estado:', e); return false }
}

// Establecer o actualizar rol y estado del usuario
async function setUserRole(env, uid, role, estado = 'activo', crearCarpeta = 1, email = null, displayName = null) {
  try {
    await ensureUserRolesTable(env)

    // Verificar si el usuario ya existe
    const existing = await env.DB.prepare('SELECT user_id, displayName FROM user_roles WHERE user_id = ?').bind(uid).first()

    if (existing) {
      // Usuario existente: SOLO actualizar email y displayName si no son genéricos
      // NO tocar rol ni estado - mantener los datos existentes
      const updateFields = []
      const updateValues = []

      if (email && email !== 'unknown@example.com') {
        updateFields.push('email = ?')
        updateValues.push(email)
      }

      // SOLO actualizar displayName si en la BD es inválido (null, vacío, Anonimo)
      // Esto previene que el login sobrescriba un nombre validado manualmente
      const currentDbName = existing.displayName;
      const isCurrentNameValid = currentDbName && currentDbName !== 'Anonimo' && currentDbName !== 'UsuarioDev';

      if (displayName && displayName !== 'Anonimo' && displayName !== 'UsuarioDev') {
        if (!isCurrentNameValid) {
          updateFields.push('displayName = ?')
          updateValues.push(displayName)
        }
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = ?')
        updateValues.push(getPeruDateTime())
        updateValues.push(uid)

        await env.DB.prepare(
          `UPDATE user_roles SET ${updateFields.join(', ')} WHERE user_id = ?`
        ).bind(...updateValues).run()
      }
    } else {
      // Usuario nuevo: Insertar con el rol calculado
      await env.DB.prepare(
        `INSERT INTO user_roles (user_id, role, estado, email, displayName, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(uid, role, estado, email, displayName, getPeruDateTime(), getPeruDateTime()).run()
    }

    return true
  } catch (e) {
    console.error('Error estableciendo rol de usuario:', e)
    return false
  }
}



// ===================== Configuration =====================
async function getConfig(env, key) {
  try {
    const result = await env.DB.prepare('SELECT value FROM config WHERE key = ?').bind(key).first()
    if (result && result.value) {
      return result.value
    }
  } catch (e) {
    console.warn(`Error reading config key ${key} from DB:`, e.message)
  }
  // Fallback to environment variable
  return env[key] || null
}

// ===================== OneDrive =====================
async function getOneDriveAccessToken(env) {
  const { ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET, ONEDRIVE_REFRESH_TOKEN, ONEDRIVE_REDIRECT_URI } = env
  if (!ONEDRIVE_CLIENT_ID || !ONEDRIVE_CLIENT_SECRET || !ONEDRIVE_REFRESH_TOKEN || !ONEDRIVE_REDIRECT_URI) {
    throw new Error('Falta configuraciÃ³n OneDrive')
  }

  const params = new URLSearchParams({
    client_id: ONEDRIVE_CLIENT_ID,
    client_secret: ONEDRIVE_CLIENT_SECRET,
    refresh_token: ONEDRIVE_REFRESH_TOKEN,
    grant_type: "refresh_token",
    redirect_uri: ONEDRIVE_REDIRECT_URI
  })

  const resp = await fetch("https://login.live.com/oauth20_token.srf", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  })
  const data = await resp.json()
  if (!resp.ok || data.error) throw new Error(`Error obteniendo token OneDrive: ${JSON.stringify(data)}`)
  return data.access_token
}

// ===================== DB Helpers =====================
async function ensureViaticosTable(env) {
  try {
    // Â¿Existe la tabla?
    const table = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='viaticos'`
    ).first();

    if (!table) {


      await env.DB.prepare(
        `CREATE TABLE viaticos (
          id TEXT PRIMARY KEY,
          usuario_id TEXT NOT NULL,
          fecha TEXT NOT NULL,
          monto REAL NOT NULL,
          descripcion TEXT,
          folder_path TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )`
      ).run();
    }
  } catch (err) {
    console.error("Error asegurando tabla viaticos:", err.message);
  }
}

async function ensureGastosTable(env) {
  try {
    const table = await env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='gastos'`
    ).first();

    if (!table) {
      await env.DB.prepare(
        `CREATE TABLE gastos (
          id TEXT PRIMARY KEY,
          usuario_id TEXT NOT NULL,
          fecha TEXT NOT NULL,
          de TEXT DEFAULT 'FAMAVE',
          motivo TEXT DEFAULT 'VIATICO',
          para_quien_impuesto TEXT,
          mes_sueldo TEXT,
          codigo_devolucion TEXT,
          medio_pago TEXT,
          entidad TEXT,
          numero_operacion TEXT,
          monto REAL NOT NULL,
          descripcion TEXT,
          folder_path TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          updated_at TEXT DEFAULT (datetime('now'))
        )`
      ).run();
    }
  } catch (err) {
    console.error("Error asegurando tabla gastos:", err.message);
  }
}


async function ensureUserRolesTable(env) {
  try {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS user_roles (
         user_id TEXT PRIMARY KEY,
         role TEXT NOT NULL DEFAULT 'usuario',
         estado TEXT DEFAULT 'activo',
         email TEXT,
         displayName TEXT,
         created_at TEXT DEFAULT (datetime('now')),
         updated_at TEXT DEFAULT (datetime('now'))
       )`
    ).run()

    // Agregar columnas si no existen (para migraciÃ³n gradual)
    try {
      await env.DB.prepare(`ALTER TABLE user_roles ADD COLUMN estado TEXT DEFAULT 'activo'`).run()
    } catch (e) { /* Columna ya existe */ }

    try {
      await env.DB.prepare(`ALTER TABLE user_roles ADD COLUMN email TEXT`).run()
    } catch (e) { /* Columna ya existe */ }

    try {
      await env.DB.prepare(`ALTER TABLE user_roles ADD COLUMN displayName TEXT`).run()
    } catch (e) { /* Columna ya existe */ }
  } catch (e) { console.warn('No se pudo asegurar la tabla user_roles:', e.message) }
}



// ===================== Limpieza de Usuarios =====================
async function cleanupAnonymousUsers(env) {
  try {
    await ensureUserRolesTable(env)
    // Eliminar usuarios anonymous de user_roles
    const deleteResult = await env.DB.prepare(
      `DELETE FROM user_roles WHERE user_id = 'anonymous' OR user_id LIKE 'dev-%' OR email = 'unknown@example.com'`
    ).run()

    // TambiÃ©n eliminar viÃ¡ticos asociados a usuarios anonymous
    await ensureViaticosTable(env)
    const deleteViaticos = await env.DB.prepare(
      `DELETE FROM viaticos WHERE usuario_id = 'anonymous' OR usuario_id LIKE 'dev-%'`
    ).run()

    return {
      deletedUsers: deleteResult.meta.changes || 0,
      deletedViaticos: deleteViaticos.meta.changes || 0
    }
  } catch (e) {
    console.error('Error limpiando usuarios anonymous:', e)
    throw e
  }
}

// ===================== OneDrive Helpers (Personal Account) =====================
/**
 * Verificar si una carpeta existe (solo verificaciÃ³n, NO creaciÃ³n)
 * Para OneDrive personal, NO creamos carpetas previamente - se crean automÃ¡ticamente al subir archivos
 */
async function checkOneDriveFolder(accessToken, folderPath) {
  try {
    const checkResp = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(folderPath)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (checkResp.ok) {
      const folderData = await checkResp.json()
      return folderData.id // La carpeta existe
    }

    return null // La carpeta no existe (pero se crearÃ¡ automÃ¡ticamente al subir archivo)
  } catch (error) {
    console.warn(`Error verificando carpeta ${folderPath}:`, error.message)
    return null
  }
}

/**
 * Crear carpeta en OneDrive personal usando mÃ©todo de archivo temporal
 * CORREGIDO: Solo usar mÃ©todo de archivo temporal, NO usar APIs de SharePoint
 */
async function createOneDriveFolder(accessToken, folderPath) {
  try {
    // Verificar si la carpeta ya existe
    const checkResp = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(folderPath)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (checkResp.ok) {
      const folderData = await checkResp.json()
      return folderData.id // La carpeta ya existe
    }

    // Si no existe, crear usando archivo temporal
    // Este mÃ©todo funciona con OneDrive personal sin requerir SharePoint Online
    const tempFileName = `.temp_${Date.now()}.tmp`
    const tempPath = `${folderPath}/${tempFileName}`

    // Crear archivo temporal (esto crea la carpeta automÃ¡ticamente si no existe)
    const createTempResp = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(tempPath)}:/content`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'text/plain'
        },
        body: 'temp'
      }
    )

    if (createTempResp.ok) {
      const tempFileData = await createTempResp.json()

      // Eliminar el archivo temporal
      await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${tempFileData.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      ).catch(() => { }) // Ignorar errores al eliminar

      // Obtener el ID de la carpeta creada
      const folderResp = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(folderPath)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (folderResp.ok) {
        const folderData = await folderResp.json()
        return folderData.id
      }
    } else {
      // Si falla, intentar obtener el error para debugging
      const errorText = await createTempResp.text().catch(() => '')
      let errorData = {}
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { error: errorText }
      }

      // Si el error es de SPO license, ignorarlo y retornar null (la carpeta se crearÃ¡ al subir archivo)
      if (errorData.error?.code === 'BadRequest' && errorData.error?.message?.includes('SPO license')) {
        console.warn(`OneDrive personal: La carpeta ${folderPath} se crearÃ¡ automÃ¡ticamente al subir el primer archivo`)
        return null
      }

      console.warn(`Error creando carpeta ${folderPath}:`, errorData)
    }

    return null
  } catch (error) {
    console.error(`Error creando carpeta ${folderPath}:`, error)
    // NO lanzar error - solo retornar null para que el sistema continÃºe
    return null
  }
}
async function deleteOneDriveFolder(accessToken, userId, userDisplayName = null, userEmail = null) {
  try {
    // Construir el nombre de la carpeta usando la misma lÃ³gica que ensureUserOneDriveFolder
    let userFolderName = ''

    if (userDisplayName && userDisplayName.trim() && userDisplayName !== 'Anonimo' && userDisplayName !== 'UsuarioDev') {
      userFolderName = userDisplayName.trim()
    } else if (userEmail && userEmail !== 'unknown@example.com') {
      const emailParts = userEmail.split('@')
      userFolderName = emailParts[0] || userEmail
    } else {
      userFolderName = `usuario`
    }

    userFolderName = userFolderName
      .replace(/[^a-zA-Z0-9\s._-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 40)

    if (!userFolderName || userFolderName.length === 0) {
      userFolderName = `usuario`
    }

    // Agregar UID al final
    const uidShort = userId.substring(0, 8)
    userFolderName = `${userFolderName}_${uidShort}`

    const folderPath = `viaticos/${userFolderName}`

    // Verificar si la carpeta existe
    const checkResp = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(folderPath)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!checkResp.ok) {
      return { success: true, message: 'Carpeta no existe' } // Ya no existe
    }

    const folderData = await checkResp.json()

    // Eliminar la carpeta y todo su contenido
    const deleteResp = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${folderData.id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    )

    if (deleteResp.ok || deleteResp.status === 404) {
      return { success: true, message: 'Carpeta eliminada exitosamente', folderPath }
    } else {
      const errorData = await deleteResp.json().catch(() => ({}))
      throw new Error(`Error eliminando carpeta: ${JSON.stringify(errorData)}`)
    }
  } catch (error) {
    console.error(`Error eliminando carpeta para usuario ${userId}:`, error)
    throw error
  }
}

// ===================== OneDrive Upload =====================
async function uploadToOneDrive(imageBuffer, fileName, contentType, userId, fecha, env, createTxt = true, userEmail = null, displayName = null, dateTimeFolder = null) {
  try {
    const accessToken = await getOneDriveAccessToken(env)

    // Usar la misma lÃ³gica que ensureUserOneDriveFolder para obtener el nombre
    let userFolderName = ''

    if (displayName && displayName.trim() && displayName !== 'Anonimo' && displayName !== 'UsuarioDev') {
      userFolderName = displayName.trim()
    } else if (userEmail && userEmail !== 'unknown@example.com') {
      const emailParts = userEmail.split('@')
      userFolderName = emailParts[0] || userEmail
    } else {
      userFolderName = `usuario`
    }

    // Limpiar el nombre
    userFolderName = userFolderName
      .replace(/[^a-zA-Z0-9\s._-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .substring(0, 40) // Limitar longitud para dejar espacio al UID

    if (!userFolderName || userFolderName.length === 0) {
      userFolderName = `usuario`
    }

    // AGREGAR UID al final del nombre (mismo formato que ensureUserOneDriveFolder)
    const uidShort = userId.substring(0, 8)
    userFolderName = `${userFolderName}_${uidShort}`

    // Nueva estructura: viaticos/{YYYY-MM-DD}/{UserFolder}
    // Si dateTimeFolder se pasa (que es la fecha activa), usarla. Si no, calcularla.
    const activeDate = dateTimeFolder || calculateActiveDate();

    // La ruta completa será: viaticos/{activeDate}/{userFolderName}
    // ensureUserOneDriveFolder espera el path relativo dentro de viaticos/
    // Pero ensureUserOneDriveFolder está diseñado para crear la carpeta del usuario directamente en viaticos/
    // Necesitamos ajustar la lógica o simplemente construir el path aquí.

    // Como el usuario pidió "viaticos/{YYYY-MM-DD}/{UserFolder}", construimos el path completo
    const fullPath = `viaticos/${activeDate}/${userFolderName}`;

    // Asegurar que la carpeta existe antes de subir (incluyendo la subcarpeta de fecha/hora)
    // OneDrive API crea carpetas padres automáticamente al subir, así que no es estrictamente necesario llamar a ensureUserOneDriveFolder
    // para la estructura dinámica.

    // Subir archivo directamente
    const uploadPath = `${fullPath}/${fileName}`
    const uploadResp = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(uploadPath)}:/content`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': contentType || 'application/octet-stream'
        },
        body: imageBuffer
      }
    )

    if (!uploadResp.ok) {
      const errorData = await uploadResp.json().catch(() => ({}))
      throw new Error(`Error subiendo archivo: ${JSON.stringify(errorData)}`)
    }

    const uploadData = await uploadResp.json()

    // Crear link compartido
    const shareResp = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/items/${uploadData.id}/createLink`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: 'view', scope: 'anonymous' })
      }
    )

    const shareData = shareResp.ok ? await shareResp.json() : null
    const shareUrl = shareData?.link?.webUrl || uploadData.webUrl

    // Crear archivo .txt si se requiere
    if (createTxt) {
      const txtName = fileName.replace(/\.(jpg|jpeg|png|webp|pdf)$/i, '.txt')
      const txtPath = `${fullPath}/${txtName}`
      const txtContent = `Usuario: ${userFolderName}\nEmail: ${userEmail || 'N/A'}\nFecha: ${fecha}\nArchivo: ${fileName}\nUID: ${userId}\n`

      await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(txtPath)}:/content`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'text/plain'
          },
          body: txtContent
        }
      ).catch(e => console.warn('Error creando archivo .txt:', e))
    }
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
}

// ===================== Backup Logic =====================
async function executeBackupAndCleanup(env, startDate, endDate, backupName) {
  try {
    console.log(`Iniciando backup para: ${backupName} (${startDate} - ${endDate})`);

    // 1. Obtener datos de D1
    // A) Viaticos (Rango de fechas)
    await ensureViaticosTable(env);
    const viaticosRes = await env.DB.prepare(
      `SELECT * FROM viaticos WHERE fecha >= ? AND fecha <= ?`
    ).bind(startDate, endDate).all();
    const viaticos = viaticosRes.results || [];

    // B) User Roles (Todos)
    await ensureUserRolesTable(env);
    const usersRes = await env.DB.prepare(`SELECT * FROM user_roles`).all();
    const users = usersRes.results || [];

    if (viaticos.length === 0) {
      console.log(`No hay viaticos para ${backupName}. Saltando backup.`);
      return { success: true, message: 'No hay viaticos para respaldar', count: 0 };
    }

    console.log(`Encontrados: ${viaticos.length} viaticos, ${users.length} usuarios.`);

    // 2. Generar SQL
    let sqlContent = `-- Backup Completo: ${backupName}\n`;
    sqlContent += `-- Fecha GeneraciÃ³n: ${getPeruDateTime()}\n`;
    sqlContent += `-- Rango Viaticos: ${startDate} a ${endDate}\n`;
    sqlContent += `-- Registros: ${viaticos.length} Viaticos, ${users.length} Usuarios\n\n`;

    sqlContent += `BEGIN TRANSACTION;\n\n`;

    // Helper para generar INSERTs
    const generateInserts = (tableName, rows) => {
      let sql = `-- Table: ${tableName}\n`;
      for (const row of rows) {
        const columns = Object.keys(row).join(', ');
        const values = Object.values(row).map(val => {
          if (val === null) return 'NULL';
          if (typeof val === 'number') return val;
          // Escapar comillas simples
          return `'${String(val).replace(/'/g, "''")}'`;
        }).join(', ');
        sql += `INSERT OR REPLACE INTO ${tableName} (${columns}) VALUES (${values});\n`;
      }
      sql += `\n`;
      return sql;
    };

    if (users.length > 0) sqlContent += generateInserts('user_roles', users);
    if (viaticos.length > 0) sqlContent += generateInserts('viaticos', viaticos);

    sqlContent += `COMMIT;\n`;

    // 3. Subir a OneDrive
    const accessToken = await getOneDriveAccessToken(env);
    const fileName = `${backupName}.sql`;
    const folderPath = `viaticos/backups`;

    const uploadResp = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(folderPath)}/${fileName}:/content`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/sql'
        },
        body: sqlContent
      }
    );

    if (!uploadResp.ok) {
      const err = await uploadResp.json().catch(() => ({}));
      throw new Error(`Error subiendo backup a OneDrive: ${JSON.stringify(err)}`);
    }

    console.log(`Backup subido exitosamente: ${fileName}`);

    // 4. ELIMINAR datos antiguos (PolÃ­tica de RetenciÃ³n)
    // SOLO VIATICOS
    if (viaticos.length > 0) {
      console.log(`Eliminando registros antiguos de VIATICOS de la BD...`);
      const deleteResult = await env.DB.prepare(
        `DELETE FROM viaticos WHERE fecha >= ? AND fecha <= ?`
      ).bind(startDate, endDate).run();

      console.log(`Eliminados ${deleteResult.meta.changes} registros de viaticos.`);

      return {
        success: true,
        message: 'Backup completo subido y viaticos antiguos eliminados',
        backupFile: fileName,
        deletedCount: deleteResult.meta.changes
      };
    } else {
      return {
        success: true,
        message: 'Backup completo subido (sin viaticos para eliminar)',
        backupFile: fileName,
        deletedCount: 0
      };
    }

  } catch (error) {
    console.error('Error en proceso de backup:', error);
    return { success: false, error: error.message };
  }
}

async function processMonthlyBackup(env) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }));

  // Ir 2 meses atrÃ¡s
  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth() - 2;

  if (targetMonth < 0) {
    targetMonth += 12;
    targetYear -= 1;
  }

  const monthStr = String(targetMonth + 1).padStart(2, '0');
  const backupName = `backup_${targetYear}-${monthStr}`;

  // Calcular rango de fechas para el query
  // Inicio: 1er dÃ­a del mes (YYYY-MM-DD) - SIN HORA para que la comparaciÃ³n de strings funcione con fechas sin hora
  const startDate = `${targetYear}-${monthStr}-01`;

  // Fin: Ãšltimo dÃ­a del mes 23:59:59 (para incluir cualquier registro con hora si existiera)
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const endDate = `${targetYear}-${monthStr}-${lastDay} 23:59:59`;

  return executeBackupAndCleanup(env, startDate, endDate, backupName);
}

// ===================== Handler Principal =====================
export default {
  async scheduled(event, env, ctx) {
    const cron = event.cron;
    console.log(`Ejecutando Cron: ${cron}`);

    // Cron diario: Limpieza de usuarios anÃ³nimos
    if (cron === "0 0 * * *") {
      await cleanupAnonymousUsers(env);
    }

    // Cron mensual: Backup (02:00 AM Peru del dÃ­a 1)
    if (cron === "0 7 1 * *") {
      ctx.waitUntil(processMonthlyBackup(env));
    }
  },

  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return handleCORS(request, env)
    const url = new URL(request.url), path = url.pathname

    try {
      const authHeader = request.headers.get('Authorization')
      const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null
      const user = token ? await verifyFirebaseToken(token, env) : null

      // --- Rutas ---

      // POST /api/cleanup/anonymous (limpiar usuarios anonymous - solo super_admin)
      if (path === '/api/cleanup/anonymous' && request.method === 'POST') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        if (!(await isSuperAdmin(env, user.uid, user.email))) {
          return new Response(JSON.stringify({ error: 'Solo super_admin puede ejecutar esta acciÃ³n' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        try {
          const result = await cleanupAnonymousUsers(env)
          return new Response(JSON.stringify({
            success: true,
            message: 'Limpieza completada',
            deletedUsers: result.deletedUsers,
            deletedViaticos: result.deletedViaticos
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Error ejecutando limpieza'
          }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // POST /api/backup/manual (Trigger manual de backup - solo super_admin)
      if (path === '/api/backup/manual' && request.method === 'POST') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        if (!(await isSuperAdmin(env, user.uid, user.email))) {
          return new Response(JSON.stringify({ error: 'Solo super_admin puede ejecutar esta acciÃ³n' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        try {
          const body = await request.json().catch(() => ({}));
          const { startDate, endDate } = body;

          if (!startDate || !endDate) {
            return new Response(JSON.stringify({ success: false, error: 'Fechas de inicio y fin son requeridas' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          const backupName = `backup_${startDate}_${endDate}`;
          const result = await executeBackupAndCleanup(env, startDate, endDate, backupName);

          return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // POST /api/users (registrar usuario)
      if (path === '/api/users' && request.method === 'POST') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        // Prevenir registro de usuarios anonymous
        if (user.uid === 'anonymous' || user.uid === 'dev-user' || user.email === 'unknown@example.com') {
          return new Response(JSON.stringify({
            success: false,
            error: 'No se puede registrar un usuario anonymous. Por favor, inicia sesiÃ³n correctamente.'
          }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        try {
          await ensureUserRolesTable(env)
          const existingUser = await env.DB.prepare('SELECT estado FROM user_roles WHERE user_id = ?').bind(user.uid).first()
          const role = await getUserRole(env, user.uid, user.email)

          const success = await setUserRole(
            env,
            user.uid,
            role,
            existingUser ? existingUser.estado : 'activo',
            user.email || null,
            user.displayName || null
          )

          if (!success) {
            throw new Error('No se pudo registrar el usuario en la base de datos')
          }

          const savedUser = await env.DB.prepare('SELECT email, displayName FROM user_roles WHERE user_id = ?').bind(user.uid).first()

          // Intentar crear la carpeta (ahora bajo la fecha actual, pero ensureUserOneDriveFolder no maneja fechas dinámicas bien por defecto,
          // así que mejor dejamos que se cree al subir el primer archivo, o actualizamos ensureUserOneDriveFolder.
          // Por simplicidad y robustez, dejamos que uploadToOneDrive maneje la creación recursiva implícita de OneDrive)
          // Opcional: Podríamos intentar crear la estructura base, pero OneDrive API crea carpetas padres automáticamente al subir.


          // Construir nombre de carpeta para respuesta
          const uidShort = user.uid.substring(0, 8)
          let userFolderName = (user.displayName || user.email?.split('@')[0] || 'usuario')
            .replace(/[^a-zA-Z0-9\s._-]/g, '')
            .trim()
            .replace(/\s+/g, '_')
            .substring(0, 40) || 'usuario'
          userFolderName = `${userFolderName}_${uidShort}`

          return new Response(JSON.stringify({
            success: true,
            message: 'Usuario registrado exitosamente',
            folderPath: `viaticos/${userFolderName}`,
            savedEmail: savedUser?.email,
            savedDisplayName: savedUser?.displayName
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          console.error('Error registrando usuario:', error)
          return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Error registrando usuario'
          }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // PUT /api/users/:uid/status (cambiar estado del usuario - solo admin)
      if (path.startsWith('/api/users/') && path.endsWith('/status') && request.method === 'PUT') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        if (!(await isAdmin(env, user.uid, user.email))) {
          return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const targetUid = path.split('/')[3] // /api/users/:uid/status
        const body = await request.json().catch(() => ({}))
        const estado = body.estado || 'activo'

        if (!['activo', 'inactivo'].includes(estado)) {
          return new Response(JSON.stringify({ error: 'Estado invÃ¡lido. Debe ser "activo" o "inactivo"' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // No permitir desactivar super_admin
        const targetUser = await env.DB.prepare('SELECT role FROM user_roles WHERE user_id = ?').bind(targetUid).first()
        if (targetUser?.role === 'super_admin' && estado === 'inactivo') {
          return new Response(JSON.stringify({ error: 'No se puede desactivar un super_admin' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        try {
          await setUserStatus(env, targetUid, estado)
          return new Response(JSON.stringify({ success: true, message: `Usuario ${estado === 'activo' ? 'activado' : 'desactivado'} exitosamente` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message || 'Error actualizando estado' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }







      // DELETE /api/users/:uid (eliminar usuario y su carpeta - admin o super_admin)
      if (path.startsWith('/api/users/') && request.method === 'DELETE' && !path.includes('/status') && !path.includes('/create-folder')) {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const currentUserRole = await getUserRole(env, user.uid, user.email)
        const isSA = currentUserRole === 'super_admin'
        const isAdminUser = currentUserRole === 'admin'

        if (!isSA && !isAdminUser) {
          return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const targetUid = path.split('/').pop()

        // Obtener datos del usuario objetivo
        const targetUser = await env.DB.prepare('SELECT role, email, displayName FROM user_roles WHERE user_id = ?').bind(targetUid).first()

        if (!targetUser) {
          return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Reglas de jerarquía:
        // 1. Nadie puede eliminar a un super_admin
        if (targetUser.role === 'super_admin') {
          return new Response(JSON.stringify({ error: 'No se puede eliminar un super_admin' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 2. Un admin puede eliminar a otro admin o usuario (pero no super_admin)
        // Ya validamos arriba que no sea super_admin.
        // Si soy admin, puedo eliminar a cualquiera que no sea super_admin (incluyendo otros admins)

        try {
          // Eliminar carpeta de OneDrive usando el UID
          try {
            const accessToken = await getOneDriveAccessToken(env)
            await deleteOneDriveFolder(accessToken, targetUid, targetUser.displayName, targetUser.email)
          } catch (e) {
            console.warn('No se pudo eliminar carpeta de OneDrive:', e.message)
            // Continuar con la eliminaciÃ³n del usuario aunque falle la eliminaciÃ³n de carpeta
          }

          // Eliminar viÃ¡ticos del usuario
          await env.DB.prepare('DELETE FROM viaticos WHERE usuario_id = ?').bind(targetUid).run()

          // Eliminar usuario de user_roles
          await env.DB.prepare('DELETE FROM user_roles WHERE user_id = ?').bind(targetUid).run()

          return new Response(JSON.stringify({
            success: true,
            message: 'Usuario, viÃ¡ticos y carpeta eliminados exitosamente'
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message || 'Error eliminando usuario' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // POST /api/onedrive/ensure (verificar carpeta - NO crear)
      if (path === '/api/onedrive/ensure' && request.method === 'POST') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        try {
          const accessToken = await getOneDriveAccessToken(env)
          const folderId = await checkOneDriveFolder(accessToken, 'viaticos')
          return new Response(JSON.stringify({
            success: true,
            folderId: folderId || 'no-existe-aun',
            message: folderId ? 'Carpeta existe' : 'Carpeta se crearÃ¡ automÃ¡ticamente al subir archivo'
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({
            success: true,
            message: 'Carpeta se crearÃ¡ automÃ¡ticamente al subir archivo',
            error: error.message
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }





      // PUT /api/users/:id/role (actualizar rol de usuario - admin o super_admin)
      if (path.match(/^\/api\/users\/[^\/]+\/role$/) && request.method === 'PUT') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const currentUserRole = await getUserRole(env, user.uid, user.email)
        const isSA = currentUserRole === 'super_admin'
        const isAdminUser = currentUserRole === 'admin'

        if (!isSA && !isAdminUser) {
          return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const targetUid = path.split('/')[3] // /api/users/:id/role

        try {
          const body = await request.json()
          const { role } = body

          if (!role || !['usuario', 'admin', 'super_admin'].includes(role)) {
            return new Response(JSON.stringify({ error: 'Rol inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          // Reglas de jerarquía para cambio de rol:
          // 1. Solo Super Admin puede asignar/quitar rol de Super Admin
          if (role === 'super_admin' && !isSA) {
            return new Response(JSON.stringify({ error: 'Solo Super Admin puede asignar este rol' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          // 2. Verificar rol actual del usuario objetivo
          const targetUser = await env.DB.prepare('SELECT role FROM user_roles WHERE user_id = ?').bind(targetUid).first()

          if (targetUser?.role === 'super_admin') {
            return new Response(JSON.stringify({ error: 'No se puede modificar el rol de un Super Admin' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          // Actualizar rol en la BD
          await env.DB.prepare('UPDATE user_roles SET role = ?, updated_at = ? WHERE user_id = ?')
            .bind(role, getPeruDateTime(), targetUid)
            .run()

          return new Response(JSON.stringify({
            success: true,
            message: `Rol actualizado a ${role}`
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message || 'Error actualizando rol' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // GET /api/get-viaticos-id (obtener ID de carpeta viaticos si existe)
      if (path === '/api/get-viaticos-id' && request.method === 'GET') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        try {
          const accessToken = await getOneDriveAccessToken(env)
          const folderId = await checkOneDriveFolder(accessToken, 'viaticos')
          return new Response(JSON.stringify({
            success: true,
            id: folderId || 'no-existe-aun',
            message: folderId ? 'Carpeta existe' : 'Carpeta se crearÃ¡ automÃ¡ticamente al subir archivo'
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({
            success: true,
            id: 'no-existe-aun',
            message: 'Carpeta se crearÃ¡ automÃ¡ticamente al subir archivo'
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // GET /api/users/me (obtener datos del usuario actual)
      if (path === '/api/users/me' && request.method === 'GET') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        try {
          // await ensureUserRolesTable(env) // Eliminado por redundancia, solo si falla el SELECT podríamos intentar crearla

          // 1. Obtener datos actuales del usuario de la BD
          let userData = await env.DB.prepare('SELECT * FROM user_roles WHERE user_id = ?').bind(user.uid).first()

          // 2. Determinar el rol (verificar si es super_admin por email)
          const effectiveEmail = (user.email && user.email !== 'unknown@example.com') ? user.email : (userData?.email || '')
          const role = await getUserRole(env, user.uid, effectiveEmail)

          // 3. Si el usuario NO existe, registrarlo
          if (!userData) {
            await ensureUserRolesTable(env) // Solo asegurar tabla si vamos a escribir
            await setUserRole(env, user.uid, role, 'activo', 1, user.email, user.displayName)
            // Recargar datos después de insertar
            userData = await env.DB.prepare('SELECT * FROM user_roles WHERE user_id = ?').bind(user.uid).first()
          } else {
            // Si existe, solo actualizar email/displayName si han cambiado y no son genéricos
            const newEmail = (user.email && user.email !== 'unknown@example.com') ? user.email : userData.email
            const newDisplayName = (user.displayName && user.displayName !== 'Anonimo') ? user.displayName : userData.displayName

            // Verificar si hay cambios reales antes de hacer UPDATE
            if (newEmail !== userData.email || newDisplayName !== userData.displayName) {
              await setUserRole(env, user.uid, role, userData.estado, 1, newEmail, newDisplayName)
              // Recargar datos actualizados
              userData = await env.DB.prepare('SELECT * FROM user_roles WHERE user_id = ?').bind(user.uid).first()
            }
          }

          return new Response(JSON.stringify({
            success: true,
            user: {
              uid: user.uid,
              email: userData?.email || user.email,
              displayName: userData?.displayName || user.displayName,
              role: userData?.role || role,
              estado: userData?.estado || 'activo',
              last_closed_date: userData?.last_closed_date,
              exists: true
            }
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          console.error('Error en /api/users/me:', error)
          return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }



      // POST /api/viaticos (verificar estado y crear_carpeta antes de permitir subir)
      if (path === '/api/viaticos' && request.method === 'POST') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        // Verificar si el usuario estÃ¡ activo
        const isActive = await isUserActive(env, user.uid, user.email)
        if (!isActive) {
          return new Response(JSON.stringify({ error: 'Tu cuenta ha sido desactivada. No puedes subir viÃ¡ticos.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Verificación de crear_carpeta eliminada


        const formData = await request.formData()
        const foto = formData.get('foto')
        const monto = formData.get('monto')
        const descripcion = formData.get('descripcion')
        const para = formData.get('para')
        const tipoComprobante = formData.get('tipo_comprobante')
        const numeroDocumento = formData.get('numero_documento')
        const numeroComprobante = formData.get('numero_comprobante')
        const queSustenta = 'VIATICO' // Default value

        // Por defecto, createTxt es true si no se especifica, o si el valor es '1'
        const createTxt = formData.get('createTxt') === null || formData.get('createTxt') === '1'

        // Lógica de FECHA ACTIVA (Cierre automático a las 10 AM)
        const now = new Date();
        const dateOptions = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
        const timeOptions = { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        const peruDateParts = new Intl.DateTimeFormat('es-PE', dateOptions).formatToParts(now);
        const peruTimeParts = new Intl.DateTimeFormat('es-PE', timeOptions).formatToParts(now);

        const getPart = (parts, type) => parts.find(p => p.type === type).value;

        const year = parseInt(getPart(peruDateParts, 'year'));
        const month = parseInt(getPart(peruDateParts, 'month')); // 1-12
        const day = parseInt(getPart(peruDateParts, 'day'));
        const hour = parseInt(getPart(peruTimeParts, 'hour'));

        // Fecha actual en Perú (YYYY-MM-DD)
        const todayString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

        // Fecha de ayer en Perú
        const yesterdayDate = new Date(year, month - 1, day - 1);
        const yesterdayString = `${yesterdayDate.getFullYear()}-${(yesterdayDate.getMonth() + 1).toString().padStart(2, '0')}-${yesterdayDate.getDate().toString().padStart(2, '0')}`;

        let activeDateString = todayString; // Por defecto hoy

        // Regla: Si es antes de las 10 AM, la fecha activa es AYER (automático)
        if (hour < 10) {
          activeDateString = yesterdayString;
        } else {
          // Después de las 10 AM, es hoy
          activeDateString = todayString;
        }

        // Admin override (Permitir fecha manual para admins)
        const isAdminUser = await isAdmin(env, user.uid, user.email);
        const fechaManual = formData.get('fecha_manual');
        if (isAdminUser && fechaManual) {
          // Validar formato YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(fechaManual)) {
            activeDateString = fechaManual;
          }
        }

        // Usar activeDateString para la base de datos y carpetas
        const dbFormattedDate = activeDateString; // YYYY-MM-DD

        // Reconstruir formattedDate (DD/MM/YYYY) para el TXT y display
        const [actYear, actMonth, actDay] = activeDateString.split('-');
        const formattedDate = `${actDay}/${actMonth}/${actYear}`;

        // formattedDateTime para nombre de archivos (usamos la fecha activa + hora actual)
        const formattedTime = new Intl.DateTimeFormat('es-PE', timeOptions).format(now);
        const formattedDateTime = `${activeDateString}_${formattedTime.replace(/:/g, '-')}`;

        if (!foto || !monto) {
          return new Response(JSON.stringify({ error: 'Datos incompletos: falta foto o monto.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Obtener todos los archivos (fotos/PDFs)
        const fotos = formData.getAll('foto');
        const uploadedFiles = [];
        const viaticoId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Carpeta base: viaticos/{YYYY-MM-DD}/{DisplayName}/{YYYY-MM-DD_HH-MM-SS}_{ViaticoID}
        // Usamos la fecha REAL para el nombre de la subcarpeta para ordenar correctamente
        const actualYear = getPart(peruDateParts, 'year');
        const actualMonth = getPart(peruDateParts, 'month');
        const actualDay = getPart(peruDateParts, 'day');
        const actualHour = getPart(peruTimeParts, 'hour');
        const actualMinute = getPart(peruTimeParts, 'minute');
        const actualSecond = getPart(peruTimeParts, 'second');

        const timestampPrefix = `${actualYear}-${actualMonth}-${actualDay}_${actualHour}-${actualMinute}-${actualSecond}`;
        const subfolderName = `${timestampPrefix}_${viaticoId}`;

        // Obtener displayName actualizado de la BD
        const dbUser = await env.DB.prepare('SELECT displayName FROM user_roles WHERE user_id = ?').bind(user.uid).first();
        const effectiveDisplayName = dbUser?.displayName || user.displayName || user.email.split('@')[0] || 'usuario';

        // Sanitizar nombre de usuario
        const safeDisplayName = effectiveDisplayName
          .replace(/[^a-zA-Z0-9\s._-]/g, '')
          .trim()
          .replace(/\s+/g, ' ')
          .substring(0, 50)
          .toUpperCase();

        // Path completo de la carpeta del viático
        const viaticoFolderPath = `viaticos/${dbFormattedDate}/${safeDisplayName}/${subfolderName}`;


        async function uploadToOneDrive(fileBuffer, fileName, mimeType, env, targetFolderPath) {
          const accessToken = await getOneDriveAccessToken(env);

          const fullPath = `${targetFolderPath}/${fileName}`;

          const response = await fetch(`https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/root:/${fullPath}:/content`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': mimeType,
            },
            body: fileBuffer
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error subiendo a OneDrive:', errorText);
            throw new Error(`Error subiendo a OneDrive: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          return {
            url: data.webUrl,
            id: data.id,
            folderPath: targetFolderPath
          };
        }

        async function createTxtFile(env, targetFolderPath, viaticoId, viaticoData) {
          const accessToken = await getOneDriveAccessToken(env);

          const txtFileName = `${viaticoId}_detalle.txt`;
          const fullPath = `${targetFolderPath}/${txtFileName}`;

          const txtContent = `
          DETALLE DE VIATICO
          ==================
          ID: ${viaticoId}
          Día: ${viaticoData.dia}
          Mes: ${viaticoData.mes}
          Año: ${viaticoData.año}
          Fecha: ${viaticoData.fecha}
          Para: ${viaticoData.para || 'N/A'}
          Que Sustenta: ${viaticoData.queSustenta}
          Trabajador: ${viaticoData.trabajador}
          Tipo Comp.: ${viaticoData.tipoComprobante || 'N/A'}
          N° Doc.: ${viaticoData.numeroDocumento || 'N/A'}
          N° Comp.: ${viaticoData.numeroComprobante || 'N/A'}
          Monto: S/ ${parseFloat(viaticoData.monto).toFixed(2)}
          Descripción: ${viaticoData.descripcion || '(Sin Descripción)'}
            `.trim();

          const response = await fetch(`https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/root:/${fullPath}:/content`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'text/plain',
            },
            body: txtContent
          });

          if (!response.ok) {
            console.error('Error creando TXT en OneDrive:', await response.text());
          }
        }
        try {
          // Procesar cada archivo
          for (const file of fotos) {
            const imageBuffer = await file.arrayBuffer()
            const mimeToExt = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' }
            // Nombre: random.ext (ya no necesitamos prefijo de hora porque está en la carpeta)
            const fileName = `${viaticoId}_${Math.random().toString(36).substr(2, 5)}${mimeToExt[file.type] || '.bin'}`

            const oneDriveData = await uploadToOneDrive(
              imageBuffer,
              fileName,
              file.type,
              env,
              viaticoFolderPath
            )

            uploadedFiles.push(oneDriveData.url);
          }

          // Crear el archivo TXT una sola vez
          if (createTxt) {
            await createTxtFile(env, viaticoFolderPath, viaticoId, {
              id: viaticoId,
              dia: formattedDate.split('/')[0],
              mes: formattedDate.split('/')[1],
              año: formattedDate.split('/')[2],
              fecha: formattedDate,
              para: formData.get('para'),
              queSustenta: 'VIATICO',
              trabajador: user.displayName || user.email,
              tipoComprobante: formData.get('tipo_comprobante'),
              numeroDocumento: formData.get('numero_documento'),
              numeroComprobante: formData.get('numero_comprobante'),
              monto: monto,
              descripcion: descripcion
            });
          }

          // Usar la URL del primer archivo como principal, o concatenarlas si se prefiere
          const mainUrl = uploadedFiles[0];
          const archivosMetadata = JSON.stringify(uploadedFiles);

          // Construir el path de la carpeta para guardarlo en DB
          // Guardamos el path de la carpeta del usuario en esa fecha
          // AHORA guardamos el path específico del viático
          const folderPath = viaticoFolderPath;

          await ensureViaticosTable(env)

          // Insertar en la base de datos incluyendo folder_path
          await env.DB.prepare(`INSERT INTO viaticos (id, usuario_id, fecha, para, que_sustenta, tipo_comprobante, numero_documento, numero_comprobante, monto, descripcion, folder_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(viaticoId, user.uid, dbFormattedDate, para || null, queSustenta, tipoComprobante || null, numeroDocumento || null, numeroComprobante || null, parseFloat(monto), descripcion || '', folderPath, getPeruDateTime(), getPeruDateTime())
            .run()

          return new Response(JSON.stringify({
            success: true,
            id: viaticoId,
            url_onedrive: mainUrl,
            folderPath: folderPath
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        } catch (error) {
          console.error('Error procesando viÃ¡tico:', error);
          return new Response(JSON.stringify({ error: error.message || 'Error procesando viÃ¡tico' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // POST /api/gastos (crear nuevo gasto)
      if (path === '/api/gastos' && request.method === 'POST') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const isActive = await isUserActive(env, user.uid, user.email)
        if (!isActive) {
          return new Response(JSON.stringify({ error: 'Tu cuenta ha sido desactivada.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const formData = await request.formData()
        const foto = formData.get('foto')
        const monto = formData.get('monto')
        const descripcion = formData.get('descripcion')
        const medioPago = formData.get('medio_pago')
        const entidad = formData.get('entidad')
        const numeroOperacion = formData.get('numero_operacion')

        // Campos fijos/calculados
        const de = 'FAMAVE'
        const motivo = 'VIATICO'
        const paraQuienImpuesto = user.displayName || user.email
        const mesSueldo = ''
        const codigoDevolucion = ''

        // Lógica de FECHA ACTIVA (Cierre automático a las 10 AM) - Igual que viaticos
        const now = new Date();
        const dateOptions = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
        const timeOptions = { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

        const peruDateParts = new Intl.DateTimeFormat('es-PE', dateOptions).formatToParts(now);
        const peruTimeParts = new Intl.DateTimeFormat('es-PE', timeOptions).formatToParts(now);

        const getPart = (parts, type) => parts.find(p => p.type === type).value;

        const year = parseInt(getPart(peruDateParts, 'year'));
        const month = parseInt(getPart(peruDateParts, 'month'));
        const day = parseInt(getPart(peruDateParts, 'day'));
        const hour = parseInt(getPart(peruTimeParts, 'hour'));

        const todayString = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const yesterdayDate = new Date(year, month - 1, day - 1);
        const yesterdayString = `${yesterdayDate.getFullYear()}-${(yesterdayDate.getMonth() + 1).toString().padStart(2, '0')}-${yesterdayDate.getDate().toString().padStart(2, '0')}`;

        let activeDateString = todayString;
        if (hour < 10) {
          activeDateString = yesterdayString;
        } else {
          activeDateString = todayString;
        }

        // Admin override
        const isAdminUser = await isAdmin(env, user.uid, user.email);
        const fechaManual = formData.get('fecha_manual');
        if (isAdminUser && fechaManual) {
          if (/^\d{4}-\d{2}-\d{2}$/.test(fechaManual)) {
            activeDateString = fechaManual;
          }
        }

        const dbFormattedDate = activeDateString;
        const [actYear, actMonth, actDay] = activeDateString.split('-');
        const formattedDate = `${actDay}/${actMonth}/${actYear}`;

        if (!foto || !monto) {
          return new Response(JSON.stringify({ error: 'Datos incompletos: falta foto o monto.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const fotos = formData.getAll('foto');
        const uploadedFiles = [];
        const gastoId = `g_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Carpeta base: gastos/{YYYY-MM-DD}/{DisplayName}/{YYYY-MM-DD_HH-MM-SS}_{GastoID}
        const actualYear = getPart(peruDateParts, 'year');
        const actualMonth = getPart(peruDateParts, 'month');
        const actualDay = getPart(peruDateParts, 'day');
        const actualHour = getPart(peruTimeParts, 'hour');
        const actualMinute = getPart(peruTimeParts, 'minute');
        const actualSecond = getPart(peruTimeParts, 'second');

        const timestampPrefix = `${actualYear}-${actualMonth}-${actualDay}_${actualHour}-${actualMinute}-${actualSecond}`;
        const subfolderName = `${timestampPrefix}_${gastoId}`;

        // Obtener displayName actualizado de la BD
        const dbUser = await env.DB.prepare('SELECT displayName FROM user_roles WHERE user_id = ?').bind(user.uid).first();
        const effectiveDisplayName = dbUser?.displayName || user.displayName || user.email.split('@')[0] || 'usuario';

        const safeDisplayName = effectiveDisplayName
          .replace(/[^a-zA-Z0-9\s._-]/g, '')
          .trim()
          .replace(/\s+/g, ' ')
          .substring(0, 50)
          .toUpperCase();

        let gastoFolderPath = `gastos/${dbFormattedDate}/${safeDisplayName}/${subfolderName}`;

        // Si existe el ID de carpeta, ajustamos el path para que sea relativo a esa carpeta (quitamos 'gastos/')
        if (env.ONEDRIVE_GASTOS_FOLFER_ID) {
          gastoFolderPath = `${dbFormattedDate}/${safeDisplayName}/${subfolderName}`;
        }

        async function uploadToOneDrive(fileBuffer, fileName, mimeType, env, targetFolderPath) {
          const accessToken = await getOneDriveAccessToken(env);
          const fullPath = `${targetFolderPath}/${fileName}`;

          let url = `https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/root:/${fullPath}:/content`;

          // Si tenemos el ID de la carpeta de GASTOS, usamos ese ID como raíz
          if (env.ONEDRIVE_GASTOS_FOLFER_ID) {
            url = `https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/items/${env.ONEDRIVE_GASTOS_FOLFER_ID}:/${fullPath}:/content`;
          }

          const response = await fetch(url, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': mimeType,
            },
            body: fileBuffer
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Error subiendo a OneDrive:', errorText);
            throw new Error(`Error subiendo a OneDrive: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          return {
            url: data.webUrl,
            id: data.id,
            folderPath: targetFolderPath
          };
        }

        try {
          for (const file of fotos) {
            const imageBuffer = await file.arrayBuffer()
            const mimeToExt = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' }
            const fileName = `${gastoId}_${Math.random().toString(36).substr(2, 5)}${mimeToExt[file.type] || '.bin'}`

            const oneDriveData = await uploadToOneDrive(
              imageBuffer,
              fileName,
              file.type,
              env,
              gastoFolderPath
            )
            uploadedFiles.push(oneDriveData.url);
          }

          // Crear TXT con detalle
          const txtFileName = `${gastoId}_detalle.txt`;
          const txtContent = `
          DETALLE DE GASTO
          ================
          ID: ${gastoId}
          Fecha: ${formattedDate}
          De: ${de}
          Motivo: ${motivo}
          Para (Impuesto): ${paraQuienImpuesto}
          Medio Pago: ${medioPago || 'N/A'}
          Entidad: ${entidad || 'N/A'}
          N° Operación: ${numeroOperacion || 'N/A'}
          Monto: S/ ${parseFloat(monto).toFixed(2)}
          Descripción: ${descripcion || '(Sin Descripción)'}
          `.trim();

          const accessToken = await getOneDriveAccessToken(env);

          let txtUrl = `https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/root:/${gastoFolderPath}/${txtFileName}:/content`;
          if (env.ONEDRIVE_GASTOS_FOLFER_ID) {
            txtUrl = `https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/items/${env.ONEDRIVE_GASTOS_FOLFER_ID}:/${gastoFolderPath}/${txtFileName}:/content`;
          }

          await fetch(txtUrl, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'text/plain' },
            body: txtContent
          }).catch(e => console.error('Error creando TXT:', e));

          const mainUrl = uploadedFiles[0];

          await ensureGastosTable(env)

          await env.DB.prepare(`INSERT INTO gastos (id, usuario_id, fecha, de, motivo, para_quien_impuesto, mes_sueldo, codigo_devolucion, medio_pago, entidad, numero_operacion, monto, descripcion, folder_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(gastoId, user.uid, dbFormattedDate, de, motivo, paraQuienImpuesto, mesSueldo, codigoDevolucion, medioPago || null, entidad || null, numeroOperacion || null, parseFloat(monto), descripcion || '', gastoFolderPath, getPeruDateTime(), getPeruDateTime())
            .run()

          return new Response(JSON.stringify({
            success: true,
            id: gastoId,
            url_onedrive: mainUrl,
            folderPath: gastoFolderPath
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        } catch (error) {
          console.error('Error procesando gasto:', error);
          return new Response(JSON.stringify({ error: error.message || 'Error procesando gasto' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // GET /api/gastos (listar gastos del usuario)
      if (path === '/api/gastos' && request.method === 'GET') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        try {
          await ensureGastosTable(env)

          // Si es admin/super_admin ve todo? O solo lo suyo? "Mis Gastos" implica lo suyo.
          // Pero el usuario pidió "Mis Gastos". Asumo que es solo para el usuario logueado.
          // Si quisieran ver todo, sería otro endpoint o filtro.

          const results = await env.DB.prepare('SELECT * FROM gastos WHERE usuario_id = ? ORDER BY fecha DESC, created_at DESC').bind(user.uid).all()

          return new Response(JSON.stringify({
            success: true,
            gastos: results.results || []
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // GET /api/gastos/all (listar TODOS los gastos - solo admin)
      if (path === '/api/gastos/all' && request.method === 'GET') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        const user = await verifyFirebaseToken(token, env)
        if (!user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        if (!(await isAdmin(env, user.uid, user.email))) return new Response(JSON.stringify({ error: 'No tienes permisos de administrador' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        try {
          await ensureGastosTable(env)
          const results = await env.DB.prepare('SELECT * FROM gastos ORDER BY fecha DESC, created_at DESC').all()
          return new Response(JSON.stringify({
            success: true,
            gastos: results.results || []
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // DELETE /api/gastos/:id (eliminar gasto y archivos - admin o propio usuario)
      if (path.startsWith('/api/gastos/') && request.method === 'DELETE') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const gastoId = path.split('/').pop();

        try {
          const gasto = await env.DB.prepare('SELECT * FROM gastos WHERE id = ?').bind(gastoId).first();

          if (!gasto) {
            return new Response(JSON.stringify({ error: 'Gasto no encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          const isOwner = gasto.usuario_id === user.uid;
          const isUserAdmin = await isAdmin(env, user.uid, user.email);

          if (!isOwner && !isUserAdmin) {
            return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          if (!isUserAdmin) {
            const gastoDate = new Date(gasto.fecha + 'T00:00:00-05:00');
            const cutoffDate = new Date(gastoDate);
            cutoffDate.setDate(cutoffDate.getDate() + 1);
            cutoffDate.setHours(10, 0, 0, 0);

            const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }));

            if (now > cutoffDate) {
              return new Response(JSON.stringify({ error: 'El tiempo límite para eliminar este gasto ha expirado (10:00 AM del día siguiente).' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
          }

          try {
            const accessToken = await getOneDriveAccessToken(env);
            if (gasto.folder_path) {
              const isDedicatedSubfolder = gasto.folder_path.split('/').pop().includes(gastoId);

              let deleteUrl = `https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/root:/${gasto.folder_path}`;
              if (env.ONEDRIVE_GASTOS_FOLFER_ID) {
                deleteUrl = `https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/items/${env.ONEDRIVE_GASTOS_FOLFER_ID}:/${gasto.folder_path}`;
              }

              if (isDedicatedSubfolder) {
                const deleteResponse = await fetch(deleteUrl, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (deleteResponse.ok || deleteResponse.status === 404) {
                  // Check parent folder logic if needed, but for now just deleting the dedicated folder is enough
                } else {
                  console.error('Error borrando carpeta de gasto:', await deleteResponse.text());
                }
              }
            }
          } catch (onedriveError) {
            console.error('Error eliminando de OneDrive (continuando con DB):', onedriveError);
          }

          await env.DB.prepare('DELETE FROM gastos WHERE id = ?').bind(gastoId).run();

          return new Response(JSON.stringify({ success: true, message: 'Gasto eliminado correctamente' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message || 'Error eliminando gasto' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // PUT /api/gastos/:id (actualizar gasto - admin o propio usuario)
      if (path.startsWith('/api/gastos/') && request.method === 'PUT') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const gastoId = path.split('/').pop();

        try {
          const formData = await request.json();
          const gasto = await env.DB.prepare('SELECT * FROM gastos WHERE id = ?').bind(gastoId).first();

          if (!gasto) {
            return new Response(JSON.stringify({ error: 'Gasto no encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          const isOwner = gasto.usuario_id === user.uid;
          const isUserAdmin = await isAdmin(env, user.uid, user.email);

          if (!isOwner && !isUserAdmin) {
            return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          if (!isUserAdmin) {
            const gastoDate = new Date(gasto.fecha + 'T00:00:00-05:00');
            const cutoffDate = new Date(gastoDate);
            cutoffDate.setDate(cutoffDate.getDate() + 1);
            cutoffDate.setHours(10, 0, 0, 0);

            const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }));

            if (now > cutoffDate) {
              return new Response(JSON.stringify({ error: 'El tiempo límite para editar este gasto ha expirado (10:00 AM del día siguiente).' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
          }

          const updates = [];
          const values = [];

          if (formData.fecha !== undefined) { updates.push('fecha = ?'); values.push(formData.fecha); }
          if (formData.monto !== undefined) { updates.push('monto = ?'); values.push(parseFloat(formData.monto)); }
          if (formData.descripcion !== undefined) { updates.push('descripcion = ?'); values.push(formData.descripcion); }
          if (formData.medio_pago !== undefined) { updates.push('medio_pago = ?'); values.push(formData.medio_pago); }
          if (formData.entidad !== undefined) { updates.push('entidad = ?'); values.push(formData.entidad); }
          if (formData.numero_operacion !== undefined) { updates.push('numero_operacion = ?'); values.push(formData.numero_operacion); }

          updates.push('updated_at = ?');
          values.push(getPeruDateTime());

          if (updates.length > 1) { // At least one field + updated_at
            values.push(gastoId);
            await env.DB.prepare(`UPDATE gastos SET ${updates.join(', ')} WHERE id = ?`)
              .bind(...values)
              .run();
          }

          return new Response(JSON.stringify({ success: true, message: 'Gasto actualizado correctamente' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message || 'Error actualizando gasto' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // DELETE /api/viaticos/:id (eliminar viÃ¡tico y archivos - admin o propio usuario)
      if (path.startsWith('/api/viaticos/') && request.method === 'DELETE') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const viaticoId = path.split('/').pop();

        try {
          // Obtener info del viÃ¡tico para saber quÃ© borrar y verificar propiedad
          const viatico = await env.DB.prepare('SELECT * FROM viaticos WHERE id = ?').bind(viaticoId).first();

          if (!viatico) {
            return new Response(JSON.stringify({ error: 'ViÃ¡tico no encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          // Verificar permisos: admin o dueÃ±o del viÃ¡tico
          const isOwner = viatico.usuario_id === user.uid;
          const isUserAdmin = await isAdmin(env, user.uid, user.email);

          if (!isOwner && !isUserAdmin) {
            return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          // Enforce 10 AM cutoff for non-admins
          if (!isUserAdmin) {
            const viaticoDate = new Date(viatico.fecha + 'T00:00:00-05:00'); // Assuming stored as YYYY-MM-DD
            const cutoffDate = new Date(viaticoDate);
            cutoffDate.setDate(cutoffDate.getDate() + 1); // Next day
            cutoffDate.setHours(10, 0, 0, 0); // 10:00 AM

            const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }));

            if (now > cutoffDate) {
              return new Response(JSON.stringify({ error: 'El tiempo límite para eliminar este viático ha expirado (10:00 AM del día siguiente).' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
          }

          // Intentar borrar de OneDrive
          try {
            const accessToken = await getOneDriveAccessToken(env);

            if (viatico.folder_path) {
              // folder_path ahora es la carpeta compartida del usuario en esa fecha: viaticos/YYYY-MM-DD/User
              // NO podemos borrar la carpeta entera porque puede tener otros viáticos.
              // Debemos buscar archivos que contengan el viaticoId y borrarlos.

              // NUEVA LÓGICA: Verificar si es una subcarpeta dedicada
              // Si el folder_path termina con el viaticoId (o contiene el timestamp_id), es una subcarpeta dedicada
              const isDedicatedSubfolder = viatico.folder_path.split('/').pop().includes(viaticoId);

              if (isDedicatedSubfolder) {
                // Borrar la carpeta entera del viático
                const deleteUrl = `https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/root:/${viatico.folder_path}`;
                const deleteResponse = await fetch(deleteUrl, {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (deleteResponse.ok || deleteResponse.status === 404) {
                  // Si se borró correctamente, verificar si la carpeta padre (Usuario) quedó vacía
                  const parentPath = viatico.folder_path.split('/').slice(0, -1).join('/');

                  const listParentUrl = `https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/root:/${parentPath}:/children`;
                  const listParentResponse = await fetch(listParentUrl, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                  });

                  if (listParentResponse.ok) {
                    const parentData = await listParentResponse.json();
                    if (parentData.value && parentData.value.length === 0) {
                      // Carpeta padre vacía, borrarla también
                      const deleteParentUrl = `https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/root:/${parentPath}`;
                      await fetch(deleteParentUrl, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                      });
                    }
                  }
                } else {
                  console.error('Error borrando carpeta de viático:', await deleteResponse.text());
                }

              } else {
                // LÓGICA ANTIGUA (Retrocompatibilidad): Borrar archivos individuales por ID
                const listUrl = `https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/root:/${viatico.folder_path}:/children`;
                const listResponse = await fetch(listUrl, {
                  headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (listResponse.ok) {
                  const data = await listResponse.json();
                  const files = data.value || [];

                  // Filtrar archivos que pertenecen a este viático
                  const filesToDelete = files.filter(f => f.name.includes(viaticoId));

                  // Borrar cada archivo encontrado
                  await Promise.all(filesToDelete.map(async (file) => {
                    const deleteUrl = `https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/items/${file.id}`;
                    await fetch(deleteUrl, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                  }));
                }
              }
            }
          } catch (onedriveError) {
            console.error('Error eliminando de OneDrive (continuando con DB):', onedriveError);
          }

          // Borrar de la base de datos
          await env.DB.prepare('DELETE FROM viaticos WHERE id = ?').bind(viaticoId).run();

          return new Response(JSON.stringify({ success: true, message: 'ViÃ¡tico eliminado correctamente' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message || 'Error eliminando viÃ¡tico' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // PUT /api/viaticos/:id (actualizar viÃ¡tico - admin o propio usuario)
      if (path.startsWith('/api/viaticos/') && request.method === 'PUT') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const viaticoId = path.split('/').pop();

        try {
          const formData = await request.json(); // Esperamos JSON para actualizaciones simples

          // Obtener viÃ¡tico existente
          const viatico = await env.DB.prepare('SELECT * FROM viaticos WHERE id = ?').bind(viaticoId).first();

          if (!viatico) {
            return new Response(JSON.stringify({ error: 'ViÃ¡tico no encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          // Verificar permisos
          const isOwner = viatico.usuario_id === user.uid;
          const isUserAdmin = await isAdmin(env, user.uid, user.email);

          if (!isOwner && !isUserAdmin) {
            return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          // Enforce 10 AM cutoff for non-admins
          if (!isUserAdmin) {
            const viaticoDate = new Date(viatico.fecha + 'T00:00:00-05:00');
            const cutoffDate = new Date(viaticoDate);
            cutoffDate.setDate(cutoffDate.getDate() + 1); // Next day
            cutoffDate.setHours(10, 0, 0, 0); // 10:00 AM

            const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }));

            if (now > cutoffDate) {
              return new Response(JSON.stringify({ error: 'El tiempo límite para editar este viático ha expirado (10:00 AM del día siguiente).' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
          }

          // Campos actualizables
          const updates = [];
          const values = [];

          if (formData.fecha !== undefined) { updates.push('fecha = ?'); values.push(formData.fecha); }
          if (formData.monto !== undefined) { updates.push('monto = ?'); values.push(parseFloat(formData.monto)); }
          if (formData.descripcion !== undefined) { updates.push('descripcion = ?'); values.push(formData.descripcion); }
          if (formData.para !== undefined) { updates.push('para = ?'); values.push(formData.para); }
          if (formData.que_sustenta !== undefined) { updates.push('que_sustenta = ?'); values.push(formData.que_sustenta); }
          if (formData.tipo_comprobante !== undefined) { updates.push('tipo_comprobante = ?'); values.push(formData.tipo_comprobante); }
          if (formData.numero_documento !== undefined) { updates.push('numero_documento = ?'); values.push(formData.numero_documento); }
          if (formData.numero_comprobante !== undefined) { updates.push('numero_comprobante = ?'); values.push(formData.numero_comprobante); }

          updates.push('updated_at = ?');
          values.push(getPeruDateTime());

          if (updates.length > 1) { // Al menos updated_at siempre estÃ¡
            const query = `UPDATE viaticos SET ${updates.join(', ')} WHERE id = ?`;
            values.push(viaticoId);
            await env.DB.prepare(query).bind(...values).run();
          }

          return new Response(JSON.stringify({ success: true, message: 'ViÃ¡tico actualizado correctamente' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (error) {
          console.error('Error actualizando viÃ¡tico:', error);
          return new Response(JSON.stringify({ success: false, error: error.message || 'Error actualizando viÃ¡tico' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // GET /api/viaticos/all (todos los viÃ¡ticos - solo admin)
      if (path === '/api/viaticos/all' && request.method === 'GET') {
        if (!token) {
          return new Response(JSON.stringify({ error: 'No autorizado' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!(await isAdmin(env, user.uid, user.email))) {
          return new Response(JSON.stringify({ error: 'Acceso denegado' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          // await ensureViaticosTable(env); // Eliminado por redundancia

          const sql = `
            SELECT
              id,
              usuario_id,
              fecha,
              para,
              que_sustenta,
              tipo_comprobante,
              numero_documento,
              numero_comprobante,
              monto,
              descripcion,
              folder_path,
              created_at,
              updated_at
            FROM viaticos
            ORDER BY fecha DESC, created_at DESC
          `;

          const rows = await env.DB.prepare(sql).all();

          // Ya viene ordenado por SQL
          const viaticos = rows.results || [];

          return new Response(JSON.stringify({ success: true, viaticos }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (error) {
          console.error('Error en GET /api/viaticos/all:', error);
          return new Response(
            JSON.stringify({
              success: false,
              error: error.message || 'Error obteniendo viÃ¡ticos'
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }
      if (path === '/api/viaticos/mis-viaticos' && request.method === 'GET') {
        if (!token) {
          return new Response(JSON.stringify({ error: 'No autorizado' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          // Obtener usuario Firebase
          const user = await verifyFirebaseToken(token, env);
          if (!user) {
            return new Response(JSON.stringify({ error: 'Token invÃ¡lido' }), {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          await ensureViaticosTable(env);



          const rows = await env.DB.prepare(`
            SELECT 
              id, usuario_id, fecha, para, que_sustenta, tipo_comprobante, 
              numero_documento, numero_comprobante, monto, descripcion, 
              folder_path, created_at, updated_at 
            FROM viaticos 
            WHERE usuario_id = ?
          `).bind(user.uid).all();

          let viaticos = (rows.results || []).map(v => ({
            id: v.id,
            usuario_id: v.usuario_id,
            fecha: v.fecha,
            para: v.para,
            que_sustenta: v.que_sustenta,
            tipo_comprobante: v.tipo_comprobante,
            numero_documento: v.numero_documento,
            numero_comprobante: v.numero_comprobante,
            monto: v.monto,
            descripcion: v.descripcion,
            folder_path: v.folder_path,
            created_at: v.created_at,
            updated_at: v.updated_at
          }));

          viaticos = viaticos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

          return new Response(JSON.stringify({ success: true, viaticos }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        } catch (error) {
          console.error('Error en GET /api/viaticos/mis-viaticos:', error);

          return new Response(JSON.stringify({
            success: true,
            viaticos: [],
            error_diagnostico: error.message
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }


      // GET /api/users/me (verificar estado del usuario actual)
      if (path === '/api/users/me' && request.method === 'GET') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        // Verificar si el usuario estÃ¡ activo
        const isActive = await isUserActive(env, user.uid, user.email)
        if (!isActive) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Tu cuenta ha sido desactivada. Contacta al administrador.'
          }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Intentar obtener email de la BD si no viene en el token
        let userData = await env.DB.prepare('SELECT estado, email, displayName FROM user_roles WHERE user_id = ?').bind(user.uid).first()

        const effectiveEmail = (user.email && user.email !== 'unknown@example.com') ? user.email : (userData?.email || '')
        const role = await getUserRole(env, user.uid, effectiveEmail)

        if (!userData) {
          await setUserRole(env, user.uid, role, 'activo', 1, user.email, user.displayName)
        } else {
          // No sobrescribir email/displayName si ya existen en BD (prioridad a lo manual)
          // Solo actualizar si en BD es nulo/genérico y el token trae algo mejor
          const dbNameValid = userData.displayName && userData.displayName !== 'Anonimo';
          const tokenNameValid = user.displayName && user.displayName !== 'Anonimo';
          // Si ya es válido en BD, pasamos null para NO actualizar (y evitar sobrescribir con data stale)
          // Si no es válido en BD, usamos el del token o 'Anonimo'
          const newDisplayName = dbNameValid ? null : (tokenNameValid ? user.displayName : 'Anonimo');

          const dbEmailValid = userData.email && userData.email !== 'unknown@example.com';
          const tokenEmailValid = user.email && user.email !== 'unknown@example.com';
          const newEmail = dbEmailValid ? null : (tokenEmailValid ? user.email : 'unknown@example.com');

          await setUserRole(env, user.uid, role, userData.estado, 1, newEmail, newDisplayName)
        }

        // Recargar datos actualizados
        userData = await env.DB.prepare('SELECT estado, email, displayName FROM user_roles WHERE user_id = ?').bind(user.uid).first()

        return new Response(JSON.stringify({
          success: true,
          user: {
            uid: user.uid,
            email: userData?.email || user.email,
            displayName: userData?.displayName || user.displayName,
            role,
            estado: userData?.estado || 'activo'
          }
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // GET /api/users (actualizar para incluir nuevos campos)
      if (path === '/api/users' && request.method === 'GET') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        if (!(await isAdmin(env, user.uid, user.email))) return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        if (!(await isAdmin(env, user.uid, user.email))) return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        // ensureUserRolesTable(env) - Eliminado por redundancia, se asume creado al inicio o en login

        // CORREGIDO: Usar SELECT explícito en lugar de SELECT * para evitar problemas
        const rows = await env.DB.prepare(`
          SELECT 
            user_id, 
            role, 
            estado, 
            email, 
            displayName, 
            created_at, 
            updated_at 
          FROM user_roles 
          ORDER BY created_at DESC
        `).all()

        const superAdminEmail = (env.SUPER_ADMIN_EMAIL || '').toLowerCase()
        const filteredUsers = []
        let countWithoutSuperAdmin = 0

        for (const u of rows.results) {
          if (u.user_id === 'anonymous' || u.user_id === 'dev-user' || u.user_id.startsWith('dev-')) {
            continue
          }

          // CORREGIDO: Verificar super_admin por email o por role
          // Si el email coincide con SUPER_ADMIN_EMAIL o el role es super_admin, no contarlo
          const userEmail = u.email?.toLowerCase() || ''
          const isSuperAdmin = (superAdminEmail && userEmail === superAdminEmail) || u.role === 'super_admin'

          // Si no es super_admin, contarlo
          if (!isSuperAdmin) {
            countWithoutSuperAdmin++
          }

          filteredUsers.push({
            uid: u.user_id,
            email: u.email || `${u.user_id.substring(0, 8)}@unknown.com`,
            displayName: u.displayName || null,
            role: u.role,
            estado: u.estado || 'activo'
          })
        }

        return new Response(JSON.stringify({
          success: true,
          users: filteredUsers,
          count: countWithoutSuperAdmin
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }




      // PUT /api/users/:uid/role (actualizar rol - solo admin)
      if (path.match(/\/api\/users\/[^/]+\/role$/) && request.method === 'PUT') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const parts = path.split('/')
        const targetUid = parts[parts.length - 2] // .../users/:uid/role

        const user = await verifyFirebaseToken(token, env)
        if (!user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        // Solo admin puede cambiar roles
        if (!(await isAdmin(env, user.uid, user.email))) return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        try {
          const body = await request.json()
          const { role } = body

          if (!role) return new Response(JSON.stringify({ error: 'Rol requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

          // Usar la función helper setUserRole (que ya existe)
          // Nota: setUserRole requiere (env, uid, role, estado, crearCarpeta, email, displayName)
          // Pero aquí solo queremos actualizar el rol.
          // Mejor hacemos un UPDATE directo para no sobrescribir otros campos accidentalmente

          await env.DB.prepare('UPDATE user_roles SET role = ?, updated_at = ? WHERE user_id = ?')
            .bind(role, getPeruDateTime(), targetUid)
            .run()

          return new Response(JSON.stringify({ success: true, message: 'Rol actualizado' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // PUT /api/users/:uid/status (actualizar estado - solo admin)
      if (path.match(/\/api\/users\/[^/]+\/status$/) && request.method === 'PUT') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const parts = path.split('/')
        const targetUid = parts[parts.length - 2]

        const user = await verifyFirebaseToken(token, env)
        if (!user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        if (!(await isAdmin(env, user.uid, user.email))) return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        try {
          const body = await request.json()
          const { estado } = body

          if (!estado) return new Response(JSON.stringify({ error: 'Estado requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

          await setUserStatus(env, targetUid, estado)

          return new Response(JSON.stringify({ success: true, message: 'Estado actualizado' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // PUT /api/users/:uid (actualizar usuario - solo admin)
      // Asegurarse de que NO coincida con /role o /status
      if (path.startsWith('/api/users/') && request.method === 'PUT' && !path.endsWith('/role') && !path.endsWith('/status')) {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const targetUid = path.split('/').pop()
        const user = await verifyFirebaseToken(token, env)
        if (!user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        if (!(await isAdmin(env, user.uid, user.email))) return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        try {
          const body = await request.json()
          const { displayName } = body

          if (!displayName) {
            return new Response(JSON.stringify({ error: 'Nombre es requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          // Verificar si el usuario existe
          const existingUser = await env.DB.prepare('SELECT * FROM user_roles WHERE user_id = ?').bind(targetUid).first()
          if (!existingUser) {
            return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          await env.DB.prepare('UPDATE user_roles SET displayName = ?, updated_at = ? WHERE user_id = ?')
            .bind(displayName, getPeruDateTime(), targetUid)
            .run()

          return new Response(JSON.stringify({
            success: true,
            message: 'Usuario actualizado correctamente'
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // GET /api/config/super-admin-email
      if (path === '/api/config/super-admin-email' && request.method === 'GET') {

        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        return new Response(JSON.stringify({
          success: true,
          superAdminEmail: env.SUPER_ADMIN_EMAIL || null
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // GET /api/config - Get all configuration (super admin only)
      if (path === '/api/config' && request.method === 'GET') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const user = await verifyFirebaseToken(token)
        if (!user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const isSA = await isSuperAdmin(env, user.uid, user.email)
        if (!isSA) return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        try {
          const configs = await env.DB.prepare('SELECT key, value, description, updated_at, updated_by FROM config').all()
          return new Response(JSON.stringify({
            success: true,
            configs: configs.results || []
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // PUT /api/config - Update configuration (super admin only)
      if (path === '/api/config' && request.method === 'PUT') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const user = await verifyFirebaseToken(token)
        if (!user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        const isSA = await isSuperAdmin(env, user.uid, user.email)
        if (!isSA) return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        try {
          const body = await request.json()
          const { key, value } = body

          if (!key || value === undefined) {
            return new Response(JSON.stringify({ error: 'Key y value son requeridos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          await env.DB.prepare(
            'UPDATE config SET value = ?, updated_at = ?, updated_by = ? WHERE key = ?'
          ).bind(value, getPeruDateTime(), user.email, key).run()

          return new Response(JSON.stringify({
            success: true,
            message: 'Configuración actualizada'
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }



      return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } catch (error) {
      console.error('Error:', error)
      return new Response(JSON.stringify({ error: error.message || 'Error interno del servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  },
}
