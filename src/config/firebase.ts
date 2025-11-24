// src/config/firebase.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'

let app: FirebaseApp | null = null
let auth: Auth | null = null

/* ======================================================
   FUNCIÓN 1 — OBTENER CONFIGURACIÓN DE FIREBASE
   ====================================================== */
async function getFirebaseConfig() {
  // 🚀 RETORNAR SIEMPRE VALORES HARDCODED
  // Esto elimina la dependencia de /api/config y de process.env
  // para evitar problemas de espacios en blanco en Vercel.
  return {
    firebase: {
      apiKey: 'AIzaSyDl0BvJnN3m2AVSZpCr6Dqbt3mIMa7ZITM',
      authDomain: 'viaticos-d5652.firebaseapp.com',
      projectId: 'viaticos-d5652',
    },
    apiUrl: 'https://viaticos.davidzapata-dz051099.workers.dev',
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
        '⚠ Firebase no está configurado.'
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