import { auth, initializeFirebase } from '../config/firebase'
import { toast } from '@/lib/use-toast'

// API URL constante para producción
const API_URL = 'https://viaticos.davidzapata-dz051099.workers.dev'

async function getAuthToken() {
  if (typeof window === 'undefined') {
    throw new Error('getAuthToken solo puede ser llamado en el cliente')
  }

  await initializeFirebase()
  const { auth: currentAuth } = await import('../config/firebase')

  if (!currentAuth) {
    throw new Error('Firebase Auth no está disponible. Verifica las variables de entorno NEXT_PUBLIC_FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN y FIREBASE_PROJECT_ID')
  }
  const user = currentAuth.currentUser
  if (!user) {
    throw new Error('Usuario no autenticado')
  }
  const token = await user.getIdToken()
  return token
}

async function apiRequest(endpoint: string, options: RequestInit = {}) {
  try {
    const token = await getAuthToken()

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    })

    // Leer la respuesta primero
    const data = await response.json()

    // Si la respuesta no es OK, verificar si tiene success: true (puede ser lista vacía)
    if (!response.ok) {
      // Si tiene success: true, retornarla (puede tener lista vacía por error de BD)
      if (data.success === true) {
        return data
      }

      // Mejorar mensajes de error
      if (response.status === 401) {
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.')
      }

      throw new Error(data.message || data.error || 'Error en la solicitud')
    }

    if (data.success === false && data.error) {
      throw new Error(data.error || data.message || 'Error en la solicitud')
    }

    const method = options.method?.toUpperCase()
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
      toast({
        title: "Éxito",
        description: "Datos actualizados correctamente.",
        variant: "success",
      })
    }

    return data
  } catch (error) {
    // Si el error es de autenticación, propagarlo con mensaje claro
    if (error instanceof Error && error.message.includes('Usuario no autenticado')) {
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.')
    }
    throw error
  }
}

export async function uploadViatico(viaticoData: FormData) {
  const token = await getAuthToken()

  const response = await fetch(`${API_URL}/api/viaticos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: viaticoData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error al subir viático' }))
    throw new Error(error.message || 'Error al subir viático')
  }

  toast({
    title: "Éxito",
    description: "Viático subido correctamente.",
    variant: "success",
  })

  return response.json()
}

export async function getTodaySummary() {
  return apiRequest('/api/viaticos/today-summary', { method: 'GET' })
}

export async function getMisViaticos() {
  return apiRequest('/api/viaticos/mis-viaticos')
}

export async function getAllViaticos() {
  return apiRequest('/api/viaticos/all')
}

export async function getViaticosByUser(userId: string) {
  return apiRequest(`/api/viaticos/user/${userId}`)
}

export async function getViaticosByDate(fecha: string) {
  return apiRequest(`/api/viaticos/fecha/${fecha}`)
}

export async function createUserFolder() {
  return apiRequest('/api/users', { method: 'POST', body: JSON.stringify({}) })
}

export async function getCurrentUser() {
  return apiRequest('/api/users/me', { method: 'GET' })
}

export async function getMyUser() {
  try {
    const data = await apiRequest('/api/users/me', { method: 'GET' })
    if (data.success && data.user) {
      return data.user
    }
    return null
  } catch (error) {
    console.error("Error fetching my user:", error)
    return null
  }
}

export async function getAllUsers() {
  return apiRequest('/api/users', { method: 'GET' })
}

export async function setUserRole(uid: string, role: string) {
  return apiRequest(`/api/users/${uid}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  })
}

export async function getOneDriveStructure() {
  return apiRequest('/api/onedrive/structure', { method: 'GET' })
}

export async function verifyOneDriveStructure() {
  return apiRequest('/api/onedrive/verify-structure', { method: 'GET' })
}

export async function ensureOneDriveFolders() {
  return apiRequest('/api/onedrive/ensure', { method: 'POST' })
}

export async function ensureOneDriveFolderForUser(uid: string) {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/api/onedrive/ensure-user/${uid}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error asegurando carpeta' }))
    throw new Error(error.message || 'Error asegurando carpeta')
  }
  toast({
    title: "Éxito",
    description: "Carpeta de usuario asegurada correctamente.",
    variant: "success",
  })
  return response.json()
}

export async function ensureMyOneDriveFolder() {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/api/onedrive/ensure-me`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error asegurando carpeta' }))
    throw new Error(error.message || 'Error asegurando carpeta')
  }
  toast({
    title: "Éxito",
    description: "Tu carpeta de OneDrive ha sido asegurada.",
    variant: "success",
  })
  return response.json()
}

export async function ejecutarMigracion() {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/api/migrate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error ejecutando migración' }))
    throw new Error(error.message || 'Error ejecutando migración')
  }

  toast({
    title: "Éxito",
    description: "Migración ejecutada correctamente.",
    variant: "success",
  })

  return response.json()
}

export async function cleanupAnonymousUsers() {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/api/cleanup/anonymous`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error ejecutando limpieza' }))
    throw new Error(error.message || 'Error ejecutando limpieza')
  }

  toast({
    title: "Éxito",
    description: "Limpieza de usuarios anónimos ejecutada correctamente.",
    variant: "success",
  })

  return response.json()
}

export async function setUserStatus(uid: string, estado: 'activo' | 'inactivo') {
  return apiRequest(`/api/users/${uid}/status`, {
    method: 'PUT',
    body: JSON.stringify({ estado }),
  })
}

export async function setUserCreateFolder(uid: string, crearCarpeta: boolean) {
  return apiRequest(`/api/users/${uid}/create-folder`, {
    method: 'PUT',
    body: JSON.stringify({ crear_carpeta: crearCarpeta }),
  })
}

export async function deleteUser(uid: string) {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/api/users/${uid}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error eliminando usuario' }))
    throw new Error(error.message || 'Error eliminando usuario')
  }

  toast({
    title: "Éxito",
    description: "Usuario eliminado correctamente.",
    variant: "success",
  })

  return response.json()
}

export async function deleteViatico(id: string) {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/api/viaticos/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error eliminando viático' }))
    throw new Error(error.message || 'Error eliminando viático')
  }

  toast({
    title: "Éxito",
    description: "Viático eliminado correctamente.",
    variant: "success",
  })

  return response.json()
}
