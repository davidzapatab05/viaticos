'use client'

// HINT: Make sure to install sweetalert2: npm install sweetalert2
import Swal from 'sweetalert2'
import { useToast } from "@/lib/use-toast"
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getAllViaticos, getAllUsers, setUserRole as apiSetUserRole, getCurrentUser, cleanupAnonymousUsers, setUserStatus, deleteUser, deleteViatico, apiRequest, triggerManualBackup } from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from '@/components/ui/date-picker'
import { format } from 'date-fns'
import { Loader2, Users, Receipt, Shield, Crown, RefreshCw, DollarSign, Trash2, Ban, CheckCircle2, DatabaseBackup } from 'lucide-react'
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
  const [userCount, setUserCount] = useState(0)
  const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
  const isSuperAdmin = user?.email?.toLowerCase() === superAdminEmail?.toLowerCase() || userRole === 'super_admin';

  // Backup Dialog State
  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false)
  const [backupStartDate, setBackupStartDate] = useState<Date | undefined>()
  const [backupEndDate, setBackupEndDate] = useState<Date | undefined>()

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

      // Filtrar usuarios válidos (excluyendo anonymous y dev)
      const validUsers = (usersData?.users || []).filter((u: User) =>
        u.uid !== 'anonymous' && u.uid !== 'dev-user' && !u.uid.startsWith('dev-')
      )

      // Calcular conteo excluyendo al super admin (por email o rol)
      const countExcludingSuperAdmin = validUsers.filter((u: User) =>
        u.email?.toLowerCase() !== superAdminEmail?.toLowerCase() && u.role !== 'super_admin'
      ).length

      // Filtrar para la tabla
      const filteredUsers = validUsers.filter((u: User) => {
        // Si es super admin, ve a todos
        if (isSuperAdmin) return true;
        // Si el rol detectado es super_admin, ve a todos
        if (userData?.user?.role === 'super_admin') return true;

        // Si no es super admin, ocultar al super admin (por rol O email)
        if (u.role === 'super_admin') return false;
        if (u.email?.toLowerCase() === superAdminEmail?.toLowerCase()) return false;

        return true;
      })

      setUsers(filteredUsers)
      setUserCount(countExcludingSuperAdmin)

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
      background: '#1f2937',
      color: '#fff'
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
        background: '#1f2937',
        color: '#fff'
      })

      await loadData()
    } catch (e) {
      clearLoading()
      await Swal.fire({
        title: 'Error',
        text: 'Error al eliminar usuario: ' + (e as Error).message,
        icon: 'error',
        confirmButtonColor: '#d62828',
        background: '#1f2937',
        color: '#fff'
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
      background: '#1f2937',
      color: '#fff'
    })

    if (!result.isConfirmed) return

    try {
      const data = await cleanupAnonymousUsers()
      Swal.fire({
        title: 'Completado',
        html: `Usuarios eliminados: ${data.deletedUsers}<br>Viáticos eliminados: ${data.deletedViaticos}`,
        icon: 'success',
        background: '#1f2937',
        color: '#fff'
      })
      await loadData()
    } catch (e) {
      Swal.fire({
        title: 'Error',
        text: (e as Error).message || 'Error ejecutando limpieza',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      })
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
      background: '#1f2937',
      color: '#fff'
    })

    if (!result.isConfirmed) return

    setGlobalLoading('Eliminando viático...')
    try {
      await deleteViatico(id)
      clearLoading()
      await Swal.fire({
        title: 'Eliminado',
        text: 'El viático ha sido eliminado.',
        icon: 'success',
        background: '#1f2937',
        color: '#fff'
      })
      await loadData()
    } catch (e) {
      clearLoading()
      await Swal.fire({
        title: 'Error',
        text: (e as Error).message || 'Error al eliminar viático',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      })
    }
  }

  function handleManualBackup() {
    setIsBackupDialogOpen(true)
  }

  async function executeManualBackup() {
    if (!backupStartDate || !backupEndDate) {
      toast({ title: "Error", description: "Ambas fechas son requeridas", variant: "destructive" })
      return
    }

    setGlobalLoading('Generando backup y limpiando BD...')
    setIsBackupDialogOpen(false)

    try {
      const startStr = format(backupStartDate, 'yyyy-MM-dd')
      const endStr = format(backupEndDate, 'yyyy-MM-dd')

      const result = await triggerManualBackup(startStr, endStr)
      clearLoading()

      await Swal.fire({
        title: 'Backup Completado',
        html: `
          <div class="text-left">
            <p>Se ha generado el archivo: <b>${result.backupFile}</b></p>
            <p>Registros eliminados: <b>${result.deletedCount}</b></p>
          </div>
        `,
        icon: 'success',
        background: '#1f2937',
        color: '#fff'
      })

      setBackupStartDate(undefined)
      setBackupEndDate(undefined)

      await loadData()
    } catch (e) {
      clearLoading()
      await Swal.fire({
        title: 'Error',
        text: (e as Error).message || 'Error al generar backup',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      })
    }
  }

  async function handleTestNotification() {
    if (!("Notification" in window)) {
      Swal.fire({
        title: 'Error',
        text: 'Este navegador no soporta notificaciones de escritorio',
        icon: 'error',
        background: '#1f2937',
        color: '#fff'
      })
      return
    }

    const showNotification = () => {
      new Notification("⏳ Cierre de Viáticos en 1 hora", {
        body: "Recuerda registrar tus viáticos pendientes de ayer antes de las 10:00 AM.",
        icon: "/icons/icon-192.png"
      })
    }

    if (Notification.permission === "granted") {
      showNotification()
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        showNotification()
      }
    }
  }

  const totalViaticos = viaticos.length
  const totalMonto = viaticos.reduce((sum, v) => {
    const monto = typeof v.monto === 'string' ? parseFloat(v.monto) : v.monto
    return sum + (isNaN(monto) ? 0 : monto)
  }, 0)



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
                        <Button onClick={handleManualBackup} variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                          <DatabaseBackup className="h-4 w-4 mr-2" />
                          Backup Manual
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
                                  {/* Mostrar selector de estado si:
                                      1. Soy super_admin Y el usuario NO es super_admin
                                      2. O soy admin Y el usuario NO es super_admin
                                  */}
                                  {(isSuperAdmin || userRole === 'admin') && u.role !== 'super_admin' && (
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

          <Dialog open={isBackupDialogOpen} onOpenChange={setIsBackupDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Backup Manual</DialogTitle>
                <DialogDescription>
                  Selecciona el rango de fechas para respaldar y <b>ELIMINAR</b> de la base de datos.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Fecha Inicio</Label>
                  <DatePicker
                    date={backupStartDate}
                    onSelect={setBackupStartDate}
                    placeholder="Selecciona fecha inicio"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Fecha Fin</Label>
                  <DatePicker
                    date={backupEndDate}
                    onSelect={setBackupEndDate}
                    placeholder="Selecciona fecha fin"
                    disabled={(date) => backupStartDate ? date < backupStartDate : false}
                  />
                </div>

                <Alert variant="destructive" className="bg-yellow-900/20 border-yellow-600/50 text-yellow-500">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-bold mb-1">Advertencia</p>
                      Esta acción generará un archivo SQL en OneDrive y luego <b>ELIMINARÁ</b> los registros de viáticos del rango seleccionado.
                    </div>
                  </div>
                </Alert>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBackupDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={executeManualBackup}>
                  Iniciar Backup
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Layout >
    </RoleGuard >
  )
}
