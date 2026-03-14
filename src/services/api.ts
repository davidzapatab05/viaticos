import { initializeFirebase } from '../config/firebase'
import { toast } from '@/lib/use-toast'

// API URL constante para producci?f?n
const API_URL = 'https://viaticos.davidzapata-dz051099.workers.dev'

export async function getAuthToken() {
  if (typeof window === 'undefined') {
    throw new Error('getAuthToken solo puede ser llamado en el cliente')
  }

  await initializeFirebase()
  const { auth: currentAuth } = await import('../config/firebase')

  if (!currentAuth) {
    throw new Error('Firebase Auth no est? disponible. Verifica las variables de entorno NEXT_PUBLIC_FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN y FIREBASE_PROJECT_ID')
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
    const method = (options.method || 'GET').toUpperCase()
    const maxAttempts = method === 'GET' ? 3 : 1
    let lastError: unknown = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
          },
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          if (response.status === 401) {
            if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }
            throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.')
          }

          throw new Error((data as any).message || (data as any).error || 'Error en la solicitud')
        }

        if ((data as any).success === false && (data as any).error) {
          throw new Error((data as any).error || (data as any).message || 'Error en la solicitud')
        }

        return data
      } catch (error) {
        lastError = error

        if (attempt >= maxAttempts) {
          break
        }

        console.warn(`Intento ${attempt} fallido para ${endpoint}:`, error)
        await new Promise(resolve => setTimeout(resolve, 400 * attempt))
      }
    }

    if (maxAttempts > 1) {
      console.error(`Network error in apiRequest after ${maxAttempts} attempts:`, lastError, 'URL:', `${API_URL}${endpoint}`)
    }

    if (lastError instanceof Error) {
      if (maxAttempts > 1) {
        throw new Error(`Error de conexión: ${lastError.message || 'No se pudo conectar con el servidor'}`)
      }
      throw lastError
    }

    throw new Error('Error de conexión con el servidor')
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Usuario no autenticado') || error.message.includes('Sesión expirada'))) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.')
    }
    throw error
  }
}

async function submitMultipart(endpoint: string, data: FormData, fallbackMessage: string, successDescription: string) {
  const token = await getAuthToken()

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: data,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: fallbackMessage }))
    throw new Error(error.error || error.message || fallbackMessage)
  }

  const result = await response.json()

  toast({
    title: '\u00c9xito',
    description: successDescription,
    variant: 'success',
  })

  return result
}

export async function uploadViatico(viaticoData: FormData) {
  return submitMultipart('/api/viaticos', viaticoData, 'Error al subir vi\u00e1tico', 'Vi\u00e1tico subido correctamente.')
}

export async function uploadGasto(gastoData: FormData) {
  return submitMultipart('/api/gastos', gastoData, 'Error al subir gasto', 'Gasto subido correctamente.')
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
    title: "\u00c9xito",
    description: "Limpieza de usuarios an\u00f3nimos ejecutada correctamente.",
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
    title: "\u00c9xito",
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

