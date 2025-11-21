'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentUser } from '@/services/api'
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
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login')
        return
      }

      checkRole()
    }
  }, [user, authLoading, router])

  async function checkRole() {
    try {
      const userData = await getCurrentUser()
      const role = userData?.user?.role
      setUserRole(role)

      if (!allowedRoles.includes(role)) {
        router.push(redirectTo)
        return
      }
    } catch (e) {
      router.push(redirectTo)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user || !userRole || !allowedRoles.includes(userRole)) {
    return null
  }

  return <>{children}</>
}

