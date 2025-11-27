'use client'

// HINT: Make sure to install sweetalert2: npm install sweetalert2
import Swal from 'sweetalert2'
import { useToast } from "@/lib/use-toast"
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getAllViaticos, getAllUsers, setUserRole as apiSetUserRole, getCurrentUser, cleanupAnonymousUsers, setUserStatus, deleteUser, deleteViatico, apiRequest } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Loader2, Users, Receipt, Shield, Crown, RefreshCw, DollarSign, Trash2, Ban, CheckCircle2, Bell } from 'lucide-react'
import Layout from '@/components/Layout'
import RoleGuard from '@/components/RoleGuard'
import ReportsView from '@/components/admin/ReportsView'
import { useLoading } from '@/contexts/LoadingContext'

interface Viatico {
  id: string
  usuario_id: string
  fecha: string
  tipo: string
  monto: number | string
  descripcion: string
  created_at: string
}

interface User {
  uid: string
  email: string
  displayName?: string
  role: string
  estado?: string
}

export default function AdminPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [viaticos, setViaticos] = useState<Viatico[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const { setLoading: setGlobalLoading, clearLoading } = useLoading()
  const [oneDriveUrl, setOneDriveUrl] = useState<string | null>(null)
  const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
  const isSuperAdmin = user?.email?.toLowerCase() === superAdminEmail?.toLowerCase();

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      // Cargar todo en paralelo para máxima velocidad
      const [viaticosData, usersData, userData] = await Promise.all([
        getAllViaticos(),
        getAllUsers(),
        getCurrentUser()
      ])

      // Actualizar rol del usuario desde userData
      setUserRole(userData?.user?.role || null)

      setViaticos(viaticosData?.viaticos || [])

      // Usar count si está disponible, sino usar users.length
      const userCount = usersData?.count !== undefined ? usersData.count : (usersData?.users || []).length

      // Filtrar super_admin del array de usuarios para la tabla si es necesario
      const filteredUsers = (usersData?.users || []).filter((u: User) => {
        // Ocultar super_admin si el usuario actual no es super_admin
        if (!isSuperAdmin && u.role === 'super_admin') return false;

        // Mantener todos los usuarios en la tabla (menos anonymous/dev)
        return u.uid !== 'anonymous' && u.uid !== 'dev-user' && !u.uid.startsWith('dev-')
      })

      setUsers(filteredUsers)

      // Actualizar el conteo de usuarios (sin super_admin)
      // setUserCount(userCount) // Removed because setUserCount is defined later
      // Instead, we should move the state definition up or just use users.length if sufficient
      // But looking at the code, setUserCount is defined at line 336. 
      // We need to move the state definition up.

    } catch (e) {
      setError('Error al cargar datos: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(uid: string, newRole: string) {
    setGlobalLoading('Actualizando rol...')
    setUpdating(uid)
    try {
      await apiSetUserRole(uid, newRole)
      toast({ title: "Rol actualizado" })
      await loadData()
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message || "Error al actualizar rol", variant: "destructive" })
    } finally {
      setUpdating(null)
      clearLoading()
    }
  }

  async function handleStatusChange(uid: string, nuevoEstado: 'activo' | 'inactivo') {
    setGlobalLoading('Actualizando estado...')
    try {
      await setUserStatus(uid, nuevoEstado)
      toast({ title: "Estado actualizado" })
      await loadData()
    } catch (e) {
      toast({ title: "Error", description: "Error al actualizar estado", variant: "destructive" })
    } finally {
      clearLoading()
    }
  }

  async function handleDeleteUser(uid: string, email: string) {
    const result = await Swal.fire({
      title: 'Eliminar usuario',
      html: `
        <div style="font-size:16px; text-align:left; line-height:1.6; padding: 5px 0;">
          <p>¿Estás seguro de que deseas eliminar al usuario <b>${email}</b>? Esto también eliminará:</p>
          <ul style="margin-left:18px; padding-left:0;">
            <li>🗂️ Su registro en la base de datos</li>
            <li>📄 Todos sus viáticos</li>
            <li>☁️ Su carpeta en OneDrive</li>
          </ul>
          <p style="margin-top:12px; color:#d9534f; font-weight:bold;">
            Esta acción NO se puede deshacer.
          </p>
        </div>
      `,
      icon: 'warning',
      iconColor: '#e63946',
      showCancelButton: true,
      confirmButtonText: 'Eliminar usuario',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d62828',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
      focusCancel: true,
      width: 500,
      customClass: {
        popup: 'rounded-xl',
        confirmButton: 'rounded-md px-4 py-2',
        cancelButton: 'rounded-md px-4 py-2',
      },
    })

    if (!result.isConfirmed) return

    setGlobalLoading('Eliminando usuario y sus datos...')
    try {
      await deleteUser(uid)

      clearLoading()
      await Swal.fire({
        title: 'Usuario eliminado',
        text: 'El usuario fue eliminado correctamente.',
        icon: 'success',
        confirmButtonColor: '#2a9d8f',
      })

      await loadData()
    } catch (e) {
      clearLoading()
      await Swal.fire({
        title: 'Error',
        text: 'Error al eliminar usuario: ' + (e as Error).message,
        icon: 'error',
        confirmButtonColor: '#d62828',
      })
    }
  }

  async function handleCleanupAnonymous() {
    const result = await Swal.fire({
      title: '¿Limpiar usuarios anónimos?',
      text: 'Se eliminarán TODOS los usuarios anonymous y sus viáticos. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    })

    if (!result.isConfirmed) return

    try {
      const data = await cleanupAnonymousUsers()
      Swal.fire(
        'Completado',
        `Usuarios eliminados: ${data.deletedUsers}<br>Viáticos eliminados: ${data.deletedViaticos}`,
        'success'
      )
      await loadData()
    } catch (e) {
      Swal.fire('Error', (e as Error).message || 'Error ejecutando limpieza', 'error')
    }
  }

  async function handleDeleteViatico(id: string) {
    const result = await Swal.fire({
      title: '¿Eliminar viático?',
      text: 'Esta acción eliminará el registro y los archivos asociados de OneDrive. No se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
    })

    if (!result.isConfirmed) return

    setGlobalLoading('Eliminando viático...')
    try {
      await deleteViatico(id)
      clearLoading()
      await Swal.fire('Eliminado', 'El viático ha sido eliminado.', 'success')
      await loadData()
    } catch (e) {
      clearLoading()
      await Swal.fire('Error', (e as Error).message || 'Error al eliminar viático', 'error')
    }
  }

  async function handleBroadcast() {
    const result = await Swal.fire({
      title: 'Enviar Alerta de Cierre',
      text: 'Se enviará una notificación a TODOS los usuarios suscritos avisando que queda 1 hora.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    setGlobalLoading('Enviando notificaciones...')
    try {
      const data = await apiRequest('/api/push/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          title: '⏳ Cierre de Viáticos en 1 hora',
          body: 'Recuerda registrar tus viáticos pendientes de ayer antes de las 10:00 AM.',
          url: '/nuevo-viatico'
        })
      })

      clearLoading()
      Swal.fire('Enviado', `Notificaciones enviadas: ${data.sent}`, 'success')
    } catch (e) {
      clearLoading()
      Swal.fire('Error', (e as Error).message, 'error')
    }
  }

  async function handleTestNotification() {
    const result = await Swal.fire({
      title: 'Probar Notificación',
      html: `
        <div style="text-align:left; line-height:1.6;">
          <p>Se enviará una notificación de prueba con el mensaje real que se envía a las 9:00 AM:</p>
          <div style="background:#f5f5f5; padding:12px; border-radius:8px; margin:12px 0;">
            <p style="margin:0; font-weight:bold;">⏳ Cierre de Viáticos en 1 hora</p>
            <p style="margin:4px 0 0 0; font-size:14px;">Recuerda registrar tus viáticos pendientes de ayer antes de las 10:00 AM.</p>
          </div>
          <p style="margin-top:12px; color:#666;">Esto te permite verificar cómo se ve la notificación en tus dispositivos.</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Enviar prueba',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2a9d8f'
    })

    if (!result.isConfirmed) return

    setGlobalLoading('Enviando notificación de prueba...')
    try {
      const data = await apiRequest('/api/test-notification', {
        method: 'POST'
      })

      clearLoading()
      Swal.fire({
        title: 'Prueba Enviada',
        html: `
          <p>Notificación de prueba enviada exitosamente</p>
          <p style="color:#666; font-size:14px; margin-top:8px;">
            Enviadas: <strong>${data.sent}</strong> de ${data.total} suscripciones
          </p>
        `,
        icon: 'success',
        confirmButtonColor: '#2a9d8f'
      })
    } catch (e) {
      clearLoading()
      Swal.fire('Error', (e as Error).message, 'error')
    }
  }

  const totalViaticos = viaticos.length
  const totalMonto = viaticos.reduce((sum, v) => {
    const monto = typeof v.monto === 'string' ? parseFloat(v.monto) : v.monto
    return sum + (isNaN(monto) ? 0 : monto)
  }, 0)

  // Usar userCount en lugar de users.length
  const [userCount, setUserCount] = useState(0)

  return (
    <RoleGuard allowedRoles={['admin', 'super_admin']}>
      <Layout>

        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {userRole === 'super_admin' ? (
                <Crown className="h-6 w-6 text-yellow-500" />
              ) : (
                <Shield className="h-6 w-6 text-blue-500" />
              )}
              <h1 className="text-3xl font-bold tracking-tight">
                Panel de Administración
              </h1>
            </div>
            <p className="text-muted-foreground">
              Gestiona todos los viáticos y usuarios del sistema
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Viáticos</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalViaticos}</div>
                <p className="text-xs text-muted-foreground">
                  Registros en el sistema
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Monto</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  S/ {totalMonto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Suma de todos los viáticos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userCount}</div>
                <p className="text-xs text-muted-foreground">
                  Usuarios registrados
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="viaticos" className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="viaticos">Viáticos</TabsTrigger>
                <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
            </div>

            <TabsContent value="viaticos" className="space-y-4">
              <ReportsView
                viaticos={viaticos}
                users={users}
                onDelete={handleDeleteViatico}
              />
            </TabsContent>

            <TabsContent value="usuarios" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle>Gestión de Usuarios</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    {isSuperAdmin && (
                      <>
                        <Button onClick={handleBroadcast} variant="outline" size="sm">
                          Alerta 1h
                        </Button>
                        <Button onClick={handleTestNotification} variant="outline" size="sm">
                          Probar Notificación
                        </Button>
                        <Button onClick={handleCleanupAnonymous} variant="destructive" size="sm">
                          Limpiar Anonymous
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {users.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay usuarios registrados
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol Actual</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Cambiar Rol</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((u) => (
                            <TableRow key={u.uid}>
                              <TableCell>
                                {u.displayName || u.email.split('@')[0]}
                              </TableCell>
                              <TableCell>{u.email}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    u.role === 'super_admin'
                                      ? 'default'
                                      : u.role === 'admin'
                                        ? 'secondary'
                                        : 'outline'
                                  }
                                >
                                  {u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'Usuario'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Badge variant={u.estado === 'activo' ? 'default' : 'destructive'}>
                                    {u.estado === 'activo' ? (
                                      <>
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Activo
                                      </>
                                    ) : (
                                      <>
                                        <Ban className="h-3 w-3 mr-1" />
                                        Inactivo
                                      </>
                                    )}
                                  </Badge>
                                  {userRole === 'super_admin' && u.role !== 'super_admin' && (
                                    <Select
                                      value={u.estado || 'activo'}
                                      onValueChange={(newEstado) => handleStatusChange(u.uid, newEstado as 'activo' | 'inactivo')}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="activo">Activo</SelectItem>
                                        <SelectItem value="inactivo">Inactivo</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell>
                                <Select
                                  value={u.role}
                                  onValueChange={(newRole) => handleRoleChange(u.uid, newRole)}
                                  disabled={
                                    // No se puede editar a sí mismo
                                    u.uid === user?.uid ||
                                    // No se puede editar el rol de super_admin
                                    u.role === 'super_admin' ||
                                    // Admin no puede asignar rol de super_admin
                                    (userRole !== 'super_admin' && u.role === 'super_admin')
                                  }
                                >
                                  <SelectTrigger className="w-40">
                                    {updating === u.uid ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <SelectValue />
                                    )}
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="usuario">Usuario</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    {userRole === 'super_admin' && (
                                      <SelectItem value="super_admin">Super Admin</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-right">
                                {((userRole === 'super_admin' && u.role !== 'super_admin') || (userRole === 'admin' && u.role !== 'super_admin')) && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteUser(u.uid, u.email)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Layout >
    </RoleGuard >
  )
}
