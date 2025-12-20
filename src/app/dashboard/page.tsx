'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Camera, List, Settings, Info, TrendingUp, ArrowRight, DollarSign, FileText } from 'lucide-react'
import Link from 'next/link'
import Layout from '@/components/Layout'
import AuthGuard from '@/components/AuthGuard'

export default function DashboardPage() {
  const { user, appUser } = useAuth()

  const cards = []

  if (appUser) {
    cards.push({
      title: 'Nuevo Viático',
      description: 'Registra un nuevo comprobante con foto o PDF',
      icon: Camera,
      link: '/nuevo-viatico',
    })

    cards.push({
      title: 'Mis Viáticos',
      description: 'Consulta y gestiona todos tus registros',
      icon: List,
      link: '/mis-viaticos',
    })

    cards.push({
      title: 'Nuevo Gasto',
      description: 'Registra un nuevo gasto con foto o PDF',
      icon: DollarSign,
      link: '/nuevo-gasto',
    })

    cards.push({
      title: 'Mis Gastos',
      description: 'Consulta y gestiona todos tus gastos',
      icon: FileText,
      link: '/mis-gastos',
    })
  }

  if (appUser?.role === 'admin' || appUser?.role === 'super_admin') {
    cards.push({
      title: 'Panel Admin',
      description: 'Administra todos los viáticos del sistema',
      icon: Settings,
      link: '/admin',
    })
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              ¡Bienvenido{user?.displayName ? `, ${user.displayName}` : user?.email ? `, ${user.email.split('@')[0]}` : ''}!
            </h1>
            <p className="text-muted-foreground">
              Gestiona tus viáticos de manera rápida y profesional
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => {
              const Icon = card.icon
              return (
                <Card key={card.link}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle>{card.title}</CardTitle>
                        <CardDescription>{card.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full">
                      <Link href={card.link}>
                        Acceder
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  <CardTitle>¿Cómo funciona?</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 list-decimal list-inside text-sm text-muted-foreground">
                  <li>Toma una foto de tu comprobante (boleta, ticket, factura)</li>
                  <li>Registra el monto y una descripción detallada</li>
                  <li>Sube el viático al sistema de forma segura</li>
                  <li>Tu comprobante se guardará automáticamente en OneDrive</li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  <CardTitle>Consejos Útiles</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 list-disc list-inside text-sm text-muted-foreground">
                  <li>Asegúrate de que la foto del comprobante sea clara y legible</li>
                  <li>Puedes subir imágenes JPG, PNG, WEBP o archivos PDF</li>
                  <li>El tamaño máximo permitido es de 10MB por archivo</li>
                  <li>Revisa tus viáticos en cualquier momento desde "Mis Viáticos"</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  )
}
