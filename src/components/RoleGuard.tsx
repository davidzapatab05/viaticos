'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
  redirectTo?: string
}

export default function RoleGuard({
  children,
  allowedRoles = ['admin', 'super_admin'],
  redirectTo = '/dashboard'
}: RoleGuardProps) {
  const { user, appUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }

      // Si ya tenemos appUser, verificamos el rol directamente
      if (appUser) {
        if (allowedRoles.includes(appUser.role)) {
          setAuthorized(true)
        } else {
          router.push(redirectTo)
        }
      }
    }
  }, [user, appUser, authLoading, router, allowedRoles, redirectTo])

  if (authLoading || (!authorized && user)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return <>{children}</>
}

