import { Loader2 } from 'lucide-react'

interface LoadingOverlayProps {
    isLoading: boolean
    message?: string
}

export default function LoadingOverlay({ isLoading, message = 'Procesando...' }: LoadingOverlayProps) {
    if (!isLoading) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-2xl flex flex-col items-center gap-4 min-w-[300px]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{message}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Por favor, espera...</p>
            </div>
        </div>
    )
}
