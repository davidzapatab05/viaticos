import { useState, useEffect } from 'react'
import { subscribeToNotifications } from '@/services/api'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export function usePushNotifications() {
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [permission, setPermission] = useState<NotificationPermission>('default')

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission)
        }

        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                registration.pushManager.getSubscription().then(subscription => {
                    setIsSubscribed(!!subscription)
                })
            })
        }
    }, [])

    const subscribe = async () => {
        if (!VAPID_PUBLIC_KEY) {
            console.error('VAPID Public Key not found')
            setError('Configuración de notificaciones incompleta')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const registration = await navigator.serviceWorker.ready

            // Request permission if not granted
            if (Notification.permission === 'default') {
                const result = await Notification.requestPermission()
                setPermission(result)
                if (result !== 'granted') {
                    throw new Error('Permiso de notificaciones denegado')
                }
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            })

            await subscribeToNotifications(subscription)
            setIsSubscribed(true)
            console.log('User subscribed to push notifications')
        } catch (err) {
            console.error('Failed to subscribe the user: ', err)
            setError('Error al suscribirse a las notificaciones')
        } finally {
            setLoading(false)
        }
    }

    return { isSubscribed, subscribe, loading, error, permission }
}
