import { useState, useEffect, useRef } from 'react'
import { format, subDays, isBefore, set, addDays, differenceInSeconds } from 'date-fns'
import { es } from 'date-fns/locale'
import { useAuth } from '@/contexts/AuthContext'
import { getPeruNow } from '@/lib/peru-time'

export function useViaticoDeadline() {

    const [activeDate, setActiveDate] = useState<Date>(new Date())
    const [activeDateDisplay, setActiveDateDisplay] = useState<string>('')
    const [timeLeft, setTimeLeft] = useState<string>('')
    const [isGracePeriod, setIsGracePeriod] = useState<boolean>(false)
    const [isLastHour, setIsLastHour] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(true)

    // Funci?n para disparar notificaciones
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

    const previousGracePeriod = useRef<boolean | null>(null)

    useEffect(() => {
        const calculateActiveDate = () => {
            // Obtener hora actual en Per? expl?citamente
            const now = getPeruNow()
            const today = new Date(now)
            today.setHours(0, 0, 0, 0)

            const yesterday = subDays(today, 1)

            // Definir el l?mite de las 12:00 PM de hoy (hora Per?)
            const cutoffTime = set(today, { hours: 10, minutes: 0, seconds: 0, milliseconds: 0 })

            // Verificar si estamos antes de las 12 PM
            const isBeforeCutoff = isBefore(now, cutoffTime)

            let effectiveDate = today
            let gracePeriodActive = false

            if (isBeforeCutoff) {
                // Estamos antes de las 12 PM.
                // La fecha activa es AYER (autom?tico).
                effectiveDate = yesterday
                gracePeriodActive = true
            } else {
                // Ya pasaron las 12 PM, la fecha activa es HOY (autom?tico).
                effectiveDate = today
                gracePeriodActive = false
            }

            // Detectar cambio de estado (cruce de las 12 PM) y recargar
            if (previousGracePeriod.current !== null && previousGracePeriod.current !== gracePeriodActive) {
                window.location.reload()
                return // Detener ejecuci?n para evitar actualizaciones de estado en componente desmontado
            }
            previousGracePeriod.current = gracePeriodActive

            // Solo actualizar el estado si la fecha ha cambiado (evitar re-renders innecesarios)
            setActiveDate(prevDate => {
                if (prevDate.getTime() !== effectiveDate.getTime()) {
                    return effectiveDate
                }
                return prevDate
            })

            setActiveDateDisplay(prevDisplay => {
                const newDisplay = format(effectiveDate, "EEEE d 'de' MMMM", { locale: es })
                if (prevDisplay !== newDisplay) return newDisplay
                return prevDisplay
            })

            setIsGracePeriod(prevGrace => {
                if (prevGrace !== gracePeriodActive) return gracePeriodActive
                return prevGrace
            })

            if (gracePeriodActive) {
                // Caso 1: Periodo de gracia (antes de las 12 PM, registrando para ayer)
                // Deadline: Hoy 12:00 PM
                const diff = differenceInSeconds(cutoffTime, now)
                if (diff > 0) {
                    const hours = Math.floor(diff / 3600)
                    const minutes = Math.floor((diff % 3600) / 60)
                    const seconds = diff % 60
                    setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)

                    // Activar estado de ?ltima hora
                    setIsLastHour(diff <= 3600)

                    // Notificaci?n cuando falte 1 hora (3600 segundos) o menos
                    if (diff <= 3600 && diff > 3590) {
                        triggerNotification(
                            "? Cierre de Viáticos en 1 hora",
                            "Recuerda registrar tus Viáticos pendientes de ayer antes de las 10:00 AM."
                        )
                    }
                } else {
                    setTimeLeft('00:00:00')
                    setIsLastHour(false)
                }
            } else {
                // Caso 2: Periodo normal (despu?s de las 12 PM)
                // Deadline: Ma?ana 12:00 PM
                const tomorrowCutoff = addDays(cutoffTime, 1)
                const diff = differenceInSeconds(tomorrowCutoff, now)

                if (diff > 0) {
                    const hours = Math.floor(diff / 3600)
                    const minutes = Math.floor((diff % 3600) / 60)
                    const seconds = diff % 60
                    setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)

                    // Tambi?n activar ?ltima hora si estamos cerca del deadline de ma?ana (aunque es raro estar conectado 24h)
                    setIsLastHour(diff <= 3600)
                } else {
                    setTimeLeft('00:00:00')
                    setIsLastHour(false)
                }
            }
            setLoading(false)
        }

        calculateActiveDate()
        const interval = setInterval(calculateActiveDate, 1000)

        // Solicitar permisos de notificaci?n al montar
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission()
        }

        return () => clearInterval(interval)
    }, [])

    return {
        activeDate,
        activeDateDisplay,
        timeLeft,
        isGracePeriod,
        isLastHour,
        loading
    }
}
