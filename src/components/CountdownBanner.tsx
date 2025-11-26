import { useViaticoDeadline } from '@/hooks/useViaticoDeadline'
import { Clock, AlertCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function CountdownBanner() {
    const { isGracePeriod, timeLeft, activeDateDisplay } = useViaticoDeadline()
    const router = useRouter()

    // Si no hay tiempo restante (cargando o error), no mostrar
    if (!timeLeft) return null

    return (
        <div className={`${isGracePeriod ? 'bg-orange-600' : 'bg-blue-600'} text-white px-3 py-1.5 shadow-md relative z-50`}>
            <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-2 text-xs sm:text-sm">
                <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-center sm:text-left">
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                        <span className="font-bold whitespace-nowrap">
                            Cierre en: {timeLeft}
                        </span>
                    </div>
                    <span className="hidden sm:inline">|</span>
                    <span className="opacity-90">Fecha: <strong>{activeDateDisplay}</strong></span>
                </div>
                <div className="flex items-center gap-2 mt-1 sm:mt-0">
                    <Button
                        variant="secondary"
                        size="sm"
                        className={`h-6 text-[10px] sm:text-xs px-2 bg-white border-none ${isGracePeriod ? 'text-orange-700 hover:bg-orange-50' : 'text-blue-700 hover:bg-blue-50'}`}
                        onClick={() => router.push('/nuevo-viatico')}
                    >
                        Registrar viatico
                    </Button>
                </div>
            </div>
        </div>
    )
}
