import { useState, useEffect } from 'react'
import { format, subDays, isBefore, set, addDays, differenceInSeconds } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'

export function useViaticoDeadline() {
    const { appUser } = useAuth()
    const [activeDate, setActiveDate] = useState<Date>(new Date())
    const [activeDateDisplay, setActiveDateDisplay] = useState<string>('')
    const [timeLeft, setTimeLeft] = useState<string>('')
    const [isGracePeriod, setIsGracePeriod] = useState<boolean>(false)
    const [lastClosedDate, setLastClosedDate] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(true)

    useEffect(() => {
        if (appUser?.last_closed_date) {
            setLastClosedDate(appUser.last_closed_date)
        }
    }, [appUser])

    // Función para disparar notificaciones
    const triggerNotification = (title: string, body: string) => {
        if (!('Notification' in window)) return

        // Evitar spam de notificaciones usando sessionStorage
        const key = `notified-${new Date().toDateString()}-${title}`
        if (sessionStorage.getItem(key)) return

        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: '/icon-192x192.png' })
            sessionStorage.setItem(key, 'true')
        }
    }

    useEffect(() => {
        const calculateActiveDate = () => {
            // Obtener hora actual en Perú explícitamente
            const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Lima" }))
            const today = new Date(now)
            today.setHours(0, 0, 0, 0)

            const yesterday = subDays(today, 1)

            // Definir el límite de las 10:00 AM de hoy (hora Perú)
            const cutoffTime = set(today, { hours: 10, minutes: 0, seconds: 0, milliseconds: 0 })

            // Verificar si estamos antes de las 10 AM
            const isBeforeCutoff = isBefore(now, cutoffTime)

            let effectiveDate = today
            let gracePeriodActive = false

            if (isBeforeCutoff) {
                // Estamos antes de las 10 AM.
                // Por defecto, la fecha activa es AYER, a menos que el usuario ya haya cerrado ayer.

                const yesterdayString = format(yesterday, 'yyyy-MM-dd')

                if (lastClosedDate === yesterdayString) {
                    // El usuario ya cerró ayer manualmente, así que la fecha activa es HOY
                    effectiveDate = today
                    gracePeriodActive = false
                } else {
                    // El usuario NO ha cerrado ayer, así que sigue habilitado para ayer
                    effectiveDate = yesterday
                    gracePeriodActive = true
                }
            } else {
                // Ya pasaron las 10 AM, la fecha activa es HOY
                effectiveDate = today
                gracePeriodActive = false
            }

            setActiveDate(effectiveDate)
            setActiveDateDisplay(format(effectiveDate, "EEEE d 'de' MMMM", { locale: es }))
            setIsGracePeriod(gracePeriodActive)

            if (gracePeriodActive) {
                // Caso 1: Periodo de gracia (antes de las 10 AM, registrando para ayer)
                // Deadline: Hoy 10:00 AM
                const diff = differenceInSeconds(cutoffTime, now)
                if (diff > 0) {
                    const hours = Math.floor(diff / 3600)
                    const minutes = Math.floor((diff % 3600) / 60)
                    const seconds = diff % 60
                    setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)

                    // Notificación cuando falte 1 hora (3600 segundos) o menos
                    if (diff <= 3600 && diff > 3590) {
                        triggerNotification(
                            "⏳ Cierre de Viáticos en 1 hora",
                            "Recuerda registrar tus viáticos pendientes de ayer antes de las 10:00 AM. Si ya terminaste, no olvides cerrar tu día."
                        )
                    }
                } else {
                    setTimeLeft('00:00:00')
                }
            } else {
                // Caso 2: Periodo normal (después de las 10 AM o ya cerrado ayer)
                // Deadline: Mañana 10:00 AM
                const tomorrowCutoff = addDays(cutoffTime, 1)
                const diff = differenceInSeconds(tomorrowCutoff, now)

                if (diff > 0) {
                    const hours = Math.floor(diff / 3600)
                    const minutes = Math.floor((diff % 3600) / 60)
                    const seconds = diff % 60
                    setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
                } else {
                    setTimeLeft('00:00:00')
                }
            }
            setLoading(false)
        }

        calculateActiveDate()
        const interval = setInterval(calculateActiveDate, 1000)

        // Solicitar permisos de notificación al montar
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }

        return () => clearInterval(interval)
    }, [lastClosedDate])

    return {
        activeDate,
        activeDateDisplay,
        timeLeft,
        isGracePeriod,
        loading,
        refreshLastClosedDate: async () => {
            // Placeholder si se necesita refrescar manualmente
        }
    }
}
