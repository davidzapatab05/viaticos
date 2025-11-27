'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingContextType {
    isLoading: boolean
    loadingMessage: string
    setLoading: (message?: string) => void
    clearLoading: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: ReactNode }) {
    const [isLoading, setIsLoading] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState('Cargando...')

    const setLoading = (message: string = 'Cargando...') => {
        setLoadingMessage(message)
        setIsLoading(true)
    }

    const clearLoading = () => {
        setIsLoading(false)
    }

    return (
        <LoadingContext.Provider value={{ isLoading, loadingMessage, setLoading, clearLoading }}>
            {children}

            {/* Global Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <p className="text-lg font-medium text-foreground">{loadingMessage}</p>
                    </div>
                </div>
            )}
        </LoadingContext.Provider>
    )
}

export function useLoading() {
    const context = useContext(LoadingContext)
    if (context === undefined) {
        throw new Error('useLoading must be used within a LoadingProvider')
    }
    return context
}
