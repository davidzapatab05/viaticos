import { initializeFirebase } from '../config/firebase'
import { toast } from '@/lib/use-toast'

// API URL constante para producción
const API_URL = 'https://viaticos.davidzapata-dz051099.workers.dev'

export async function getAuthToken() {
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

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  try {
    const token = await getAuthToken()

    let lastError;
    for (let i = 0; i < 3; i++) {
      try {
        const response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
          },
        })

        // Si la respuesta es exitosa, salir del bucle
        // Nota: fetch no lanza error en 4xx/5xx, solo en error de red
        // Así que si llegamos aquí, la conexión fue exitosa

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
            if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }
            throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.')
          }

          throw new Error(data.message || data.error || 'Error en la solicitud')
        }

        if (data.success === false && data.error) {
          throw new Error(data.error || data.message || 'Error en la solicitud')
        }

        // Toast eliminado para evitar redundancia con SweetAlert
        // const method = options.method?.toUpperCase()
        // if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        //   toast({
        //     title: "Éxito",
        //     description: "Datos actualizados correctamente.",
        //     variant: "success",
        //   })
        // }

        return data

      } catch (error) {
        console.warn(`Intento ${i + 1} fallido para ${endpoint}:`, error)
        lastError = error
        // Si es el último intento, no esperar
        if (i === 2) break
        // Esperar un poco antes de reintentar (backoff exponencial: 500ms, 1000ms)
        await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)))
      }
    }

    console.error('Network error in apiRequest after 3 attempts:', lastError, 'URL:', `${API_URL}${endpoint}`)
    throw new Error(`Error de conexión: ${(lastError as Error).message || 'No se pudo conectar con el servidor'}`)
  } catch (error) {
    // Si el error es de autenticación, propagarlo con mensaje claro y redirigir
    if (error instanceof Error && (error.message.includes('Usuario no autenticado') || error.message.includes('Sesión expirada'))) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
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

export async function uploadGasto(gastoData: FormData) {
  const token = await getAuthToken()

  const response = await fetch(`${API_URL}/api/gastos`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: gastoData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error al subir gasto' }))
    throw new Error(error.message || 'Error al subir gasto')
  }

  toast({
    title: "Éxito",
    description: "Gasto subido correctamente.",
    variant: "success",
  })

  return response.json()
}



export async function getMisViaticos() {
  return apiRequest('/api/viaticos/mis-viaticos')
}

export async function getMisGastos() {
  return apiRequest('/api/gastos')
}

export async function getAllGastos() {
  return apiRequest('/api/gastos/all')
}

export async function getAllViaticos() {
  return apiRequest('/api/viaticos/all')
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



export async function closeDay(date: string) {
  return apiRequest('/api/users/close-day', {
    method: 'POST',
    body: JSON.stringify({ date }),
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


export async function updateUser(uid: string, data: { displayName: string }) {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/api/users/${uid}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error actualizando usuario' }))
    throw new Error(error.error || error.message || 'Error actualizando usuario')
  }

  return response.json()
}

export async function updateViatico(id: string, updates: any) {
  return apiRequest(`/api/viaticos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

export async function deleteViatico(id: string) {
  return apiRequest(`/api/viaticos/${id}`, {
    method: 'DELETE',
  })
}

export async function updateGasto(id: string, updates: any) {
  return apiRequest(`/api/gastos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

export async function deleteGasto(id: string) {
  return apiRequest(`/api/gastos/${id}`, {
    method: 'DELETE',
  })
}

export async function subscribeToNotifications(subscription: PushSubscription) {
  const token = await getAuthToken()
  return apiRequest('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  })
}

export async function getVapidPublicKey() {
  return fetch(`${API_URL}/api/push/vapid-public-key`).then(res => res.json())
}

export async function unsubscribeFromNotifications(endpoint: string) {
  return apiRequest('/api/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint }),
  })
}

export async function triggerManualBackup(startDate: string, endDate: string) {
  const token = await getAuthToken()
  const response = await fetch(`${API_URL}/api/backup/manual`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ startDate, endDate }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Error ejecutando backup' }))
    throw new Error(error.message || 'Error ejecutando backup')
  }

  return response.json()
}
