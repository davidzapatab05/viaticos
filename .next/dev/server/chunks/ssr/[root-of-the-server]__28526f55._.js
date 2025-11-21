module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/src/config/firebase.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// src/config/firebase.ts
__turbopack_context__.s([
    "auth",
    ()=>auth,
    "default",
    ()=>__TURBOPACK__default__export__,
    "initializeFirebase",
    ()=>initializeFirebase
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$app$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/app/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/auth/dist/index.mjs [app-ssr] (ecmascript) <locals>");
;
;
let app = null;
let auth = null;
/* ======================================================
   FUNCIÓN 1 — OBTENER CONFIGURACIÓN DE FIREBASE
   ====================================================== */ async function getFirebaseConfig() {
    // 🚀 SSR — usar variables de entorno directamente
    if ("TURBOPACK compile-time truthy", 1) {
        return {
            firebase: {
                apiKey: ("TURBOPACK compile-time value", "AIzaSyDl0BvJnN3m2AVSZpCr6Dqbt3mIMa7ZITM") ?? '',
                authDomain: ("TURBOPACK compile-time value", "viaticos-d5652.firebaseapp.com") ?? '',
                projectId: ("TURBOPACK compile-time value", "viaticos-d5652") ?? ''
            },
            apiUrl: ("TURBOPACK compile-time value", "https://viaticos.davidzapata-dz051099.workers.dev") ?? 'https://viaticos.davidzapata-dz051099.workers.dev'
        };
    }
    //TURBOPACK unreachable
    ;
}
async function initializeFirebase() {
    if ("TURBOPACK compile-time truthy", 1) return null;
    //TURBOPACK unreachable
    ;
}
;
const __TURBOPACK__default__export__ = app;
}),
"[project]/src/services/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cleanupAnonymousUsers",
    ()=>cleanupAnonymousUsers,
    "createUserFolder",
    ()=>createUserFolder,
    "deleteUser",
    ()=>deleteUser,
    "ejecutarMigracion",
    ()=>ejecutarMigracion,
    "ensureMyOneDriveFolder",
    ()=>ensureMyOneDriveFolder,
    "ensureOneDriveFolderForUser",
    ()=>ensureOneDriveFolderForUser,
    "ensureOneDriveFolders",
    ()=>ensureOneDriveFolders,
    "getAllUsers",
    ()=>getAllUsers,
    "getAllViaticos",
    ()=>getAllViaticos,
    "getCurrentUser",
    ()=>getCurrentUser,
    "getMisViaticos",
    ()=>getMisViaticos,
    "getOneDriveStructure",
    ()=>getOneDriveStructure,
    "getTodaySummary",
    ()=>getTodaySummary,
    "getViaticosByDate",
    ()=>getViaticosByDate,
    "getViaticosByUser",
    ()=>getViaticosByUser,
    "setUserCreateFolder",
    ()=>setUserCreateFolder,
    "setUserRole",
    ()=>setUserRole,
    "setUserStatus",
    ()=>setUserStatus,
    "uploadViatico",
    ()=>uploadViatico,
    "verifyOneDriveStructure",
    ()=>verifyOneDriveStructure
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/config/firebase.ts [app-ssr] (ecmascript)");
;
// Obtener API_URL desde el servidor o usar valor por defecto
const DEFAULT_API_URL = 'https://viaticos.davidzapata-dz051099.workers.dev';
async function getApiUrl() {
    // Simplificado para usar siempre la URL del worker de Cloudflare.
    // La lógica anterior fallaba porque la variable de entorno API_URL
    // no está disponible en el entorno del servidor de Next.js.
    return DEFAULT_API_URL;
}
async function getAuthToken() {
    if ("TURBOPACK compile-time truthy", 1) {
        throw new Error('getAuthToken solo puede ser llamado en el cliente');
    }
    await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initializeFirebase"])();
    const { auth: currentAuth } = await __turbopack_context__.A("[project]/src/config/firebase.ts [app-ssr] (ecmascript, async loader)");
    if (!currentAuth) {
        throw new Error('Firebase Auth no está disponible. Verifica las variables de entorno NEXT_PUBLIC_FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN y FIREBASE_PROJECT_ID');
    }
    const user = currentAuth.currentUser;
    if (!user) {
        throw new Error('Usuario no autenticado');
    }
    const token = await user.getIdToken();
    return token;
}
async function apiRequest(endpoint, options = {}) {
    try {
        const token = await getAuthToken();
        const API_URL = await getApiUrl();
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            }
        });
        // Leer la respuesta primero
        const data = await response.json();
        // Si la respuesta no es OK, verificar si tiene success: true (puede ser lista vacía)
        if (!response.ok) {
            // Si tiene success: true, retornarla (puede tener lista vacía por error de BD)
            if (data.success === true) {
                return data;
            }
            // Mejorar mensajes de error
            if (response.status === 401) {
                throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
            }
            throw new Error(data.message || data.error || 'Error en la solicitud');
        }
        // Si hay un error en el body pero success es false, verificar si es error de BD
        if (data.success === false && data.error) {
            // Si el error es de BD (usuario, SQLITE, D1), retornar éxito con lista vacía
            const errorMsg = data.error.toLowerCase();
            if (errorMsg.includes('usuario') || errorMsg.includes('sqlite') || errorMsg.includes('d1_error')) {
                console.warn('Error de BD detectado, retornando lista vacía:', data.error);
                return {
                    success: true,
                    viaticos: []
                };
            }
            throw new Error(data.error || data.message || 'Error en la solicitud');
        }
        return data;
    } catch (error) {
        // Si el error es de autenticación, propagarlo con mensaje claro
        if (error instanceof Error && error.message.includes('Usuario no autenticado')) {
            throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }
        throw error;
    }
}
async function uploadViatico(viaticoData) {
    const token = await getAuthToken();
    const API_URL = await getApiUrl();
    const response = await fetch(`${API_URL}/api/viaticos`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: viaticoData
    });
    if (!response.ok) {
        const error = await response.json().catch(()=>({
                message: 'Error al subir viático'
            }));
        throw new Error(error.message || 'Error al subir viático');
    }
    return response.json();
}
async function getTodaySummary() {
    return apiRequest('/api/viaticos/today-summary', {
        method: 'GET'
    });
}
async function getMisViaticos() {
    return apiRequest('/api/viaticos/mis-viaticos');
}
async function getAllViaticos() {
    return apiRequest('/api/viaticos/all');
}
async function getViaticosByUser(userId) {
    return apiRequest(`/api/viaticos/user/${userId}`);
}
async function getViaticosByDate(fecha) {
    return apiRequest(`/api/viaticos/fecha/${fecha}`);
}
async function createUserFolder() {
    return apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify({})
    });
}
async function getCurrentUser() {
    return apiRequest('/api/users/me', {
        method: 'GET'
    });
}
async function getAllUsers() {
    return apiRequest('/api/users', {
        method: 'GET'
    });
}
async function setUserRole(uid, role) {
    return apiRequest(`/api/users/${uid}/role`, {
        method: 'PUT',
        body: JSON.stringify({
            role
        })
    });
}
async function getOneDriveStructure() {
    return apiRequest('/api/onedrive/structure', {
        method: 'GET'
    });
}
async function verifyOneDriveStructure() {
    return apiRequest('/api/onedrive/verify-structure', {
        method: 'GET'
    });
}
async function ensureOneDriveFolders() {
    return apiRequest('/api/onedrive/ensure', {
        method: 'POST'
    });
}
async function ensureOneDriveFolderForUser(uid) {
    const token = await getAuthToken();
    const API_URL = await getApiUrl();
    const response = await fetch(`${API_URL}/api/onedrive/ensure-user/${uid}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const error = await response.json().catch(()=>({
                message: 'Error asegurando carpeta'
            }));
        throw new Error(error.message || 'Error asegurando carpeta');
    }
    return response.json();
}
async function ensureMyOneDriveFolder() {
    const token = await getAuthToken();
    const API_URL = await getApiUrl();
    const response = await fetch(`${API_URL}/api/onedrive/ensure-me`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!response.ok) {
        const error = await response.json().catch(()=>({
                message: 'Error asegurando carpeta'
            }));
        throw new Error(error.message || 'Error asegurando carpeta');
    }
    return response.json();
}
async function ejecutarMigracion() {
    const token = await getAuthToken();
    const API_URL = await getApiUrl();
    const response = await fetch(`${API_URL}/api/migrate`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        const error = await response.json().catch(()=>({
                message: 'Error ejecutando migración'
            }));
        throw new Error(error.message || 'Error ejecutando migración');
    }
    return response.json();
}
async function cleanupAnonymousUsers() {
    const token = await getAuthToken();
    const API_URL = await getApiUrl();
    const response = await fetch(`${API_URL}/api/cleanup/anonymous`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        const error = await response.json().catch(()=>({
                message: 'Error ejecutando limpieza'
            }));
        throw new Error(error.message || 'Error ejecutando limpieza');
    }
    return response.json();
}
async function setUserStatus(uid, estado) {
    return apiRequest(`/api/users/${uid}/status`, {
        method: 'PUT',
        body: JSON.stringify({
            estado
        })
    });
}
async function setUserCreateFolder(uid, crearCarpeta) {
    return apiRequest(`/api/users/${uid}/create-folder`, {
        method: 'PUT',
        body: JSON.stringify({
            crear_carpeta: crearCarpeta
        })
    });
}
async function deleteUser(uid) {
    const token = await getAuthToken();
    const API_URL = await getApiUrl();
    const response = await fetch(`${API_URL}/api/users/${uid}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) {
        const error = await response.json().catch(()=>({
                message: 'Error eliminando usuario'
            }));
        throw new Error(error.message || 'Error eliminando usuario');
    }
    return response.json();
}
}),
"[project]/src/contexts/AuthContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/firebase/auth/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/firebase/node_modules/@firebase/auth/dist/node-esm/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/config/firebase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/services/api.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])({
    user: null,
    signIn: async ()=>({
            success: false
        }),
    signUp: async ()=>({
            success: false
        }),
    signInWithMicrosoft: async ()=>({
            success: false
        }),
    signOut: async ()=>({
            success: false
        }),
    loading: true
});
function useAuth() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
}
function AuthProvider({ children }) {
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        let unsub = ()=>{};
        const setupAuth = async ()=>{
            // Asegurar que Firebase esté inicializado
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initializeFirebase"])();
            // Re-importar auth para obtener la instancia actualizada
            const { auth: currentAuth } = await __turbopack_context__.A("[project]/src/config/firebase.ts [app-ssr] (ecmascript, async loader)");
            if (!currentAuth) {
                setLoading(false);
                return;
            }
            try {
                // Usar browserLocalPersistence para que la sesión persista incluso después de cerrar el navegador
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["setPersistence"])(currentAuth, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["browserLocalPersistence"]);
            } catch (e) {
                console.warn('No se pudo establecer persistencia local:', e.message || e);
            }
            // Verificar si hay un resultado de redirect pendiente
            try {
                const redirectResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getRedirectResult"])(currentAuth);
                if (redirectResult) {
                    // Usuario regresó de redirect, registrar en D1
                    try {
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createUserFolder"])();
                    } catch (e) {
                        console.warn('Nota: Las carpetas se crearán automáticamente al subir el primer archivo');
                    }
                }
            } catch (e) {
            // Ignorar errores de redirect
            }
            unsub = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["onAuthStateChanged"])(currentAuth, async (user)=>{
                setUser(user);
                setLoading(false);
                if (user) {
                    // Guardar token en cookie para el middleware
                    try {
                        const token = await user.getIdToken();
                        document.cookie = `firebase-token=${token}; path=/; max-age=604800; SameSite=Lax; Secure`;
                        // Renovar token automáticamente cada hora
                        setInterval(async ()=>{
                            try {
                                const currentUser = currentAuth.currentUser;
                                if (currentUser) {
                                    const newToken = await currentUser.getIdToken(true);
                                    document.cookie = `firebase-token=${newToken}; path=/; max-age=604800; SameSite=Lax; Secure`;
                                }
                            } catch (e) {
                                console.warn('Error renovando token:', e.message || e);
                            }
                        }, 3600000);
                    } catch (e) {
                        console.warn('Error guardando token en cookie:', e.message || e);
                    }
                    // CORREGIDO: Registrar usuario en la base de datos con email y displayName
                    try {
                        const { createUserFolder } = await __turbopack_context__.A("[project]/src/services/api.ts [app-ssr] (ecmascript, async loader)");
                        await createUserFolder().catch((e)=>{
                            // Ignorar errores - el usuario se registrará en la próxima petición
                            console.warn('Nota: El usuario se registrará automáticamente en la próxima acción');
                        });
                    } catch (e) {
                    // Ignorar errores
                    }
                } else {
                    // Eliminar cookie al cerrar sesión
                    document.cookie = 'firebase-token=; path=/; max-age=0';
                }
            });
        };
        setupAuth();
        return ()=>{
            try {
                unsub();
            } catch (e) {}
        };
    }, []);
    async function signIn(email, password) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initializeFirebase"])();
        const { auth: currentAuth } = await __turbopack_context__.A("[project]/src/config/firebase.ts [app-ssr] (ecmascript, async loader)");
        if (!currentAuth) {
            return {
                success: false,
                error: 'Firebase Auth no está disponible'
            };
        }
        try {
            const userCredential = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["signInWithEmailAndPassword"])(currentAuth, email, password);
            return {
                success: true,
                user: userCredential.user
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    async function signInWithMicrosoft() {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initializeFirebase"])();
        const { auth: currentAuth } = await __turbopack_context__.A("[project]/src/config/firebase.ts [app-ssr] (ecmascript, async loader)");
        if (!currentAuth) {
            return {
                success: false,
                error: 'Firebase Auth no está disponible. Verifica las variables de entorno.'
            };
        }
        try {
            const provider = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OAuthProvider"]('microsoft.com');
            // Solo pedir permisos básicos de autenticación - NO pedir acceso a OneDrive
            // El acceso a OneDrive se maneja en el worker con su propio token
            provider.addScope('openid');
            provider.addScope('profile');
            provider.addScope('email');
            provider.addScope('offline_access');
            // ELIMINAR: provider.addScope('Files.ReadWrite.All') - Esto requiere consentimiento del admin
            // Usar signInWithPopup (funciona correctamente, los warnings de COOP no afectan funcionalidad)
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["signInWithPopup"])(currentAuth, provider);
            // Registrar usuario en D1 (las carpetas se crearán automáticamente al subir archivos)
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createUserFolder"])();
            } catch (e) {
                // Ignorar errores - las carpetas se crearán automáticamente
                console.warn('Nota: Las carpetas se crearán automáticamente al subir el primer archivo');
            }
            return {
                success: true,
                user: result.user
            };
        } catch (error) {
            console.error('Error en signInWithMicrosoft:', error);
            return {
                success: false,
                error: error.message || 'Error al iniciar sesión con Microsoft'
            };
        }
    }
    async function signUp(email, password) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initializeFirebase"])();
        const { auth: currentAuth } = await __turbopack_context__.A("[project]/src/config/firebase.ts [app-ssr] (ecmascript, async loader)");
        if (!currentAuth) {
            return {
                success: false,
                error: 'Firebase Auth no está disponible'
            };
        }
        try {
            const userCredential = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createUserWithEmailAndPassword"])(currentAuth, email, password);
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createUserFolder"])();
            } catch (e) {
                console.warn('No se pudo crear la carpeta en OneDrive al registrar usuario:', e.message || e);
            }
            return {
                success: true,
                user: userCredential.user
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    async function signOut() {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["initializeFirebase"])();
        const { auth: currentAuth } = await __turbopack_context__.A("[project]/src/config/firebase.ts [app-ssr] (ecmascript, async loader)");
        if (!currentAuth) {
            return {
                success: false,
                error: 'Firebase Auth no está disponible'
            };
        }
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["signOut"])(currentAuth);
            // Eliminar cookie al cerrar sesión
            document.cookie = 'firebase-token=; path=/; max-age=0';
            return {
                success: true
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    const value = {
        user,
        signIn,
        signUp,
        signInWithMicrosoft,
        signOut,
        loading
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/contexts/AuthContext.tsx",
        lineNumber: 225,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__28526f55._.js.map