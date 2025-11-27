'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentUser } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, LogIn } from 'lucide-react'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signInWithMicrosoft } = useAuth()
  const router = useRouter()

  const handleMicrosoft = async () => {
    setError('')
    setLoading(true)
    try {
      const res = await signInWithMicrosoft()
      if (res && res.success) {
        // NO llamar a ensureMyOneDriveFolder - las carpetas se crean automáticamente al subir archivos
        await new Promise(resolve => setTimeout(resolve, 500))

        try {


          const userData = await getCurrentUser()
          // Siempre redirigir al dashboard, los admins pueden ir al panel desde el menú
          router.push('/dashboard')
        } catch (e) {
          router.push('/dashboard')
        }
      } else {
        setError(res?.error || 'Error al iniciar con Microsoft')
      }
    } catch (e) {
      setError('Error al iniciar con Microsoft')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa con tu cuenta de Microsoft para continuar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button
            onClick={handleMicrosoft}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando sesión...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Iniciar con Microsoft
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

