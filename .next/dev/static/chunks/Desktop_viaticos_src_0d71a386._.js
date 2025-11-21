(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/Desktop/viaticos/src/config/firebase.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "auth",
    ()=>auth,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/firebase/app/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/@firebase/app/dist/esm/index.esm.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/firebase/auth/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/firebase/node_modules/@firebase/auth/dist/esm/index.js [app-client] (ecmascript)");
;
;
// Validar que las variables de entorno estén configuradas
const firebaseConfig = {
    apiKey: __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''
};
// Validar configuración antes de inicializar
const isValidConfig = firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId;
let app = null;
let auth = null;
if (("TURBOPACK compile-time value", "object") !== 'undefined' && isValidConfig) {
    try {
        // Evitar inicialización múltiple en Next.js
        app = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getApps"])().length === 0 ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["initializeApp"])(firebaseConfig) : (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f40$firebase$2f$app$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getApps"])()[0];
        auth = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getAuth"])(app);
    } catch (error) {
        console.error('Error inicializando Firebase:', error);
    }
} else if (("TURBOPACK compile-time value", "object") !== 'undefined' && !isValidConfig) {
    console.warn('Firebase: Variables de entorno no configuradas. Asegúrate de tener NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN y NEXT_PUBLIC_FIREBASE_PROJECT_ID en tu archivo .env.local');
}
;
const __TURBOPACK__default__export__ = app;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/viaticos/src/services/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
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
    ()=>uploadViatico
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/viaticos/src/config/firebase.ts [app-client] (ecmascript)");
;
const API_URL = __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].env.NEXT_PUBLIC_API_URL || ("TURBOPACK compile-time value", "https://viaticos.davidzapata-dz051099.workers.dev") || 'https://viaticos.davidzapata-dz051099.workers.dev';
async function getAuthToken() {
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"]) {
        throw new Error('Firebase Auth no está disponible. Verifica las variables de entorno NEXT_PUBLIC_FIREBASE_*');
    }
    const user = __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"].currentUser;
    if (!user) {
        throw new Error('Usuario no autenticado');
    }
    const token = await user.getIdToken();
    return token;
}
async function apiRequest(endpoint, options = {}) {
    const token = await getAuthToken();
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
async function ensureOneDriveFolders() {
    return apiRequest('/api/onedrive/ensure', {
        method: 'POST'
    });
}
async function ensureOneDriveFolderForUser(uid) {
    const token = await getAuthToken();
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
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/Desktop/viaticos/src/contexts/AuthContext.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$esm$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/firebase/auth/dist/esm/index.esm.js [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/firebase/node_modules/@firebase/auth/dist/esm/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/viaticos/src/config/firebase.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/viaticos/src/services/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature();
'use client';
;
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])({
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
    _s();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
}
_s(useAuth, "gDsCjeeItUuvgOWf1v4qoK9RF6k=");
function AuthProvider({ children }) {
    _s1();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "AuthProvider.useEffect": ()=>{
            if (!__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"]) {
                setLoading(false);
                return;
            }
            let unsub = {
                "AuthProvider.useEffect.unsub": ()=>{}
            }["AuthProvider.useEffect.unsub"];
            ({
                "AuthProvider.useEffect": async ()=>{
                    try {
                        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["setPersistence"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"], __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["browserLocalPersistence"]);
                    } catch (e) {
                        console.warn('No se pudo establecer persistencia local:', e.message || e);
                    }
                    unsub = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["onAuthStateChanged"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"], {
                        "AuthProvider.useEffect": (user)=>{
                            setUser(user);
                            setLoading(false);
                            if (user) {
                                try {
                                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createUserFolder"])().catch({
                                        "AuthProvider.useEffect": (e)=>console.warn('No se pudo crear carpeta al iniciar sesión:', e.message || e)
                                    }["AuthProvider.useEffect"]);
                                } catch (e) {
                                    console.warn('Error invocando createUserFolder en onAuthStateChanged:', e.message || e);
                                }
                            }
                        }
                    }["AuthProvider.useEffect"]);
                }
            })["AuthProvider.useEffect"]();
            return ({
                "AuthProvider.useEffect": ()=>{
                    try {
                        unsub();
                    } catch (e) {}
                }
            })["AuthProvider.useEffect"];
        }
    }["AuthProvider.useEffect"], []);
    async function signIn(email, password) {
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"]) {
            return {
                success: false,
                error: 'Firebase Auth no está disponible'
            };
        }
        try {
            const userCredential = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["signInWithEmailAndPassword"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"], email, password);
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
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"]) {
            return {
                success: false,
                error: 'Firebase Auth no está disponible. Verifica las variables de entorno.'
            };
        }
        try {
            const provider = new __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["OAuthProvider"]('microsoft.com');
            provider.addScope('openid');
            provider.addScope('profile');
            provider.addScope('email');
            provider.addScope('offline_access');
            provider.addScope('Files.ReadWrite.All');
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["signInWithPopup"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"], provider);
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createUserFolder"])();
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
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"]) {
            return {
                success: false,
                error: 'Firebase Auth no está disponible'
            };
        }
        try {
            const userCredential = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createUserWithEmailAndPassword"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"], email, password);
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$services$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createUserFolder"])();
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
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"]) {
            return {
                success: false,
                error: 'Firebase Auth no está disponible'
            };
        }
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$esm$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["signOut"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auth"]);
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/Desktop/viaticos/src/contexts/AuthContext.tsx",
        lineNumber: 153,
        columnNumber: 5
    }, this);
}
_s1(AuthProvider, "NiO5z6JIqzX62LS5UWDgIqbZYyY=");
_c = AuthProvider;
var _c;
__turbopack_context__.k.register(_c, "AuthProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=Desktop_viaticos_src_0d71a386._.js.map