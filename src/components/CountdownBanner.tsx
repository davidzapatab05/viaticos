import { useViaticoDeadline } from '@/hooks/useViaticoDeadline'
import { Clock, AlertCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function CountdownBanner() {
    const { isGracePeriod, timeLeft, activeDateDisplay, activeDate } = useViaticoDeadline()
    const router = useRouter()
    const [closing, setClosing] = useState(false)

    // Si no hay tiempo restante (cargando o error), no mostrar
    if (!timeLeft) return null

    const handleCloseDay = async () => {
        if (!confirm(`¿Estás seguro de cerrar el día ${activeDateDisplay}? Esta acción no se puede deshacer y los siguientes viáticos se registrarán con fecha de hoy.`)) {
            return
        }

        setClosing(true)
        try {
            // Importar dinámicamente para evitar ciclos o problemas de SSR si fuera el caso, aunque aquí es cliente
            const { closeDay } = await import('@/services/api')
            await closeDay(activeDate.toISOString().split('T')[0])
            // Forzar recarga para actualizar estados globales
            window.location.reload()
        } catch (e) {
            alert('Error al cerrar el día: ' + (e as Error).message)
        } finally {
            setClosing(false)
        }
    }

    return (
        <div className={`${isGracePeriod ? 'bg-orange-600' : 'bg-blue-600'} text-white px-3 py-1.5 shadow-md relative z-50`}>
            <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2 text-xs sm:text-sm">
                <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-center sm:text-left">
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                        <span className="font-bold whitespace-nowrap">
                            {isGracePeriod ? 'CIERRE AYER:' : 'CIERRE:'} {timeLeft}
                        </span>
                    </div>
                    <span className="hidden sm:inline">|</span>
                    <span className="opacity-90">Tiempo restante para viatico del dia: <strong>{activeDateDisplay}</strong></span>
                </div>
                <div className="flex items-center gap-2 mt-1 sm:mt-0">
                    <Button
                        variant="secondary"
                        size="sm"
                        className={`h-6 text-[10px] sm:text-xs px-2 bg-white border-none ${isGracePeriod ? 'text-orange-700 hover:bg-orange-50' : 'text-blue-700 hover:bg-blue-50'}`}
                        onClick={isGracePeriod ? handleCloseDay : () => router.push('/nuevo-viatico')}
                        disabled={closing}
                    >
                        {closing ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            isGracePeriod ? 'Cerrar día' : 'Registrar viatico'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
