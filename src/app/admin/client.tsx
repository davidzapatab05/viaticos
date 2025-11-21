'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Swal from 'sweetalert2'
import { useToast } from '@/lib/use-toast'
import {
  getAllViaticos,
  getAllUsers,
  setUserRole as apiSetUserRole,
  getCurrentUser,
  cleanupAnonymousUsers,
  setUserStatus,
  setUserCreateFolder,
  deleteUser,
} from '@/services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import {
  Loader2,
  Users,
  Receipt,
  Shield,
  Crown,
  RefreshCw,
  DollarSign,
  ExternalLink,
  Trash2,
  Ban,
  CheckCircle2,
} from 'lucide-react'
import Layout from '@/components/Layout'
import RoleGuard from '@/components/RoleGuard'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Viatico {
  id: string
  usuario_id: string
  fecha: string
  tipo: string
  monto: number | string
  descripcion: string
  url_onedrive?: string
  created_at: string
}

interface User {
  uid: string
  email: string
  displayName?: string
  role: string
  estado?: string
  crear_carpeta?: boolean
}

export default function AdminPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [viaticos, setViaticos] = useState<Viatico[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [superAdminEmail, setSuperAdminEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [oneDriveUrl, setOneDriveUrl] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadData()
      loadUserRole()
    }
  }, [user])

  async function loadUserRole() {
    try {
      const userData = await getCurrentUser()
      setUserRole(userData?.user?.role || null)
    } catch (e) {
      // Ignore
    }
  }

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [viaticosData, usersData] = await Promise.all([
        getAllViaticos(),
        getAllUsers(),
      ])

      setViaticos(viaticosData?.viaticos || [])
      
      // Usar count si está disponible, sino usar users.length
      const userCount = usersData?.count !== undefined ? usersData.count : (usersData?.users || []).length
      
      // Filtrar super_admin del array de usuarios para la tabla si es necesario
      const superAdminEmail = usersData?.users?.find((u: User) => u.role === 'super_admin')?.email?.toLowerCase()
      const filteredUsers = (usersData?.users || []).filter((u: User) => {
        // Mantener todos los usuarios en la tabla, pero el conteo ya está filtrado
        return u.uid !== 'anonymous' && u.uid !== 'dev-user' && !u.uid.startsWith('dev-')
      })
      
      setUsers(filteredUsers)
      
      // Actualizar el conteo de usuarios (sin super_admin)
      setUserCount(userCount)
    } catch (e) {
      setError('Error al cargar datos: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(uid: string, newRole: string) {
    setUpdating(uid)
    try {
      await apiSetUserRole(uid, newRole)
      await loadData()
    } catch (e) {
      setError('Error al actualizar rol: ' + (e as Error).message)
    } finally {
      setUpdating(null)
    }
  }

  async function handleStatusChange(uid: string, nuevoEstado: 'activo' | 'inactivo') {
    try {
      await setUserStatus(uid, nuevoEstado)
      await loadData()
    } catch (e) {
      setError('Error al actualizar estado: ' + (e as Error).message)
    }
  }

  async function handleCreateFolderChange(uid: string, crearCarpeta: boolean) {
    try {
      await setUserCreateFolder(uid, crearCarpeta)
      await loadData()
    } catch (e) {
      setError('Error al actualizar flag de carpeta: ' + (e as Error).message)
    }
  }

  async function handleDeleteUser(uid: string, email: string) {
    const result = await Swal.fire({
      title: `¿Estás seguro de eliminar a ${email}?`,
      html: `
        <p>Esta acción es irreversible y eliminará:</p>
        <ul class="list-disc list-inside text-left my-4">
          <li>El usuario de la base de datos</li>
          <li>Todos sus viáticos asociados</li>
          <li>Su carpeta y archivos en OneDrive</li>
        </ul>
        <p class="font-bold">⚠️ Esta acción NO se puede deshacer.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
  
    if (!result.isConfirmed) return;
  
    try {
      await deleteUser(uid);
      Swal.fire(
        '¡Eliminado!',
        'El usuario ha sido eliminado exitosamente.',
        'success'
      );
      await loadData();
    } catch (e) {
      setError('Error al eliminar usuario: ' + (e as Error).message);
      Swal.fire(
        'Error',
        'No se pudo eliminar el usuario: ' + (e as Error).message,
        'error'
      );
    }
  }


  async function handleCleanupAnonymous() {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará todos los usuarios "anonymous" y sus viáticos asociados. Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, limpiar',
      cancelButtonText: 'Cancelar',
    });
  
    if (!result.isConfirmed) return;
  
    try {
      const cleanupResult = await cleanupAnonymousUsers();
      Swal.fire(
        '¡Limpieza completada!',
        `${cleanupResult.deletedUsers} usuarios y ${cleanupResult.deletedViaticos} viáticos eliminados.`,
        'success'
      );
      await loadData(); // Recargar datos
    } catch (e) {
      setError((e as Error).message || 'Error ejecutando limpieza');
      Swal.fire(
        'Error',
        'No se pudo completar la limpieza: ' + (e as Error).message,
        'error'
      );
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
                S/ {totalMonto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {/* CORREGIDO: Cambiar $ a S/ y es-MX a es-PE */}
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
              {oneDriveUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={oneDriveUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir en OneDrive
                  </a>
                </Button>
              )}
              <Button onClick={loadData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            </div>
          </div>

          <TabsContent value="viaticos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Todos los Viáticos</CardTitle>
                <CardDescription>
                  Lista completa de viáticos registrados en el sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {viaticos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay viáticos registrados
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Descripción</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viaticos.map((viatico) => {
                          const user = users.find(u => u.uid === viatico.usuario_id)
                          const monto = typeof viatico.monto === 'string' ? parseFloat(viatico.monto) : viatico.monto
                          return (
                            <TableRow key={viatico.id}>
                              <TableCell>
                                {user?.displayName || user?.email || viatico.usuario_id}
                              </TableCell>
                              <TableCell>
                                {format(new Date(viatico.fecha), 'dd/MM/yyyy', { locale: es })}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{viatico.tipo}</Badge>
                              </TableCell>
                              <TableCell>
                                S/ {monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {/* CORREGIDO: Cambiar $ a S/ y es-MX a es-PE */}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">
                                {viatico.descripcion || '-'}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usuarios" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle>Gestión de Usuarios</CardTitle>
                <div className="flex gap-2">
                  {user?.email === superAdminEmail && (
                    <Button onClick={handleCleanupAnonymous} variant="destructive" size="sm">
                      Limpiar Anonymous
                    </Button>
                  )}
                  <Button onClick={loadData} disabled={loading} size="sm">
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay usuarios registrados
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuario</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Rol Actual</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Crear Carpeta</TableHead>
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
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={u.crear_carpeta !== false}
                                  onCheckedChange={(checked) => handleCreateFolderChange(u.uid, checked)}
                                  disabled={userRole !== 'super_admin' || u.role === 'super_admin'}
                                />
                                <span className="text-sm text-muted-foreground">
                                  {u.crear_carpeta !== false ? 'Sí' : 'No'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={u.role}
                                onValueChange={(newRole) => handleRoleChange(u.uid, newRole)}
                                disabled={updating === u.uid || (userRole !== 'super_admin' && u.role === 'super_admin')}
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
                              {userRole === 'super_admin' && u.role !== 'super_admin' && (
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
    </Layout>
    </RoleGuard>
  )
}
