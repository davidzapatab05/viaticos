import { useViaticoDeadline } from '@/hooks/useViaticoDeadline'
import { Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function CountdownBanner() {
    const { timeLeft, activeDateDisplay, isLastHour } = useViaticoDeadline()
    const router = useRouter()

    // Si no hay tiempo restante (cargando o error), no mostrar
    if (!timeLeft) return null

    return (
        <div className={`${isLastHour ? 'bg-orange-600' : 'bg-blue-600'} text-white px-2 py-1 shadow-md relative z-50`}>
            <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 text-xs sm:text-sm">
                <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-0.5 text-center sm:text-left">
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-pulse" />
                        <span className="font-bold whitespace-nowrap">
                            Cierre en: {timeLeft}
                        </span>
                    </div>
                    <span className="hidden sm:inline">|</span>
                    <span className="opacity-90 text-[10px] sm:text-xs">Fecha: <strong>{activeDateDisplay}</strong></span>
                </div>
                <div className="flex items-center gap-2">

                    <Button
                        variant="secondary"
                        size="sm"
                        className={`h-5 sm:h-6 text-[10px] sm:text-xs px-2 bg-white border-none ${isLastHour ? 'text-orange-700 hover:bg-orange-50' : 'text-blue-700 hover:bg-blue-50'}`}
                        onClick={() => router.push('/nuevo-viatico')}
                    >
                        Registrar viatico
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className={`h-5 sm:h-6 text-[10px] sm:text-xs px-2 bg-white border-none ${isLastHour ? 'text-orange-700 hover:bg-orange-50' : 'text-blue-700 hover:bg-blue-50'}`}
                        onClick={() => router.push('/nuevo-gasto')}
                    >
                        Registrar gasto
                    </Button>
                </div>
            </div>
        </div>
    )
}
