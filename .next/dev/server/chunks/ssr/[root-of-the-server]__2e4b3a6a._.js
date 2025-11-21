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
    "createUserFolder",
    ()=>createUserFolder,
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
    "getOneDriveMainFolderUrl",
    ()=>getOneDriveMainFolderUrl,
    "getOneDriveStructure",
    ()=>getOneDriveStructure,
    "getTodaySummary",
    ()=>getTodaySummary,
    "getViaticosByDate",
    ()=>getViaticosByDate,
    "getViaticosByUser",
    ()=>getViaticosByUser,
    "setUserRole",
    ()=>setUserRole,
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
    if (!response.ok) {
        const error = await response.json().catch(()=>({
                message: 'Error en la solicitud'
            }));
        throw new Error(error.message || 'Error en la solicitud');
    }
    return response.json();
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
async function getOneDriveMainFolderUrl() {
    return apiRequest('/api/onedrive/main-folder-url', {
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
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["setPersistence"])(currentAuth, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["browserLocalPersistence"]);
            } catch (e) {
                console.warn('No se pudo establecer persistencia local:', e.message || e);
            }
            unsub = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["onAuthStateChanged"])(currentAuth, async (user)=>{
                setUser(user);
                setLoading(false);
                if (user) {
                    // Guardar token en cookie para el middleware
                    try {
                        const token = await user.getIdToken();
                        document.cookie = `firebase-token=${token}; path=/; max-age=3600; SameSite=Lax`;
                    } catch (e) {
                        console.warn('Error guardando token en cookie:', e.message || e);
                    }
                    try {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createUserFolder"])().catch((e)=>console.warn('No se pudo crear carpeta al iniciar sesión:', e.message || e));
                    } catch (e) {
                        console.warn('Error invocando createUserFolder en onAuthStateChanged:', e.message || e);
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
            provider.addScope('openid');
            provider.addScope('profile');
            provider.addScope('email');
            provider.addScope('offline_access');
            provider.addScope('Files.ReadWrite.All');
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["signInWithPopup"])(currentAuth, provider);
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$services$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createUserFolder"])();
            } catch (e) {
                console.warn('No se pudo crear carpeta en OneDrive tras login con Microsoft:', e.message || e);
            }
            return {
                success: true,
                user: result.user
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
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
        lineNumber: 182,
        columnNumber: 5
    }, this);
}
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/dynamic-access-async-storage.external.js [external] (next/dist/server/app-render/dynamic-access-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/dynamic-access-async-storage.external.js", () => require("next/dist/server/app-render/dynamic-access-async-storage.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__2e4b3a6a._.js.map