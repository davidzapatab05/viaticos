// src/config/firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'

let app: FirebaseApp | null = null
let auth: Auth | null = null

/* ======================================================
   FUNCIÓN 1 — OBTENER CONFIGURACIÓN DE FIREBASE
   ====================================================== */
async function getFirebaseConfig() {
  // 🚀 SSR — usar variables de entorno directamente
  if (typeof window === 'undefined') {
    return {
      firebase: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
      },
      apiUrl:
        process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL ??
        'https://viaticos.davidzapata-dz051099.workers.dev',
    }
  }

  // 🚀 Cliente — obtener desde /api/config
  try {
    const response = await fetch('/api/config')
    if (!response.ok) throw new Error('Failed to fetch /api/config')
    const json = await response.json()

    // Validar
    if (!json?.firebase?.apiKey) {
      console.error('❌ /api/config: firebase.apiKey vacío')
    }

    return json
  } catch (err) {
    console.error('❌ Error obteniendo configuración:', err)
    return {
      firebase: {
        apiKey: '',
        authDomain: '',
        projectId: '',
      },
      apiUrl: 'https://viaticos.davidzapata-dz051099.workers.dev',
    }
  }
}

/* ======================================================
   FUNCIÓN 2 — INICIALIZAR FIREBASE
   ====================================================== */
export async function initializeFirebase() {
  if (typeof window === 'undefined') return null
  if (app && auth) return { app, auth }

  try {
    const { firebase: firebaseConfig } = await getFirebaseConfig()

    if (!firebaseConfig.apiKey) {
      console.warn(
        '⚠ Firebase no está configurado. Revisa tus variables NEXT_PUBLIC_FIREBASE_*'
      )
      return null
    }

    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig)
    } else {
      app = getApps()[0]
    }

    auth = getAuth(app)
    return { app, auth }
  } catch (error) {
    console.error('🔥 Error inicializando Firebase:', error)
  }
}

export { auth }
export default app