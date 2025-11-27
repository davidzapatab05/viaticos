module.exports = [
"[project]/src/config/firebase.ts [app-ssr] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.resolve().then(() => {
        return parentImport("[project]/src/config/firebase.ts [app-ssr] (ecmascript)");
    });
});
}),
"[project]/node_modules/firebase/auth/dist/index.mjs [app-ssr] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/node_modules_firebase_auth_dist_index_mjs_f66886dd._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/node_modules/firebase/auth/dist/index.mjs [app-ssr] (ecmascript)");
    });
});
}),
"[project]/src/services/api.ts [app-ssr] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.resolve().then(() => {
        return parentImport("[project]/src/services/api.ts [app-ssr] (ecmascript)");
    });
});
}),
"[project]/node_modules/sweetalert2/dist/sweetalert2.esm.all.js [app-ssr] (ecmascript, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/node_modules_sweetalert2_dist_sweetalert2_esm_all_8055e0e0.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/node_modules/sweetalert2/dist/sweetalert2.esm.all.js [app-ssr] (ecmascript)");
    });
});
}),
];