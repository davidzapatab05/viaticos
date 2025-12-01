'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function InstallPWA() {
    const [supportsPWA, setSupportsPWA] = useState(false)
    const [promptInstall, setPromptInstall] = useState<any>(null)

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault()
            setSupportsPWA(true)
            setPromptInstall(e)
        }
        window.addEventListener('beforeinstallprompt', handler)

        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const isStandalone = typeof window !== 'undefined' && (
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://')
    )

    const onClick = (evt: React.MouseEvent) => {
        evt.preventDefault()
        if (!promptInstall) {
            return
        }
        promptInstall.prompt()
    }

    if (!supportsPWA || isStandalone) {
        return null
    }

    return (
        <Button
            onClick={onClick}
            variant="outline"
            size="sm"
            className="fixed bottom-4 right-4 z-50 shadow-lg gap-2 animate-in fade-in slide-in-from-bottom-4"
        >
            <Download className="h-4 w-4" />
            Instalar App
        </Button>
    )
}
