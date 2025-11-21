'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getCurrentUser } from '@/services/api'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Obtener rol y redirigir
        getCurrentUser()
          .then((data) => {
            const role = data?.user?.role
            if (role === 'super_admin' || role === 'admin') {
              router.push('/admin')
            } else {
              router.push('/dashboard')
            }
          })
          .catch(() => {
            router.push('/dashboard')
          })
      } else {
        router.push('/login')
      }
    }
  }, [user, loading, router])

  return null
}

