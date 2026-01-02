import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { format, startOfDay, endOfDay, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Trash2, FileSpreadsheet, FileText, ArrowLeft, ChevronRight, User, List, Pencil, Search, X } from 'lucide-react'
import * as ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { EditGastoDialog } from '@/components/EditGastoDialog'
import { Input } from '@/components/ui/input'

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

interface Gasto {
    id: string
    usuario_id: string
    fecha: string
    descripcion: string
    monto: number | string
    medio_pago?: string
    entidad?: string
    numero_operacion?: string
    de?: string
    motivo?: string
    para_quien_impuesto?: string
    mes_sueldo?: string
    codigo_devolucion?: string
    created_at: string
}

interface User {
    uid: string
    email: string
    displayName?: string
    role: string
}

interface GastosReportsViewProps {
    gastos: Gasto[]
    users: User[]
    onDelete: (id: string) => Promise<void>
    onUpdate?: () => void
}

export default function GastosReportsView({ gastos, users, onDelete, onUpdate }: GastosReportsViewProps) {
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [startDate, setStartDate] = useState<Date | undefined>()
    const [endDate, setEndDate] = useState<Date | undefined>()
    const [searchQuery, setSearchQuery] = useState('')
    const [editingGasto, setEditingGasto] = useState<Gasto | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

    // Helper to get user name in UPPERCASE
    const getUserName = (uid: string) => {
        if (!uid || uid.trim() === '') return 'USUARIO SIN ID'
        const u = users.find(user => user.uid === uid)
        if (u) {
            return (u.displayName || u.email || 'USUARIO SIN NOMBRE').toUpperCase()
        }
        return `USUARIO NO ENCONTRADO (${uid})`.toUpperCase()
    }

    // Filter gastos by date range and search query
    const filteredGastos = useMemo(() => {
        return gastos.filter(g => {
            const gDate = parseISO(g.fecha)

            // Date filter
            if (startDate) {
                const start = startOfDay(startDate)
                if (gDate < start) return false
            }
            if (endDate) {
                const end = endOfDay(endDate)
                if (gDate > end) return false
            }

            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toUpperCase() // Search in uppercase
                const searchableFields = [
                    g.fecha,
                    g.descripcion || '',
                    g.medio_pago || '',
                    g.entidad || '',
                    g.numero_operacion || '',
                    getUserName(g.usuario_id)
                ].join(' ').toUpperCase()

                if (!searchableFields.includes(query)) return false
            }

            return true
        }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    }, [gastos, startDate, endDate, searchQuery, users])

    // Aggregate gastos by user
    const userTotals = useMemo(() => {
        const totals: Record<string, { userName: string, total: number, count: number, gastos: Gasto[] }> = {}

        filteredGastos.forEach(g => {
            if (!totals[g.usuario_id]) {
                totals[g.usuario_id] = {
                    userName: getUserName(g.usuario_id),
                    total: 0,
                    count: 0,
                    gastos: []
                }
            }
            const monto = typeof g.monto === 'string' ? parseFloat(g.monto) : g.monto
            totals[g.usuario_id].total += isNaN(monto) ? 0 : monto
            totals[g.usuario_id].count += 1
            totals[g.usuario_id].gastos.push(g)
        })

        return Object.entries(totals)
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => b.total - a.total)
    }, [filteredGastos, users])

    // Get selected user data
    const selectedUserData = useMemo(() => {
        if (!selectedUserId) return null
        return userTotals.find(u => u.userId === selectedUserId)
    }, [selectedUserId, userTotals])

    // Helper to uppercase data (redundant if we format everything before passing, but good for safety)
    const toUpperCaseData = (data: any[]): any[] => {
        return data.map(item => {
            if (Array.isArray(item)) {
                return item.map(val => typeof val === 'string' ? val.toUpperCase() : val)
            }
            if (typeof item === 'object' && item !== null) {
                const newItem: any = {}
                Object.keys(item).forEach(key => {
                    const val = item[key]
                    newItem[key] = typeof val === 'string' ? val.toUpperCase() : val
                })
                return newItem
            }
            return item
        })
    }

    // Export to Excel
    const exportToExcel = async (data: any[], filename: string) => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte');

        // Transform data to uppercase
        const upperData = toUpperCaseData(data)

        // Get headers from the first object
        if (upperData.length > 0) {
            const columns = Object.keys(upperData[0]).map(key => ({ header: key.toUpperCase(), key: key, width: 25 }));
            worksheet.columns = columns;
        }

        worksheet.addRows(upperData);

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    // Export to PDF
    const exportToPDF = (headers: string[], data: any[][], title: string) => {
        const doc = new jsPDF()
        doc.text(title.toUpperCase(), 14, 15)
        doc.setFontSize(10)
        doc.text(`GENERADO: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22)

        // Transform data to uppercase
        const upperData = toUpperCaseData(data)
        const upperHeaders = headers.map(h => h.toUpperCase())

        doc.autoTable({
            head: [upperHeaders],
            body: upperData,
            startY: 30,
        })

        doc.save(`${title.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`)
    }

    const handleEdit = (gasto: Gasto) => {
        setEditingGasto(gasto)
        setIsEditDialogOpen(true)
    }

    return (
        <div className="space-y-4">
            {/* Global Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtros Globales</CardTitle>
                    <CardDescription>Filtra por fecha, usuario o contenido</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por usuario, descripción, entidad..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-9 uppercase"
                            />
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        {/* Date Filters */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Desde</label>
                                <DatePicker
                                    date={startDate}
                                    onSelect={setStartDate}
                                    placeholder="Selecciona fecha inicio"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Hasta</label>
                                <DatePicker
                                    date={endDate}
                                    onSelect={setEndDate}
                                    placeholder="Selecciona fecha fin"
                                    disabled={(date) => startDate ? date < startDate : false}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="usuarios" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="usuarios">
                        <User className="mr-2 h-4 w-4" />
                        Por Usuarios
                    </TabsTrigger>
                    <TabsTrigger value="registros">
                        <List className="mr-2 h-4 w-4" />
                        Por Registro
                    </TabsTrigger>
                </TabsList>

                {/* TAB: Por Usuarios */}
                <TabsContent value="usuarios" className="mt-4">
                    {!selectedUserId ? (
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <CardTitle>Totales por Usuario</CardTitle>
                                        <CardDescription>
                                            {startDate || endDate ? 'Mostrando totales filtrados por fecha' : 'Mostrando totales históricos'}
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const data = userTotals.map(u => ({
                                                    USUARIO: u.userName,
                                                    'CANTIDAD VIATICOS ENTREGA': u.count,
                                                    'TOTAL (S/)': u.total
                                                }))
                                                exportToExcel(data, 'REPORTE_VIATICOS_ENTREGA_POR_USUARIOS')
                                            }}
                                        >
                                            <FileSpreadsheet className="h-4 w-4 sm:mr-2 text-green-600" />
                                            <span className="hidden sm:inline">EXCEL</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const data = userTotals.map(u => [
                                                    u.userName,
                                                    u.count,
                                                    `S/ ${u.total.toFixed(2)}`
                                                ])
                                                exportToPDF(['Usuario', 'Cant.', 'Total'], data, 'REPORTE VIATICOS ENTREGA POR USUARIOS')
                                            }}
                                        >
                                            <FileText className="h-4 w-4 sm:mr-2 text-red-600" />
                                            <span className="hidden sm:inline">PDF</span>
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Usuario</TableHead>
                                                <TableHead className="text-center">Cantidad</TableHead>
                                                <TableHead className="text-right">Total (S/)</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {userTotals.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                        No hay datos para mostrar
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                userTotals.map((user) => (
                                                    <TableRow key={user.userId}>
                                                        <TableCell className="font-medium">{user.userName}</TableCell>
                                                        <TableCell className="text-center">{user.count}</TableCell>
                                                        <TableCell className="text-right">
                                                            S/ {user.total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setSelectedUserId(user.userId)}
                                                            >
                                                                <ChevronRight className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => setSelectedUserId(null)}
                                        >
                                            <ArrowLeft className="h-4 w-4" />
                                        </Button>
                                        <div>
                                            <CardTitle>Detalle de Usuario: {selectedUserData?.userName}</CardTitle>
                                            <CardDescription>
                                                Total: S/ {selectedUserData?.total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                {' • '}
                                                {selectedUserData?.count} registros
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (!selectedUserData) return
                                                const data = selectedUserData.gastos.map(g => {
                                                    const fecha = parseISO(g.fecha)
                                                    return {
                                                        DIA: format(fecha, 'd'),
                                                        MES: format(fecha, 'MMMM', { locale: es }).toUpperCase(),
                                                        AÑO: format(fecha, 'yyyy'),
                                                        FECHA: format(fecha, 'dd/MM/yyyy'),
                                                        DE: (g.de || '').toUpperCase(),
                                                        MOTIVO: (g.motivo || '').toUpperCase(),
                                                        'PARA | QUIEN IMPUESTO': getUserName(g.usuario_id),
                                                        'MES SUELDO': (g.mes_sueldo || '').toUpperCase(),
                                                        'CODIGO PARA DEVOLUCION': (g.codigo_devolucion || '').toUpperCase(),
                                                        'MEDIO DE PAGO': (g.medio_pago || '').toUpperCase(),
                                                        ENTIDAD: (g.entidad || '').toUpperCase(),
                                                        'N° DE OPERACION': (g.numero_operacion || '').toUpperCase(),
                                                        MONTO: typeof g.monto === 'string' ? parseFloat(g.monto) : g.monto,
                                                        DESCRIPCION: (g.descripcion || '').toUpperCase()
                                                    }
                                                })
                                                exportToExcel(data, `REPORTE_VIATICOS_ENTREGA_${selectedUserData.userName.replace(/ /g, '_')}`)
                                            }}
                                        >
                                            <FileSpreadsheet className="h-4 w-4 sm:mr-2 text-green-600" />
                                            <span className="hidden sm:inline">EXCEL</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (!selectedUserData) return
                                                const data = selectedUserData.gastos.map(g => {
                                                    const fecha = parseISO(g.fecha)
                                                    return [
                                                        format(fecha, 'd'),
                                                        format(fecha, 'MMMM', { locale: es }).toUpperCase(),
                                                        format(fecha, 'yyyy'),
                                                        format(fecha, 'dd/MM/yyyy'),
                                                        selectedUserData.userName,
                                                        (g.medio_pago || '').toUpperCase(),
                                                        (g.entidad || '').toUpperCase(),
                                                        (g.numero_operacion || '').toUpperCase(),
                                                        `S/ ${Number(g.monto).toFixed(2)}`,
                                                        (g.descripcion || '-').toUpperCase()
                                                    ]
                                                })
                                                exportToPDF(['Día', 'Mes', 'Año', 'Fecha', 'Trabajador', 'Medio Pago', 'Entidad', 'N° Op.', 'Monto', 'Descripción'], data, `REPORTE VIATICOS ENTREGA ${selectedUserData.userName}`)
                                            }}
                                        >
                                            <FileText className="h-4 w-4 sm:mr-2 text-red-600" />
                                            <span className="hidden sm:inline">PDF</span>
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Día</TableHead>
                                                <TableHead>Mes</TableHead>
                                                <TableHead>Año</TableHead>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead>Medio Pago</TableHead>
                                                <TableHead>Entidad</TableHead>
                                                <TableHead>N° Op.</TableHead>
                                                <TableHead className="text-right">Monto</TableHead>
                                                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedUserData?.gastos.map(gasto => (
                                                <TableRow key={gasto.id}>
                                                    <TableCell>{format(parseISO(gasto.fecha), 'd')}</TableCell>
                                                    <TableCell>{format(parseISO(gasto.fecha), 'MMMM', { locale: es }).toUpperCase()}</TableCell>
                                                    <TableCell>{format(parseISO(gasto.fecha), 'yyyy')}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{format(parseISO(gasto.fecha), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell><Badge variant="outline" className="whitespace-nowrap">{(gasto.medio_pago || '-').toUpperCase()}</Badge></TableCell>
                                                    <TableCell className="whitespace-nowrap">{(gasto.entidad || '-').toUpperCase()}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{(gasto.numero_operacion || '-').toUpperCase()}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        S/ {Number(gasto.monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell max-w-xs truncate">{(gasto.descripcion || '-').toUpperCase()}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                                onClick={() => handleEdit(gasto)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => onDelete(gasto.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* TAB: Por Registro */}
                <TabsContent value="registros" className="mt-4 space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <CardTitle>Listado de Registros</CardTitle>
                                        <CardDescription>
                                            {filteredGastos.length} registros encontrados
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const data = filteredGastos.map(g => {
                                                    const fecha = parseISO(g.fecha)
                                                    return {
                                                        DIA: format(fecha, 'd'),
                                                        MES: format(fecha, 'MMMM', { locale: es }).toUpperCase(),
                                                        AÑO: format(fecha, 'yyyy'),
                                                        FECHA: format(fecha, 'dd/MM/yyyy'),
                                                        DE: (g.de || '').toUpperCase(),
                                                        MOTIVO: (g.motivo || '').toUpperCase(),
                                                        'PARA | QUIEN IMPUESTO': getUserName(g.usuario_id),
                                                        'MES SUELDO': (g.mes_sueldo || '').toUpperCase(),
                                                        'CODIGO PARA DEVOLUCION': (g.codigo_devolucion || '').toUpperCase(),
                                                        'MEDIO DE PAGO': (g.medio_pago || '').toUpperCase(),
                                                        ENTIDAD: (g.entidad || '').toUpperCase(),
                                                        'N° DE OPERACION': (g.numero_operacion || '').toUpperCase(),
                                                        MONTO: typeof g.monto === 'string' ? parseFloat(g.monto) : g.monto,
                                                        DESCRIPCION: (g.descripcion || '').toUpperCase()
                                                    }
                                                })
                                                let filename = 'REPORTE_VIATICOS_ENTREGA_POR_REGISTRO'
                                                if (startDate && endDate) {
                                                    filename += `_${format(startDate, 'yyyyMMdd')}_AL_${format(endDate, 'yyyyMMdd')}`
                                                } else if (startDate) {
                                                    filename += `_DESDE_${format(startDate, 'yyyyMMdd')}`
                                                } else if (endDate) {
                                                    filename += `_HASTA_${format(endDate, 'yyyyMMdd')}`
                                                }
                                                exportToExcel(data, filename)
                                            }}
                                        >
                                            <FileSpreadsheet className="h-4 w-4 sm:mr-2 text-green-600" />
                                            <span className="hidden sm:inline">EXCEL</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const data = filteredGastos.map(g => {
                                                    const fecha = parseISO(g.fecha)
                                                    return [
                                                        format(fecha, 'd'),
                                                        format(fecha, 'MMMM', { locale: es }).toUpperCase(),
                                                        format(fecha, 'yyyy'),
                                                        format(fecha, 'dd/MM/yyyy'),
                                                        getUserName(g.usuario_id),
                                                        (g.medio_pago || '').toUpperCase(),
                                                        (g.entidad || '').toUpperCase(),
                                                        (g.numero_operacion || '').toUpperCase(),
                                                        `S/ ${Number(g.monto).toFixed(2)}`,
                                                        (g.descripcion || '-').toUpperCase()
                                                    ]
                                                })
                                                exportToPDF(['Día', 'Mes', 'Año', 'Fecha', 'Trabajador', 'Medio Pago', 'Entidad', 'N° Op.', 'Monto', 'Descripción'], data, 'REPORTE DE VIATICOS QUE SE ENTREGA')
                                            }}
                                        >
                                            <FileText className="h-4 w-4 sm:mr-2 text-red-600" />
                                            <span className="hidden sm:inline">PDF</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Día</TableHead>
                                            <TableHead>Mes</TableHead>
                                            <TableHead>Año</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Trabajador</TableHead>
                                            <TableHead>Medio Pago</TableHead>
                                            <TableHead>Entidad</TableHead>
                                            <TableHead>N° Op.</TableHead>
                                            <TableHead className="text-right">Monto</TableHead>
                                            <TableHead className="hidden md:table-cell">Descripción</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredGastos.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                                                    No hay datos para mostrar
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredGastos.map(gasto => (
                                                <TableRow key={gasto.id}>
                                                    <TableCell>{format(parseISO(gasto.fecha), 'd')}</TableCell>
                                                    <TableCell>{format(parseISO(gasto.fecha), 'MMMM', { locale: es }).toUpperCase()}</TableCell>
                                                    <TableCell>{format(parseISO(gasto.fecha), 'yyyy')}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{format(parseISO(gasto.fecha), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell className="font-medium">{getUserName(gasto.usuario_id)}</TableCell>
                                                    <TableCell><Badge variant="outline" className="whitespace-nowrap">{(gasto.medio_pago || '-').toUpperCase()}</Badge></TableCell>
                                                    <TableCell className="whitespace-nowrap">{(gasto.entidad || '-').toUpperCase()}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{(gasto.numero_operacion || '-').toUpperCase()}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        S/ {Number(gasto.monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell max-w-xs truncate">{(gasto.descripcion || '-').toUpperCase()}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                                onClick={() => handleEdit(gasto)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => onDelete(gasto.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            <EditGastoDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                gasto={editingGasto}
                onSuccess={() => {
                    onUpdate?.()
                }}
            />
        </div>
    )
}
