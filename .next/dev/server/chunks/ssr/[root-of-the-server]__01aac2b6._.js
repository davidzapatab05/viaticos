module.exports = [
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/Desktop/viaticos/src/config/firebase.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "auth",
    ()=>auth,
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$app$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/firebase/app/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/firebase/auth/dist/index.mjs [app-ssr] (ecmascript) <locals>");
;
;
// Validar que las variables de entorno estén configuradas
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''
};
// Validar configuración antes de inicializar
const isValidConfig = firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId;
let app = null;
let auth = null;
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
else if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
;
const __TURBOPACK__default__export__ = app;
}),
"[project]/Desktop/viaticos/src/services/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
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
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/viaticos/src/config/firebase.ts [app-ssr] (ecmascript)");
;
const API_URL = process.env.NEXT_PUBLIC_API_URL || ("TURBOPACK compile-time value", "https://viaticos.davidzapata-dz051099.workers.dev") || 'https://viaticos.davidzapata-dz051099.workers.dev';
async function getAuthToken() {
    if ("TURBOPACK compile-time truthy", 1) {
        throw new Error('getAuthToken solo puede ser llamado en el cliente');
    }
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"]) {
        throw new Error('Firebase Auth no está disponible. Verifica las variables de entorno NEXT_PUBLIC_FIREBASE_*');
    }
    const user = __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"].currentUser;
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
}),
"[project]/Desktop/viaticos/src/contexts/AuthContext.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AuthProvider",
    ()=>AuthProvider,
    "useAuth",
    ()=>useAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$auth$2f$dist$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/firebase/auth/dist/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/viaticos/node_modules/firebase/node_modules/@firebase/auth/dist/node-esm/index.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/viaticos/src/config/firebase.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$services$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Desktop/viaticos/src/services/api.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
const AuthContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createContext"])({
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
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useContext"])(AuthContext);
}
function AuthProvider({ children }) {
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [loading, setLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(true);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"]) {
            setLoading(false);
            return;
        }
        let unsub = ()=>{};
        (async ()=>{
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["setPersistence"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"], __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["browserLocalPersistence"]);
            } catch (e) {
                console.warn('No se pudo establecer persistencia local:', e.message || e);
            }
            unsub = (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["onAuthStateChanged"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"], (user)=>{
                setUser(user);
                setLoading(false);
                if (user) {
                    try {
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$services$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createUserFolder"])().catch((e)=>console.warn('No se pudo crear carpeta al iniciar sesión:', e.message || e));
                    } catch (e) {
                        console.warn('Error invocando createUserFolder en onAuthStateChanged:', e.message || e);
                    }
                }
            });
        })();
        return ()=>{
            try {
                unsub();
            } catch (e) {}
        };
    }, []);
    async function signIn(email, password) {
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"]) {
            return {
                success: false,
                error: 'Firebase Auth no está disponible'
            };
        }
        try {
            const userCredential = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["signInWithEmailAndPassword"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"], email, password);
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
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"]) {
            return {
                success: false,
                error: 'Firebase Auth no está disponible. Verifica las variables de entorno.'
            };
        }
        try {
            const provider = new __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OAuthProvider"]('microsoft.com');
            provider.addScope('openid');
            provider.addScope('profile');
            provider.addScope('email');
            provider.addScope('offline_access');
            provider.addScope('Files.ReadWrite.All');
            const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["signInWithPopup"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"], provider);
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$services$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createUserFolder"])();
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
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"]) {
            return {
                success: false,
                error: 'Firebase Auth no está disponible'
            };
        }
        try {
            const userCredential = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createUserWithEmailAndPassword"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"], email, password);
            try {
                await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$services$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["createUserFolder"])();
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
        if (!__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"]) {
            return {
                success: false,
                error: 'Firebase Auth no está disponible'
            };
        }
        try {
            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$firebase$2f$node_modules$2f40$firebase$2f$auth$2f$dist$2f$node$2d$esm$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["signOut"])(__TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$src$2f$config$2f$firebase$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["auth"]);
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
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$Desktop$2f$viaticos$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AuthContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/Desktop/viaticos/src/contexts/AuthContext.tsx",
        lineNumber: 153,
        columnNumber: 5
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__01aac2b6._.js.map