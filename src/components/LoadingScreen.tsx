import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingScreenProps {
  message?: string
  className?: string
}

export default function LoadingScreen({ message = 'Cargando...', className }: LoadingScreenProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center min-h-screen bg-background", className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>
      <p className="mt-6 text-sm font-medium text-muted-foreground animate-pulse">
        {message}
      </p>
    </div>
  )
}

