'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/service-worker.js')
                .then((registration) => {
                    console.log('Service Worker registrado:', registration)
                })
                .catch((error) => {
                    console.error('Error registrando Service Worker:', error)
                })
        }
    }, [])

    return null
}
