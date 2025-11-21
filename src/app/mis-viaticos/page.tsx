'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext' // CORREGIDO: cambiar de @/hooks/useAuth a @/contexts/AuthContext
import { getMisViaticos } from '@/services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'
import { RefreshCw, Eye, Receipt, Loader2, FileText, DollarSign, Grid3x3, Table2, TrendingUp, ArrowRight } from 'lucide-react'
import Layout from '@/components/Layout'
import AuthGuard from '@/components/AuthGuard'

interface Viatico {
  id: string
  fecha: string
  descripcion: string
  tipo: string
  monto: number | string
}

export default function MisViaticosPage() {
  const { user, appUser, loading: authLoading } = useAuth()
  const [viaticos, setViaticos] = useState<Viatico[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const router = useRouter()

  useEffect(() => {
    if (!authLoading && appUser && !appUser.crear_carpeta) {
      router.push('/dashboard')
    }
  }, [appUser, authLoading, router])

  useEffect(() => {
    if (user && !authLoading && appUser?.crear_carpeta) {
      loadViaticos()
    }
  }, [user, authLoading, appUser])

  const loadViaticos = async () => {
    // No cargar si aún está verificando autenticación
    if (authLoading) {
      return
    }

    // Si no hay usuario, AuthGuard se encargará de redirigir
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')

      const data = await getMisViaticos()
      setViaticos(data.viaticos || [])
    } catch (err) {
      const errorMessage = (err as Error).message || 'Error al cargar los viáticos'

      // Si el error es de autenticación, mostrar mensaje más claro
      if (errorMessage.includes('no autenticado') || errorMessage.includes('No autorizado') || errorMessage.includes('Sesión expirada')) {
        setError('Sesión expirada. Por favor, inicia sesión nuevamente.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const total = viaticos.reduce((sum, v) => sum + parseFloat(String(v.monto || 0)), 0)
  const totalCount = viaticos.length

  const groupedByMonth = viaticos.reduce((acc, v) => {
    const monthKey = format(new Date(v.fecha), 'MMMM yyyy', { locale: es })
    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    acc[monthKey].push(v)
    return acc
  }, {} as Record<string, Viatico[]>)

  // Mostrar loading mientras se verifica autenticación
  if (authLoading || !appUser) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Verificando autenticación...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (loading && viaticos.length === 0) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Cargando tus viáticos...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <AuthGuard>
      <Layout>
        <TooltipProvider>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Mis Viáticos</h1>
                <p className="text-muted-foreground">
                  Consulta y gestiona todos tus registros
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
                    >
                      {viewMode === 'grid' ? <Table2 className="h-4 w-4" /> : <Grid3x3 className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Cambiar vista</p>
                  </TooltipContent>
                </Tooltip>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={loadViaticos}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total de Viáticos</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCount}</div>
                  <p className="text-xs text-muted-foreground">Registros totales</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Gastado</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">S/ {total.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">Suma total</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Promedio</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalCount > 0 ? `S/ ${(total / totalCount).toFixed(2)}` : 'S/ 0.00'}
                  </div>
                  <p className="text-xs text-muted-foreground">Por viático</p>
                </CardContent>
              </Card>
            </div>

            {viaticos.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No tienes viáticos registrados</h3>
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Comienza registrando tu primer viático
                  </p>
                  <Button asChild>
                    <Link href="/nuevo-viatico">
                      Crear Primer Viático
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === 'table' ? (
              <Card>
                <CardHeader>
                  <CardTitle>Lista de Viáticos</CardTitle>
                  <CardDescription>Vista detallada de todos tus viáticos</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viaticos.map((viatico) => (
                        <TableRow key={viatico.id}>
                          <TableCell className="font-medium">
                            {format(new Date(viatico.fecha), 'dd MMM yyyy', { locale: es })}
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="truncate block max-w-[300px]">{viatico.descripcion}</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">{viatico.descripcion}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{viatico.tipo || 'otro'}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            S/ {parseFloat(String(viatico.monto || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {/* Botón de ver eliminado a petición del usuario */}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedByMonth).map(([month, monthViaticos]) => {
                  const monthTotal = monthViaticos.reduce((sum, v) => sum + parseFloat(String(v.monto || 0)), 0)
                  return (
                    <Card key={month}>
                      <CardHeader>
                        <CardTitle className="capitalize">{month}</CardTitle>
                        <CardDescription>
                          {monthViaticos.length} viático{monthViaticos.length !== 1 ? 's' : ''} • Total: S/ {monthTotal.toFixed(2)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {monthViaticos.map((viatico) => (
                            <Card key={viatico.id}>
                              <CardHeader>
                                <CardTitle className="text-base">{viatico.descripcion || 'Sin descripción'}</CardTitle>
                                <div className="text-sm text-muted-foreground">
                                  <Badge variant="outline" className="mr-2">{viatico.tipo || 'otro'}</Badge>
                                  {format(new Date(viatico.fecha), 'dd MMM', { locale: es })}
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center justify-between">
                                  <div className="text-2xl font-bold">S/ {parseFloat(String(viatico.monto || 0)).toFixed(2)}</div>
                                  {/* Botón de ver eliminado */}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </TooltipProvider >
      </Layout >
    </AuthGuard >
  )
}
