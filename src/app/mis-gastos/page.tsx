'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getMisGastos, deleteGasto } from '@/services/api'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { useLoading } from '@/contexts/LoadingContext'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import Link from 'next/link'
import { RefreshCw, Receipt, Loader2, FileText, DollarSign, TrendingUp, ArrowRight, Pencil, Trash2 } from 'lucide-react'
import Swal from 'sweetalert2'
import Layout from '@/components/Layout'
import AuthGuard from '@/components/AuthGuard'
import { EditGastoDialog } from '@/components/EditGastoDialog'

interface Gasto {
    id: string
    fecha: string
    descripcion: string
    monto: number | string
    medio_pago?: string
    entidad?: string
    numero_operacion?: string
    created_at: string
}

export default function MisGastosPage() {
    const { user, appUser, loading: authLoading } = useAuth()
    const { setLoading: setGlobalLoading, clearLoading } = useLoading()
    const [gastos, setGastos] = useState<Gasto[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [editingGasto, setEditingGasto] = useState<Gasto | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)

    const router = useRouter()

    useEffect(() => {
        if (user && !authLoading) {
            loadGastos()
        }
    }, [user, authLoading])

    const loadGastos = async () => {
        if (authLoading) return
        if (!user) {
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError('')
            const data = await getMisGastos()
            setGastos(data.gastos || [])
        } catch (err) {
            const errorMessage = (err as Error).message || 'Error al cargar los gastos'
            if (errorMessage.includes('no autenticado') || errorMessage.includes('No autorizado') || errorMessage.includes('Sesión expirada')) {
                setError('Sesión expirada. Por favor, inicia sesión nuevamente.')
            } else {
                setError(errorMessage)
            }
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        const result = await Swal.fire({
            title: '¿Eliminar gasto?',
            text: 'Esta acción no se puede deshacer',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: '#1f2937',
            color: '#fff'
        })

        if (!result.isConfirmed) return

        setGlobalLoading('Eliminando gasto...')
        try {
            await deleteGasto(id)
            await loadGastos()
            clearLoading()

            await Swal.fire({
                title: 'Eliminado',
                text: 'El gasto ha sido eliminado correctamente',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#1f2937',
                color: '#fff'
            })
        } catch (err) {
            clearLoading()
            await Swal.fire({
                title: 'Error',
                text: 'Error al eliminar gasto: ' + (err as Error).message,
                icon: 'error',
                confirmButtonColor: '#ef4444',
                background: '#1f2937',
                color: '#fff'
            })
        }
    }

    const handleEdit = (gasto: Gasto) => {
        setEditingGasto(gasto)
        setIsEditOpen(true)
    }

    // Helper para verificar si se puede editar/eliminar (Regla de las 10 AM)
    const canEditOrDelete = (fechaGasto: string, role?: string) => {
        if (role === 'admin' || role === 'super_admin') return true
        const gastoDate = new Date(fechaGasto + 'T00:00:00')
        const cutoffDate = new Date(gastoDate)
        cutoffDate.setDate(cutoffDate.getDate() + 1)
        cutoffDate.setHours(10, 0, 0, 0)
        const now = new Date()
        return now <= cutoffDate
    }

    const total = gastos.reduce((sum, v) => sum + parseFloat(String(v.monto || 0)), 0)
    const totalCount = gastos.length

    const groupedByMonth = gastos.reduce((acc, v) => {
        const monthKey = format(new Date(v.fecha + 'T12:00:00'), 'MMMM yyyy', { locale: es })
        if (!acc[monthKey]) {
            acc[monthKey] = []
        }
        acc[monthKey].push(v)
        return acc
    }, {} as Record<string, Gasto[]>)

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

    if (loading && gastos.length === 0) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                        <p className="text-muted-foreground">Cargando tus gastos...</p>
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
                                <h1 className="text-3xl font-bold tracking-tight">Mis Viáticos que se entrega</h1>
                                <p className="text-muted-foreground">Consulta y gestiona todos tus viáticos entregados</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" onClick={loadGastos} disabled={loading}>
                                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                        </div>

                        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

                        <div className="grid gap-4 md:grid-cols-3">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total de Gastos</CardTitle>
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
                                    <div className="text-2xl font-bold">{totalCount > 0 ? `S/ ${(total / totalCount).toFixed(2)}` : 'S/ 0.00'}</div>
                                    <p className="text-xs text-muted-foreground">Por gasto</p>
                                </CardContent>
                            </Card>
                        </div>

                        {gastos.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No tienes gastos registrados</h3>
                                    <p className="text-sm text-muted-foreground text-center mb-4">Comienza registrando tu primer gasto</p>
                                    <Button asChild>
                                        <Link href="/nuevo-gasto">Crear Primer Viático que se entrega <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <div className="hidden md:block">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Lista de Gastos</CardTitle>
                                            <CardDescription>Vista detallada de todos tus gastos</CardDescription>
                                        </CardHeader>
                                        <CardContent className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Fecha</TableHead>
                                                        <TableHead>Medio Pago</TableHead>
                                                        <TableHead>Entidad</TableHead>
                                                        <TableHead>N° Op.</TableHead>
                                                        <TableHead className="text-right">Monto</TableHead>
                                                        <TableHead>Descripción</TableHead>
                                                        <TableHead className="text-right">Acciones</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {gastos.map((gasto) => {
                                                        const canModify = canEditOrDelete(gasto.fecha, appUser?.role)
                                                        return (
                                                            <TableRow key={gasto.id}>
                                                                <TableCell className="whitespace-nowrap">{format(new Date(gasto.fecha + 'T12:00:00'), 'dd/MM/yyyy')}</TableCell>
                                                                <TableCell><Badge variant="outline" className="whitespace-nowrap">{gasto.medio_pago || '-'}</Badge></TableCell>
                                                                <TableCell className="whitespace-nowrap">{gasto.entidad || '-'}</TableCell>
                                                                <TableCell className="whitespace-nowrap">{gasto.numero_operacion || '-'}</TableCell>
                                                                <TableCell className="text-right font-medium whitespace-nowrap">S/ {parseFloat(String(gasto.monto || 0)).toFixed(2)}</TableCell>
                                                                <TableCell className="max-w-xs truncate">
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild><span className="truncate block">{gasto.descripcion}</span></TooltipTrigger>
                                                                        <TooltipContent><p className="max-w-xs">{gasto.descripcion}</p></TooltipContent>
                                                                    </Tooltip>
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {canModify && (
                                                                        <div className="flex justify-end gap-2">
                                                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(gasto)}><Pencil className="h-4 w-4 text-blue-500" /></Button>
                                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(gasto.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                                        </div>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div className="md:hidden space-y-6">
                                    {Object.entries(groupedByMonth).map(([month, monthGastos]) => {
                                        const monthTotal = monthGastos.reduce((sum, v) => sum + parseFloat(String(v.monto || 0)), 0)
                                        return (
                                            <div key={month} className="space-y-2">
                                                <div className="flex items-center justify-between px-1">
                                                    <h3 className="font-semibold capitalize text-muted-foreground">{month}</h3>
                                                    <Badge variant="secondary">S/ {monthTotal.toFixed(2)}</Badge>
                                                </div>
                                                <div className="grid gap-3">
                                                    {monthGastos.map((gasto) => {
                                                        const canModify = canEditOrDelete(gasto.fecha, appUser?.role)
                                                        return (
                                                            <Card key={gasto.id}>
                                                                <CardContent className="p-4">
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div className="space-y-1">
                                                                            <p className="font-medium line-clamp-2">{gasto.descripcion || 'Sin descripción'}</p>
                                                                            <div className="flex items-center text-xs text-muted-foreground">
                                                                                <Badge variant="outline" className="mr-2 text-[10px] px-1 py-0 h-5">{gasto.medio_pago || 'otro'}</Badge>
                                                                                {format(new Date(gasto.fecha + 'T12:00:00'), 'dd MMM', { locale: es })}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-lg font-bold whitespace-nowrap">S/ {parseFloat(String(gasto.monto || 0)).toFixed(2)}</div>
                                                                    </div>
                                                                    {canModify && (
                                                                        <div className="flex justify-end gap-2 mt-2 pt-2 border-t">
                                                                            <Button variant="ghost" size="sm" onClick={() => handleEdit(gasto)}><Pencil className="h-4 w-4 mr-2 text-blue-500" />Editar</Button>
                                                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(gasto.id)}><Trash2 className="h-4 w-4 mr-2 text-red-500" />Eliminar</Button>
                                                                        </div>
                                                                    )}
                                                                </CardContent>
                                                            </Card>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </TooltipProvider>
            </Layout>
            <EditGastoDialog
                gasto={editingGasto}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSuccess={loadGastos}
            />
        </AuthGuard>
    )
}
