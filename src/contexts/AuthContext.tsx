'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  OAuthProvider,
  signInWithPopup,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  User,
} from 'firebase/auth'
import { initializeFirebase } from '../config/firebase'
import { getMyUser } from '../services/api'
import { unsubscribeFromPush } from '@/utils/push'

interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
  role: string
  estado: string
  last_closed_date?: string
  exists?: boolean
}

interface AuthContextType {
  user: User | null
  appUser: AppUser | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>
  signUp: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>
  signInWithMicrosoft: () => Promise<{ success: boolean; user?: User; error?: string }>
  signOut: () => Promise<{ success: boolean; error?: string }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signInWithMicrosoft: async () => ({ success: false }),
  signOut: async () => ({ success: false }),
  loading: true,
})

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsub = () => { }

    const setupAuth = async () => {
      // Asegurar que Firebase esté inicializado
      await initializeFirebase()

      // Re-importar auth para obtener la instancia actualizada
      const { auth: currentAuth } = await import('../config/firebase')

      if (!currentAuth) {
        setLoading(false)
        return
      }

      try {
        // Usar browserLocalPersistence para que la sesión persista incluso después de cerrar el navegador
        await setPersistence(currentAuth, browserLocalPersistence)
      } catch (e) {
        console.warn('No se pudo establecer persistencia local:', (e as Error).message || e)
      }

      // Verificar si hay un resultado de redirect pendiente
      try {
        const redirectResult = await getRedirectResult(currentAuth)
        if (redirectResult) {
          // Redirect result handled, user will be processed by onAuthStateChanged
        }
      } catch (e) {
        // Ignorar errores de redirect
      }

      unsub = onAuthStateChanged(currentAuth, async (user) => {
        setUser(user)
        // No bloquear la UI mientras se obtienen los datos del usuario
        // Establecer loading a false inmediatamente para que la app pueda renderizar
        if (user) {
          // Fetch en segundo plano
          user.getIdToken().then(token => {
            document.cookie = `firebase-token=${token}; path=/; max-age=604800; SameSite=Lax; Secure`
            return getMyUser()
          }).then(async myUser => {
            if (myUser && myUser.exists) {
              if (myUser.estado === 'inactivo') {
                await currentAuth.signOut()
                setUser(null)
                setAppUser(null)
                // Usar import dinámico para Swal para evitar problemas de SSR/dependencias circulares si las hubiera
                const Swal = (await import('sweetalert2')).default
                await Swal.fire({
                  title: 'Cuenta Inactiva',
                  text: 'Tu cuenta ha sido desactivada por un administrador. Contacta a soporte para más información.',
                  icon: 'error',
                  confirmButtonColor: '#ea580c'
                })
                return
              }
              setAppUser(myUser)

              // Auto-subscribe to push notifications on login
              try {
                const { subscribeToPush } = await import('@/utils/push')
                await subscribeToPush()
                console.log('Push notifications auto-subscribed')
              } catch (e) {
                console.warn('Could not auto-subscribe to push notifications:', e)
              }
            } else {
              // Si el usuario no existe en la BD (pero sí en Firebase), registrarlo
              console.log('Usuario no encontrado en BD, registrando...')
              try {
                // Reintentar obtener usuario (se creará automáticamente en el backend)
                const newUser = await getMyUser()
                if (newUser) {
                  setAppUser(newUser)

                  // Auto-subscribe to push notifications for new users
                  try {
                    const { subscribeToPush } = await import('@/utils/push')
                    await subscribeToPush()
                    console.log('Push notifications auto-subscribed for new user')
                  } catch (e) {
                    console.warn('Could not auto-subscribe to push notifications:', e)
                  }
                }
              } catch (e) {
                console.warn('Error auto-registrando usuario:', e)
              }
            }
          }).catch(e => {
            console.warn('Error fetching user data:', e)
            setAppUser(null)
          })

          // Setup token refresh interval
          setInterval(async () => {
            try {
              const currentUser = currentAuth.currentUser
              if (currentUser) {
                const newToken = await currentUser.getIdToken(true)
                document.cookie = `firebase-token=${newToken}; path=/; max-age=604800; SameSite=Lax; Secure`
              }
            } catch (e) {
              console.warn('Error renovando token:', (e as Error).message || e)
            }
          }, 3600000)
        } else {
          document.cookie = 'firebase-token=; path=/; max-age=0'
          setAppUser(null)
        }
        setLoading(false)
      })
    }

    setupAuth()

    return () => {
      try { unsub() } catch (e) { }
    }
  }, [])

  async function signIn(email: string, password: string) {
    await initializeFirebase()
    const { auth: currentAuth } = await import('../config/firebase')
    if (!currentAuth) {
      return { success: false, error: 'Firebase Auth no está disponible' }
    }
    try {
      const userCredential = await signInWithEmailAndPassword(currentAuth, email, password)
      return { success: true, user: userCredential.user }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async function signInWithMicrosoft() {
    await initializeFirebase()
    const { auth: currentAuth } = await import('../config/firebase')
    if (!currentAuth) {
      return { success: false, error: 'Firebase Auth no está disponible. Verifica las variables de entorno.' }
    }
    try {
      const provider = new OAuthProvider('microsoft.com')
      // Solo pedir permisos básicos de autenticación - NO pedir acceso a OneDrive
      // El acceso a OneDrive se maneja en el worker con su propio token
      provider.addScope('openid')
      provider.addScope('profile')
      provider.addScope('email')
      provider.addScope('offline_access')
      // ELIMINAR: provider.addScope('Files.ReadWrite.All') - Esto requiere consentimiento del admin

      // Usar signInWithPopup (funciona correctamente, los warnings de COOP no afectan funcionalidad)
      const result = await signInWithPopup(currentAuth, provider)

      // New user will be registered automatically on first API call

      return { success: true, user: result.user }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log('Usuario cerró el popup de autenticación')
        return { success: false, error: 'Inicio de sesión cancelado por el usuario' }
      }
      console.error('Error en signInWithMicrosoft:', error)
      return { success: false, error: error.message || 'Error al iniciar sesión con Microsoft' }
    }
  }

  async function signUp(email: string, password: string) {
    await initializeFirebase()
    const { auth: currentAuth } = await import('../config/firebase')
    if (!currentAuth) {
      return { success: false, error: 'Firebase Auth no está disponible' }
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(currentAuth, email, password)
      // User will be registered automatically on first API call
      return { success: true, user: userCredential.user }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  async function signOut() {
    await initializeFirebase()
    const { auth: currentAuth } = await import('../config/firebase')
    if (!currentAuth) {
      return { success: false, error: 'Firebase Auth no está disponible' }
    }
    try {
      // Intentar desuscribir push notifications antes de cerrar sesión
      // No bloqueamos el logout si falla
      try {
        await unsubscribeFromPush()
      } catch (e) {
        console.warn('Error unsubscribing push:', e)
      }

      await firebaseSignOut(currentAuth)
      // Eliminar cookie al cerrar sesión
      document.cookie = 'firebase-token=; path=/; max-age=0'
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  const value = {
    user,
    appUser,
    signIn,
    signUp,
    signInWithMicrosoft,
    signOut,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
