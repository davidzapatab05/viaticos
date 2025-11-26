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

          console.log('Firebase user data:', {
            uid: user.localId || user.uid || decodedToken?.uid,
            email,
            displayName,
            providerUserInfo: user.providerUserInfo
          })

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
    return true // Por defecto permitir acceso si hay error
  }
}

async function setUserRole(env, uid, role, estado = 'activo', crearCarpeta = 1, email = null, displayName = null) {
  try {
    await env.DB.prepare(
      `INSERT INTO user_roles (user_id, role, estado, crear_carpeta, email, displayName, updated_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         role = excluded.role,
         estado = COALESCE(excluded.estado, estado),
         crear_carpeta = COALESCE(excluded.crear_carpeta, crear_carpeta),
         email = excluded.email,
         displayName = excluded.displayName,
         updated_at = ?`
    ).bind(uid, role, estado, crearCarpeta, email, displayName, getPeruDateTime(), getPeruDateTime(), getPeruDateTime()).run()
    return true
  } catch (e) {
    console.error('Error estableciendo rol:', e)
    console.error('Detalles:', { uid, role, estado, crearCarpeta, email, displayName })
    return false
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

// Actualizar flag de crear carpeta
async function setUserCreateFolder(env, uid, crearCarpeta) {
  try {
    await env.DB.prepare(
      `UPDATE user_roles SET crear_carpeta = ?, updated_at = ? WHERE user_id = ?`
    ).bind(crearCarpeta ? 1 : 0, getPeruDateTime(), uid).run()
    return true
  } catch (e) { console.error('Error actualizando crear_carpeta:', e); return false }
}

async function isAdmin(env, uid, email = '') {
  if (!(await isUserActive(env, uid, email))) return false
  return ['admin', 'super_admin'].includes(await getUserRole(env, uid, email))
}

async function isSuperAdmin(env, uid, email = '') {
  if (!(await isUserActive(env, uid, email))) return false
  return (await getUserRole(env, uid, email)) === 'super_admin'
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
      console.log("Creando tabla viaticos (no existÃ­a)");

      await env.DB.prepare(
        `CREATE TABLE viaticos (
          id TEXT PRIMARY KEY,
          usuario_id TEXT NOT NULL,
          fecha TEXT NOT NULL,
          tipo TEXT NOT NULL,
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


async function ensureUserRolesTable(env) {
  try {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS user_roles (
         user_id TEXT PRIMARY KEY,
         role TEXT NOT NULL DEFAULT 'usuario',
         estado TEXT DEFAULT 'activo',
         crear_carpeta INTEGER DEFAULT 1,
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
      await env.DB.prepare(`ALTER TABLE user_roles ADD COLUMN crear_carpeta INTEGER DEFAULT 1`).run()
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

/**
 * Asegurar que la carpeta del usuario existe, crearla si no existe
 * Formato: nombre_completo_uid (ej: Juan_Perez_abc123xyz)
 */
async function ensureUserOneDriveFolder(accessToken, userDisplayName, userEmail, userId, subFolderPath = null) {
  try {
    // CORREGIDO: No intentar crear carpeta base /viaticos explÃ­citamente
    // OneDrive personal crearÃ¡ las carpetas automÃ¡ticamente al subir archivos

    // Obtener nombre completo del usuario para la carpeta
    let userFolderName = ''

    // Prioridad: displayName completo > email completo (sin @) > email sin dominio > userId
    if (userDisplayName && userDisplayName.trim() && userDisplayName !== 'Anonimo' && userDisplayName !== 'UsuarioDev') {
      userFolderName = userDisplayName.trim()
    } else if (userEmail && userEmail !== 'unknown@example.com') {
      // Usar el email completo pero sin el @ y dominio
      const emailParts = userEmail.split('@')
      userFolderName = emailParts[0] || userEmail
    } else {
      userFolderName = `usuario`
    }

    // Limpiar el nombre: mantener caracteres vÃ¡lidos, espacios a guiones bajos
    userFolderName = userFolderName
      .replace(/[^a-zA-Z0-9\s._-]/g, '') // Eliminar caracteres especiales excepto puntos, guiones y guiones bajos
      .trim()
      .replace(/\s+/g, '_') // Espacios a guiones bajos
      .replace(/_{2,}/g, '_') // MÃºltiples guiones bajos a uno solo
      .substring(0, 40) // Limitar longitud para dejar espacio al UID

    // Si despuÃ©s de limpiar estÃ¡ vacÃ­o, usar un nombre por defecto
    if (!userFolderName || userFolderName.length === 0) {
      userFolderName = `usuario`
    }

    // AGREGAR UID al final del nombre para identificaciÃ³n Ãºnica
    // Formato: nombre_completo_uid (ej: Juan_Perez_abc123xyz)
    const uidShort = userId.substring(0, 8) // Primeros 8 caracteres del UID
    userFolderName = `${userFolderName}_${uidShort}`

    let folderPath = `viaticos/${userFolderName}`;
    if (subFolderPath) {
      folderPath = `viaticos/${subFolderPath}`; // Usar subFolderPath completo si se proporciona
    }

    // CORREGIDO: Intentar crear la carpeta, pero si falla (SPO license), no lanzar error
    // La carpeta se crearÃ¡ automÃ¡ticamente cuando se suba el primer archivo
    const folderId = await createOneDriveFolder(accessToken, folderPath)

    // Si no se pudo crear, retornar Ã©xito de todas formas (se crearÃ¡ al subir archivo)
    return {
      success: true,
      folderId: folderId || null,
      folderPath: folderPath,
      folderName: userFolderName,
      message: folderId ? 'Carpeta verificada/creada' : 'Carpeta se crearÃ¡ al subir el primer archivo'
    }
  } catch (error) {
    console.error('Error asegurando carpeta del usuario:', error)
    // NO lanzar error - retornar Ã©xito de todas formas
    // La carpeta se crearÃ¡ automÃ¡ticamente cuando se suba el primer archivo
    const uidShort = userId.substring(0, 8)
    const userFolderName = (userDisplayName || userEmail?.split('@')[0] || 'usuario')
      .replace(/[^a-zA-Z0-9\s._-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .substring(0, 40) || 'usuario'

    let folderPath = `viaticos/${userFolderName}_${uidShort}`;
    if (subFolderPath) {
      folderPath = `viaticos/${subFolderPath}`;
    }

    return {
      success: true,
      folderId: null,
      folderPath: folderPath,
      folderName: `${userFolderName}_${uidShort}`,
      message: 'Carpeta se crearÃ¡ automÃ¡ticamente al subir el primer archivo'
    }
  }
}

/**
 * Eliminar carpeta de OneDrive personal
 * Busca la carpeta usando el UID del usuario
 */
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

  const datedFolderPath = dateTimeFolder ? `${userFolderName}/${dateTimeFolder}` : userFolderName;
  const fullPath = `viaticos/${datedFolderPath}`;

  // Asegurar que la carpeta existe antes de subir (incluyendo la subcarpeta de fecha/hora)
  await ensureUserOneDriveFolder(accessToken, displayName, userEmail, userId, datedFolderPath).catch(() => {
    // Si falla, continuar de todas formas - OneDrive crearÃ¡ la carpeta al subir el archivo
    console.warn('No se pudo asegurar carpeta, se crearÃ¡ al subir archivo')
  })

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

  return { success: true, url: shareUrl, fileId: uploadData.id, folderPath: fullPath }
}



// ===================== Handler Principal =====================
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return handleCORS(request, env)
    const url = new URL(request.url), path = url.pathname
    console.log(`Received request: ${request.method} ${path}`)

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

          // CORREGIDO: Log para debugging
          console.log('Registrando usuario:', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            role
          })

          const success = await setUserRole(
            env,
            user.uid,
            role,
            existingUser ? existingUser.estado : 'activo',
            1,
            user.email || null,
            user.displayName || null
          )

          if (!success) {
            throw new Error('No se pudo registrar el usuario en la base de datos')
          }

          const savedUser = await env.DB.prepare('SELECT email, displayName, crear_carpeta FROM user_roles WHERE user_id = ?').bind(user.uid).first()

          // Si crear_carpeta estÃ¡ activado, intentar crear la carpeta
          if (savedUser?.crear_carpeta !== 0) {
            try {
              const accessToken = await getOneDriveAccessToken(env)
              const folderResult = await ensureUserOneDriveFolder(accessToken, user.displayName, user.email, user.uid)
              console.log('Carpeta OneDrive:', folderResult)
            } catch (e) {
              console.warn('No se pudo crear carpeta OneDrive, se crearÃ¡ al subir el primer archivo:', e.message)
            }
          }

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

      // PUT /api/users/:uid/create-folder (cambiar flag de crear carpeta - solo admin)
      if (path.startsWith('/api/users/') && path.endsWith('/create-folder') && request.method === 'PUT') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        if (!(await isAdmin(env, user.uid, user.email))) {
          return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const targetUid = path.split('/')[3] // /api/users/:uid/create-folder
        const body = await request.json().catch(() => ({}))
        const crearCarpeta = body.crear_carpeta !== false // Por defecto true

        try {
          await setUserCreateFolder(env, targetUid, crearCarpeta)

          // Si se activa crear_carpeta, crear la carpeta ahora
          if (crearCarpeta) {
            try {
              const targetUser = await env.DB.prepare('SELECT email, displayName FROM user_roles WHERE user_id = ?').bind(targetUid).first()
              const accessToken = await getOneDriveAccessToken(env)
              await ensureUserOneDriveFolder(accessToken, targetUser?.displayName, targetUser?.email, targetUid)
            } catch (e) {
              console.warn('No se pudo crear carpeta:', e.message)
            }
          }

          return new Response(JSON.stringify({ success: true, message: `Flag de crear carpeta ${crearCarpeta ? 'activado' : 'desactivado'}` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message || 'Error actualizando flag' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // DELETE /api/users/:uid (eliminar usuario y su carpeta - solo super_admin)
      if (path.startsWith('/api/users/') && request.method === 'DELETE' && !path.includes('/status') && !path.includes('/create-folder')) {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        if (!(await isSuperAdmin(env, user.uid, user.email))) {
          return new Response(JSON.stringify({ error: 'Solo super_admin puede eliminar usuarios' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const targetUid = path.split('/').pop()

        // No permitir eliminar super_admin
        const targetUser = await env.DB.prepare('SELECT role, email, displayName FROM user_roles WHERE user_id = ?').bind(targetUid).first()
        if (targetUser?.role === 'super_admin') {
          return new Response(JSON.stringify({ error: 'No se puede eliminar un super_admin' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        if (!targetUser) {
          return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

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

      // POST /api/onedrive/ensure-me (verificar y crear mi carpeta si no existe)
      if (path === '/api/onedrive/ensure-me' && request.method === 'POST') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        try {
          // CORREGIDO: Asegurar que el usuario estÃ© registrado con email y displayName
          await ensureUserRolesTable(env)
          const role = await getUserRole(env, user.uid, user.email)

          // Registrar o actualizar usuario con email y displayName
          await setUserRole(env, user.uid, role, 'activo', 1, user.email, user.displayName)

          // CORREGIDO: Forzar actualizaciÃ³n de email y displayName SIEMPRE
          if (user.email !== undefined || user.displayName !== undefined) {
            await env.DB.prepare(
              `UPDATE user_roles SET 
                email = ?,
                displayName = ?,
                updated_at = ?
               WHERE user_id = ?`
            ).bind(user.email || null, user.displayName || null, getPeruDateTime(), user.uid).run()
          }

          const accessToken = await getOneDriveAccessToken(env)

          // Asegurar que la carpeta del usuario existe, crearla si no existe
          const result = await ensureUserOneDriveFolder(
            accessToken,
            user.displayName,
            user.email,
            user.uid
          )

          return new Response(JSON.stringify({
            success: true,
            folderId: result.folderId || 'creada',
            folderPath: result.folderPath,
            folderName: result.folderName,
            message: result.message || (result.folderId ? 'Carpeta verificada' : 'Carpeta creada exitosamente')
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          console.error('Error en ensure-me:', error)
          // NO retornar error - retornar Ã©xito de todas formas
          // La carpeta se crearÃ¡ automÃ¡ticamente al subir el primer archivo
          const uidShort = user.uid.substring(0, 8)
          const userFolderName = (user.displayName || user.email?.split('@')[0] || 'usuario')
            .replace(/[^a-zA-Z0-9\s._-]/g, '')
            .trim()
            .replace(/\s+/g, '_')
            .substring(0, 40) || 'usuario'

          return new Response(JSON.stringify({
            success: true,
            folderId: null,
            folderPath: `viaticos/${userFolderName}_${uidShort}`,
            folderName: `${userFolderName}_${uidShort}`,
            message: 'Carpeta se crearÃ¡ automÃ¡ticamente al subir el primer archivo'
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // POST /api/onedrive/ensure-user/:uid (verificar y crear carpeta de usuario - solo admin)
      if (path.startsWith('/api/onedrive/ensure-user/') && request.method === 'POST') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        if (!(await isAdmin(env, user.uid, user.email))) {
          return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const targetUid = path.split('/').pop()
        // CORREGIDO: Obtener tambiÃ©n displayName de la tabla
        const targetUser = await env.DB.prepare('SELECT user_id, email, displayName FROM user_roles WHERE user_id = ?').bind(targetUid).first()
        if (!targetUser) {
          return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        try {
          const accessToken = await getOneDriveAccessToken(env)

          // Asegurar que la carpeta del usuario existe, crearla si no existe
          const result = await ensureUserOneDriveFolder(
            accessToken,
            targetUser.displayName || null, // CORREGIDO: Usar displayName de la tabla
            targetUser.email || null,
            targetUid
          )

          return new Response(JSON.stringify({
            success: true,
            folderId: result.folderId || 'creada',
            folderPath: result.folderPath,
            folderName: result.folderName,
            message: result.folderId ? 'Carpeta verificada' : 'Carpeta creada exitosamente'
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          console.error('Error en ensure-user:', error)
          return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Error asegurando carpeta'
          }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // PUT /api/users/:id/role (actualizar rol de usuario - solo super_admin)
      if (path.match(/^\/api\/users\/[^\/]+\/role$/) && request.method === 'PUT') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        // Verificar si es super_admin
        if (!(await isSuperAdmin(env, user.uid, user.email))) {
          return new Response(JSON.stringify({ error: 'Acceso denegado: Solo super_admin puede cambiar roles' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const targetUid = path.split('/')[3] // /api/users/:id/role

        try {
          const body = await request.json()
          const { role } = body

          if (!role || !['usuario', 'admin', 'super_admin'].includes(role)) {
            return new Response(JSON.stringify({ error: 'Rol inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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
          // Obtener datos actualizados de la BD
          const userData = await env.DB.prepare('SELECT * FROM user_roles WHERE user_id = ?').bind(user.uid).first()

          return new Response(JSON.stringify({
            success: true,
            user: {
              ...user,
              role: userData?.role || 'usuario',
              estado: userData?.estado || 'activo',
              crear_carpeta: userData?.crear_carpeta !== 0,
              last_closed_date: userData?.last_closed_date // Retornar fecha de cierre
            }
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // POST /api/users/close-day (cerrar el día manualmente)
      if (path === '/api/users/close-day' && request.method === 'POST') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        try {
          const body = await request.json().catch(() => ({}))
          const dateToClose = body.date // Fecha a cerrar (YYYY-MM-DD)

          if (!dateToClose) {
            return new Response(JSON.stringify({ error: 'Fecha requerida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          // Actualizar last_closed_date en la BD
          await env.DB.prepare('UPDATE user_roles SET last_closed_date = ? WHERE user_id = ?').bind(dateToClose, user.uid).run()

          return new Response(JSON.stringify({
            success: true,
            message: `Día ${dateToClose} cerrado exitosamente. Los nuevos viáticos irán al día siguiente.`
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // POST /api/users/reopen-day (reabrir el día manualmente - solo si es antes de las 10am)
      if (path === '/api/users/reopen-day' && request.method === 'POST') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        try {
          // Verificar hora actual (solo permitir si es antes de las 10 AM)
          const now = new Date();
          const timeOptions = { timeZone: 'America/Lima', hour: 'numeric', hour12: false };
          const hour = parseInt(new Intl.DateTimeFormat('es-PE', timeOptions).format(now));

          if (hour >= 10) {
            return new Response(JSON.stringify({ error: 'Ya no se puede reabrir el día. Ha pasado la hora límite (10:00 AM).' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          }

          // Resetear last_closed_date a NULL
          await env.DB.prepare('UPDATE user_roles SET last_closed_date = NULL WHERE user_id = ?').bind(user.uid).run()

          return new Response(JSON.stringify({
            success: true,
            message: 'Día reabierto exitosamente.'
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
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

        // Verificar si el usuario tiene permiso para crear carpeta (y por ende subir viÃ¡ticos)
        const userData = await env.DB.prepare('SELECT crear_carpeta FROM user_roles WHERE user_id = ?').bind(user.uid).first()
        if (userData && userData.crear_carpeta === 0) {
          return new Response(JSON.stringify({ error: 'No tienes permiso para subir viÃ¡ticos. Tu carpeta de OneDrive no estÃ¡ habilitada. Contacta al administrador.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const formData = await request.formData()
        const foto = formData.get('foto')
        const monto = formData.get('monto')
        const descripcion = formData.get('descripcion')
        const tipo = (formData.get('tipo') || 'otro').toString()
        // Por defecto, createTxt es true si no se especifica, o si el valor es '1'
        const createTxt = formData.get('createTxt') === null || formData.get('createTxt') === '1'

        // Lógica de FECHA ACTIVA (Cierre automático a las 10 AM y manual)
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

        // Obtener last_closed_date del usuario
        const userRoleData = await env.DB.prepare('SELECT last_closed_date FROM user_roles WHERE user_id = ?').bind(user.uid).first();
        const lastClosedDate = userRoleData?.last_closed_date;

        let activeDateString = todayString; // Por defecto hoy

        // Regla: Si es antes de las 10 AM y NO se ha cerrado ayer manualmente, la fecha activa es ayer
        if (hour < 10) {
          if (lastClosedDate !== yesterdayString) {
            activeDateString = yesterdayString;
          } else {
            // Si ya cerró ayer manualmente, entonces es hoy (aunque sea antes de las 10am)
            activeDateString = todayString;
          }
        } else {
          // Después de las 10 AM, siempre es hoy (el cierre automático ya ocurrió)
          activeDateString = todayString;
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

        // Carpeta Ãºnica incluyendo el ID para evitar colisiones y facilitar borrado
        const uniqueFolderDate = `${formattedDateTime}_${viaticoId}`;

        async function uploadToOneDrive(fileBuffer, fileName, mimeType, userId, dateFolder, env, userEmail, userDisplayName, fullDateTimeFolder) {
          const accessToken = await getOneDriveAccessToken(env);

          // Sanitizar nombre de usuario para la carpeta
          const safeDisplayName = (userDisplayName || userEmail.split('@')[0] || 'usuario')
            .replace(/[^a-zA-Z0-9\s._-]/g, '')
            .trim()
            .replace(/\s+/g, '_')
            .substring(0, 40);

          const uidShort = userId.substring(0, 8);
          const userFolderName = `${safeDisplayName}_${uidShort}`;

          // Usar la carpeta con fecha y hora completa
          const datedFolderPath = fullDateTimeFolder ? `${userFolderName}/${fullDateTimeFolder}` : `${userFolderName}/${dateFolder}`;
          const fullPath = `viaticos/${datedFolderPath}/${fileName}`;

          console.log(`Subiendo archivo a: ${fullPath}`);

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
            folderPath: datedFolderPath
          };
        }

        async function createTxtFile(env, userId, userEmail, userDisplayName, fullDateTimeFolder, viaticoData) {
          const accessToken = await getOneDriveAccessToken(env);

          const safeDisplayName = (userDisplayName || userEmail.split('@')[0] || 'usuario')
            .replace(/[^a-zA-Z0-9\s._-]/g, '')
            .trim()
            .replace(/\s+/g, '_')
            .substring(0, 40);

          const uidShort = userId.substring(0, 8);
          const userFolderName = `${safeDisplayName}_${uidShort}`;
          const datedFolderPath = `${userFolderName}/${fullDateTimeFolder}`;

          const txtFileName = `detalle_viatico.txt`;
          const fullPath = `viaticos/${datedFolderPath}/${txtFileName}`;

          const txtContent = `
          DETALLE DE VIATICO
          ==================
          Día: ${viaticoData.dia}
          Mes: ${viaticoData.mes}
          Año: ${viaticoData.año}
          Fecha: ${viaticoData.fecha}
          Para: ${viaticoData.para || 'N/A'}
          Que Sustenta: ${viaticoData.queSustenta}
          Trabajador: ${userDisplayName || userEmail}
          Tipo Comp.: ${viaticoData.tipoComprobante || 'N/A'}
          N° Doc.: ${viaticoData.numeroDocumento || 'N/A'}
          N° Comp.: ${viaticoData.numeroComprobante || 'N/A'}
          Monto: S/ ${parseFloat(viaticoData.monto).toFixed(2)}
          Descripción: ${viaticoData.descripcion || '(Sin Descripción)'}
            `.trim();

          console.log(`Creando TXT en: ${fullPath}`);

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
            // No lanzamos error para no interrumpir el flujo principal si falla el TXT
          }
        }

        try {
          // Procesar cada archivo
          for (const file of fotos) {
            const imageBuffer = await file.arrayBuffer()
            const mimeToExt = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' }
            const fileName = `${formattedDateTime}_${Math.random().toString(36).substr(2, 5)}${mimeToExt[file.type] || '.bin'}`

            // Usamos uniqueFolderDate en lugar de formattedDateTime puro
            const oneDriveData = await uploadToOneDrive(
              imageBuffer,
              fileName,
              file.type,
              user.uid,
              dbFormattedDate,
              env,
              user.email,
              user.displayName,
              uniqueFolderDate
            )

            uploadedFiles.push(oneDriveData.url);
          }

          // Crear el archivo TXT una sola vez
          if (createTxt) {
            await createTxtFile(env, user.uid, user.email, user.displayName, uniqueFolderDate, {
              id: viaticoId,
              dia: formattedDate.split('/')[0],
              mes: formattedDate.split('/')[1],
              año: formattedDate.split('/')[2],
              fecha: formattedDate,
              para: formData.get('para'),
              queSustenta: 'VIATICO',
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
          const safeDisplayName = (user.displayName || user.email.split('@')[0] || 'usuario')
            .replace(/[^a-zA-Z0-9\s._-]/g, '')
            .trim()
            .replace(/\s+/g, '_')
            .substring(0, 40);
          const uidShort = user.uid.substring(0, 8);
          const folderPath = `viaticos/${safeDisplayName}_${uidShort}/${uniqueFolderDate}`;

          await ensureViaticosTable(env)

          // Insertar en la base de datos incluyendo folder_path
          await env.DB.prepare(`INSERT INTO viaticos (id, usuario_id, fecha, tipo, monto, descripcion, folder_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(viaticoId, user.uid, dbFormattedDate, tipo, parseFloat(monto), descripcion || '', folderPath, getPeruDateTime(), getPeruDateTime())
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

      // DELETE /api/viaticos/:id (eliminar viÃ¡tico y archivos - admin/super_admin)
      if (path.startsWith('/api/viaticos/') && request.method === 'DELETE') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

        // Verificar permisos (admin o super_admin)
        if (!(await isAdmin(env, user.uid, user.email))) {
          return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const viaticoId = path.split('/').pop();

        try {
          // Obtener info del viÃ¡tico para saber quÃ© borrar
          const viatico = await env.DB.prepare('SELECT * FROM viaticos WHERE id = ?').bind(viaticoId).first();

          if (!viatico) {
            return new Response(JSON.stringify({ error: 'ViÃ¡tico no encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          // Intentar borrar de OneDrive
          try {
            const accessToken = await getOneDriveAccessToken(env);

            if (viatico.folder_path) {
              // Si tenemos el path exacto de la carpeta, borramos esa carpeta
              console.log(`Eliminando carpeta de OneDrive: ${viatico.folder_path}`);

              const deleteUrl = `https://graph.microsoft.com/v1.0/users/${env.ONEDRIVE_USER_ID}/drive/root:/${viatico.folder_path}`;
              const deleteResponse = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` }
              });

              if (!deleteResponse.ok) {
                console.error('Error respuesta OneDrive DELETE:', await deleteResponse.text());
              }

            } else {
              console.warn('ViÃ¡tico sin folder_path, saltando eliminaciÃ³n de archivos para evitar daÃ±os colaterales.');
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
          await ensureViaticosTable(env);

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
          `;

          const rows = await env.DB.prepare(sql).all();

          // Orden descendente por fecha
          const viaticos = (rows.results || []).sort((a, b) => {
            const dateA = new Date(a.fecha).getTime();
            const dateB = new Date(b.fecha).getTime();
            return dateB - dateA;
          });

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

          console.log(`Ejecutando consulta para mis-viaticos, UID: ${user.uid}`);

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
        let userData = await env.DB.prepare('SELECT estado, crear_carpeta, email, displayName FROM user_roles WHERE user_id = ?').bind(user.uid).first()

        const effectiveEmail = (user.email && user.email !== 'unknown@example.com') ? user.email : (userData?.email || '')
        const role = await getUserRole(env, user.uid, effectiveEmail)

        if (!userData) {
          await setUserRole(env, user.uid, role, 'activo', 1, user.email, user.displayName)
        } else {
          // No sobrescribir email/displayName si ya existen y los del token son genéricos
          const newEmail = (user.email && user.email !== 'unknown@example.com') ? user.email : userData.email
          const newDisplayName = (user.displayName && user.displayName !== 'Anonimo') ? user.displayName : userData.displayName

          await setUserRole(env, user.uid, role, userData.estado, userData.crear_carpeta, newEmail, newDisplayName)
        }

        // Recargar datos actualizados
        userData = await env.DB.prepare('SELECT estado, crear_carpeta, email, displayName FROM user_roles WHERE user_id = ?').bind(user.uid).first()

        return new Response(JSON.stringify({
          success: true,
          user: {
            uid: user.uid,
            email: userData?.email || user.email,
            displayName: userData?.displayName || user.displayName,
            role,
            estado: userData?.estado || 'activo',
            crear_carpeta: userData ? userData.crear_carpeta !== 0 : true
          }
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // GET /api/users (actualizar para incluir nuevos campos)
      if (path === '/api/users' && request.method === 'GET') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        if (!(await isAdmin(env, user.uid, user.email))) return new Response(JSON.stringify({ error: 'Acceso denegado' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        await ensureUserRolesTable(env)

        // CORREGIDO: Usar SELECT explÃ­cito en lugar de SELECT * para evitar problemas
        const rows = await env.DB.prepare(`
          SELECT 
            user_id, 
            role, 
            estado, 
            crear_carpeta, 
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
            estado: u.estado || 'activo',
            crear_carpeta: u.crear_carpeta !== 0
          })
        }

        return new Response(JSON.stringify({
          success: true,
          users: filteredUsers,
          count: countWithoutSuperAdmin
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // POST /api/onedrive/create-all-folders (crear carpetas para todos los usuarios existentes - solo super_admin)
      if (path === '/api/onedrive/create-all-folders' && request.method === 'POST') {
        if (!token) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        if (!(await isSuperAdmin(env, user.uid, user.email))) {
          return new Response(JSON.stringify({ error: 'Solo super_admin puede crear carpetas para todos los usuarios' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        try {
          await ensureUserRolesTable(env)
          const rows = await env.DB.prepare(`
            SELECT user_id, email, displayName, crear_carpeta 
            FROM user_roles 
            WHERE user_id != 'anonymous' 
              AND user_id != 'dev-user' 
              AND user_id NOT LIKE 'dev-%'
              AND crear_carpeta = 1
          `).all()

          const accessToken = await getOneDriveAccessToken(env)
          const results = []

          for (const u of rows.results) {
            try {
              const result = await ensureUserOneDriveFolder(accessToken, u.displayName, u.email, u.user_id)
              results.push({
                uid: u.user_id,
                email: u.email,
                displayName: u.displayName,
                success: true,
                folderPath: result.folderPath
              })
            } catch (e) {
              results.push({
                uid: u.user_id,
                email: u.email,
                displayName: u.displayName,
                success: false,
                error: e.message
              })
            }
          }

          return new Response(JSON.stringify({
            success: true,
            message: `Procesados ${results.length} usuarios`,
            results: results
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Error creando carpetas'
          }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // GET /api/config/super-admin-email
      if (path === '/api/config/super-admin-email' && request.method === 'GET') {
        console.log('Handling /api/config/super-admin-email');
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
  async scheduled(event, env, ctx) {
    switch (event.cron) {
      case "0 0 * * *":
        await cleanupAnonymousUsers(env);
        break;
    }
  }
}
