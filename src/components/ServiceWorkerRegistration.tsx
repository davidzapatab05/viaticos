'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then((registration) => {
                    // Service Worker registrado
                })
                .catch((error) => {
                    // Error registrando Service Worker
                })
        }
    }, [])

    return null
}
