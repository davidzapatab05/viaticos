'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentUser } from '@/services/api'
import { Loader2 } from 'lucide-react'
import { useToast } from "@/lib/use-toast"

interface AuthGuardProps {
  children: React.ReactNode
  redirectTo?: string
}

export default function AuthGuard({ 
  children, 
  redirectTo = '/login' 
}: AuthGuardProps) {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    if (loading) {
      return
    }

    if (!user) {
      router.push(redirectTo)
      return
    }

    // Verificar estado del usuario si está autenticado
    if (user) {
      getCurrentUser().then((userData) => {
        if (userData?.user?.estado === 'inactivo') {
          signOut().then(() => {
            toast({
              title: 'Cuenta desactivada',
              description: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
              variant: 'destructive',
            })
            router.push('/login')
          })
        }
      }).catch((error) => {
        if (error.message.includes('Tu cuenta ha sido desactivada')) {
          signOut().then(() => {
            toast({
              title: 'Cuenta desactivada',
              description: error.message,
              variant: 'destructive',
            })
            router.push('/login')
          })
        }
        // Ignorar otros errores de verificación
      })
    }
  }, [user, loading, router, redirectTo, signOut, toast])

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}

