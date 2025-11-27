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
import { EditViaticoDialog } from '@/components/EditViaticoDialog'
import { Input } from '@/components/ui/input'

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

interface Viatico {
    id: string
    usuario_id: string
    fecha: string
    para?: string
    que_sustenta?: string
    tipo_comprobante?: string
    numero_documento?: string
    numero_comprobante?: string
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
}

interface ReportsViewProps {
    viaticos: Viatico[]
    users: User[]
    onDelete: (id: string) => Promise<void>
    onUpdate?: () => void
}

export default function ReportsView({ viaticos, users, onDelete, onUpdate }: ReportsViewProps) {
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [startDate, setStartDate] = useState<Date | undefined>()
    const [endDate, setEndDate] = useState<Date | undefined>()
    const [searchQuery, setSearchQuery] = useState('')
    const [editingViatico, setEditingViatico] = useState<Viatico | null>(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

    // Helper to get user name
    const getUserName = (uid: string) => {
        const u = users.find(user => user.uid === uid)
        return u ? (u.displayName || u.email) : uid
    }

    // Aggregate viaticos by user
    const userTotals = useMemo(() => {
        const totals: Record<string, { userName: string, total: number, count: number, viaticos: Viatico[] }> = {}

        viaticos.forEach(v => {
            if (!totals[v.usuario_id]) {
                totals[v.usuario_id] = {
                    userName: getUserName(v.usuario_id),
                    total: 0,
                    count: 0,
                    viaticos: []
                }
            }
            const monto = typeof v.monto === 'string' ? parseFloat(v.monto) : v.monto
            totals[v.usuario_id].total += isNaN(monto) ? 0 : monto
            totals[v.usuario_id].count += 1
            totals[v.usuario_id].viaticos.push(v)
        })

        return Object.entries(totals)
            .map(([userId, data]) => ({ userId, ...data }))
            .sort((a, b) => b.total - a.total)
    }, [viaticos, users])

    // Filter viaticos by date range and search query for "Por Registro" tab
    const filteredViaticos = useMemo(() => {
        return viaticos.filter(v => {
            const vDate = parseISO(v.fecha)

            // Date filter
            if (startDate) {
                const start = startOfDay(startDate)
                if (vDate < start) return false
            }
            if (endDate) {
                const end = endOfDay(endDate)
                if (vDate > end) return false
            }

            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase()
                const searchableFields = [
                    v.fecha,
                    v.para || '',
                    v.tipo_comprobante || '',
                    v.numero_documento || '',
                    v.numero_comprobante || '',
                    v.descripcion || '',
                    getUserName(v.usuario_id)
                ].join(' ').toLowerCase()

                if (!searchableFields.includes(query)) return false
            }

            return true
        }).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    }, [viaticos, startDate, endDate, searchQuery, users])

    // Get selected user data
    const selectedUserData = useMemo(() => {
        if (!selectedUserId) return null
        return userTotals.find(u => u.userId === selectedUserId)
    }, [selectedUserId, userTotals])

    // Export to Excel
    const exportToExcel = async (data: any[], filename: string) => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Reporte');

        // Get headers from the first object
        if (data.length > 0) {
            const columns = Object.keys(data[0]).map(key => ({ header: key, key: key, width: 20 }));
            worksheet.columns = columns;
        }

        worksheet.addRows(data);

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
        doc.text(title, 14, 15)
        doc.setFontSize(10)
        doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22)

        doc.autoTable({
            head: [headers],
            body: data,
            startY: 30,
        })

        doc.save(`${title.replace(/ /g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`)
    }

    const handleEdit = (viatico: Viatico) => {
        setEditingViatico(viatico)
        setIsEditDialogOpen(true)
    }

    return (
        <div className="space-y-4">
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
                                        <CardDescription>Haz clic en un usuario para ver su detalle</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const data = userTotals.map(u => ({
                                                    Usuario: u.userName,
                                                    'Cantidad Viáticos': u.count,
                                                    'Total (S/)': u.total
                                                }))
                                                exportToExcel(data, 'Reporte_Por_Usuarios')
                                            }}
                                        >
                                            <FileSpreadsheet className="h-4 w-4 sm:mr-2 text-green-600" />
                                            <span className="hidden sm:inline">Excel</span>
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
                                                exportToPDF(['Usuario', 'Cant.', 'Total'], data, 'Reporte Por Usuarios')
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
                                                <TableHead>Usuario</TableHead>
                                                <TableHead className="text-right">Cantidad</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                                <TableHead className="text-right w-16"></TableHead>
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
                                                userTotals.map(user => (
                                                    <TableRow
                                                        key={user.userId}
                                                        className="cursor-pointer hover:bg-muted/50"
                                                        onClick={() => setSelectedUserId(user.userId)}
                                                    >
                                                        <TableCell className="font-medium">{user.userName}</TableCell>
                                                        <TableCell className="text-right">{user.count}</TableCell>
                                                        <TableCell className="text-right font-bold">
                                                            S/ {user.total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <ChevronRight className="h-4 w-4 inline text-muted-foreground" />
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
                                    <div>
                                        <CardTitle>Detalle de {selectedUserData?.userName}</CardTitle>
                                        <CardDescription>
                                            Total: S/ {selectedUserData?.total.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => setSelectedUserId(null)}>
                                            <ArrowLeft className="h-4 w-4 sm:mr-2" />
                                            <span className="hidden sm:inline">Volver</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const data = selectedUserData!.viaticos.map(v => {
                                                    const fecha = parseISO(v.fecha)
                                                    return {
                                                        DIA: format(fecha, 'd'),
                                                        MES: format(fecha, 'M'),
                                                        AÑO: format(fecha, 'yyyy'),
                                                        FECHA: format(fecha, 'dd/MM/yyyy'),
                                                        PARA: v.para || '',
                                                        'QUE SUSTENTA': v.que_sustenta || 'VIATICO',
                                                        TRABAJADOR: selectedUserData!.userName,
                                                        'TIPO COMPROBANTE': v.tipo_comprobante || '',
                                                        RUC: v.numero_documento || '',
                                                        'N° COMPROBANTE': v.numero_comprobante || '',
                                                        MONTO: typeof v.monto === 'string' ? parseFloat(v.monto) : v.monto,
                                                        DESCRIPCION: v.descripcion
                                                    }
                                                })
                                                exportToExcel(data, `Detalle_${selectedUserData!.userName}`)
                                            }}
                                        >
                                            <FileSpreadsheet className="h-4 w-4 sm:mr-2 text-green-600" />
                                            <span className="hidden sm:inline">Excel</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const data = selectedUserData!.viaticos.map(v => {
                                                    const fecha = parseISO(v.fecha)
                                                    return [
                                                        format(fecha, 'd'),
                                                        format(fecha, 'M'),
                                                        format(fecha, 'yyyy'),
                                                        format(fecha, 'dd/MM/yyyy'),
                                                        v.para || '',
                                                        v.que_sustenta || 'VIATICO',
                                                        selectedUserData!.userName,
                                                        v.tipo_comprobante || '',
                                                        v.numero_documento || '',
                                                        v.numero_comprobante || '',
                                                        `S/ ${Number(v.monto).toFixed(2)}`,
                                                        v.descripcion || '-'
                                                    ]
                                                })
                                                exportToPDF(['Dia', 'Mes', 'Año', 'Fecha', 'Para', 'Que Sustenta', 'Trabajador', 'Tipo Comprobante', 'N° Documento', 'N° Comprobante', 'Monto', 'Descripción'], data, `Detalle ${selectedUserData!.userName}`)
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
                                                <TableHead>Para</TableHead>
                                                <TableHead>Que Sustenta</TableHead>
                                                <TableHead>Trabajador</TableHead>
                                                <TableHead>Tipo Comp.</TableHead>
                                                <TableHead>N° Doc.</TableHead>
                                                <TableHead>N° Comp.</TableHead>
                                                <TableHead className="text-right">Monto</TableHead>
                                                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedUserData?.viaticos.map(viatico => (
                                                <TableRow key={viatico.id}>
                                                    <TableCell>{format(parseISO(viatico.fecha), 'd')}</TableCell>
                                                    <TableCell>{format(parseISO(viatico.fecha), 'M')}</TableCell>
                                                    <TableCell>{format(parseISO(viatico.fecha), 'yyyy')}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{format(parseISO(viatico.fecha), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell><Badge variant="outline" className="whitespace-nowrap">{viatico.para || '-'}</Badge></TableCell>
                                                    <TableCell className="whitespace-nowrap">{viatico.que_sustenta || 'VIATICO'}</TableCell>
                                                    <TableCell className="font-medium">{selectedUserData!.userName}</TableCell>
                                                    <TableCell><Badge variant="secondary" className="whitespace-nowrap">{viatico.tipo_comprobante || '-'}</Badge></TableCell>
                                                    <TableCell className="whitespace-nowrap">{viatico.numero_documento || '-'}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{viatico.numero_comprobante || '-'}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        S/ {Number(viatico.monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell max-w-xs truncate">{viatico.descripcion || '-'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    handleEdit(viatico)
                                                                }}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    onDelete(viatico.id)
                                                                }}
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
                                        <CardTitle>Filtros</CardTitle>
                                        <CardDescription>Filtra los viáticos por rango de fechas</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const data = filteredViaticos.map(v => {
                                                    const fecha = parseISO(v.fecha)
                                                    return {
                                                        DIA: format(fecha, 'd'),
                                                        MES: format(fecha, 'M'),
                                                        AÑO: format(fecha, 'yyyy'),
                                                        FECHA: format(fecha, 'dd/MM/yyyy'),
                                                        PARA: v.para || '',
                                                        'QUE SUSTENTA': v.que_sustenta || 'VIATICO',
                                                        TRABAJADOR: getUserName(v.usuario_id),
                                                        'TIPO COMPROBANTE': v.tipo_comprobante || '',
                                                        RUC: v.numero_documento || '',
                                                        'N° COMPROBANTE': v.numero_comprobante || '',
                                                        MONTO: typeof v.monto === 'string' ? parseFloat(v.monto) : v.monto,
                                                        DESCRIPCION: v.descripcion
                                                    }
                                                })
                                                let filename = 'Reporte_Por_Registro'
                                                if (startDate && endDate) {
                                                    filename += `_${format(startDate, 'yyyyMMdd')}_al_${format(endDate, 'yyyyMMdd')}`
                                                } else if (startDate) {
                                                    filename += `_desde_${format(startDate, 'yyyyMMdd')}`
                                                } else if (endDate) {
                                                    filename += `_hasta_${format(endDate, 'yyyyMMdd')}`
                                                }
                                                exportToExcel(data, filename)
                                            }}
                                        >
                                            <FileSpreadsheet className="h-4 w-4 sm:mr-2 text-green-600" />
                                            <span className="hidden sm:inline">Excel</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const data = filteredViaticos.map(v => {
                                                    const fecha = parseISO(v.fecha)
                                                    return [
                                                        format(fecha, 'd'),
                                                        format(fecha, 'M'),
                                                        format(fecha, 'yyyy'),
                                                        format(fecha, 'dd/MM/yyyy'),
                                                        v.para || '',
                                                        v.que_sustenta || 'VIATICO',
                                                        getUserName(v.usuario_id),
                                                        v.tipo_comprobante || '',
                                                        v.numero_documento || '',
                                                        v.numero_comprobante || '',
                                                        `S/ ${Number(v.monto).toFixed(2)}`,
                                                        v.descripcion || '-'
                                                    ]
                                                })
                                                exportToPDF(['Dia', 'Mes', 'Año', 'Fecha', 'Para', 'Que Sustenta', 'Trabajador', 'Tipo Comprobante', 'N° Documento', 'N° Comprobante', 'Monto', 'Descripción'], data, 'Reporte De viaticos')
                                            }}
                                        >
                                            <FileText className="h-4 w-4 sm:mr-2 text-red-600" />
                                            <span className="hidden sm:inline">PDF</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* Search and Filters */}
                                <div className="space-y-4">
                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Buscar por fecha, usuario, descripción, tipo comprobante..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9 pr-9"
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
                            </div>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Día</TableHead>
                                            <TableHead>Mes</TableHead>
                                            <TableHead>Año</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Para</TableHead>
                                            <TableHead>Que Sustenta</TableHead>
                                            <TableHead>Trabajador</TableHead>
                                            <TableHead>Tipo Comp.</TableHead>
                                            <TableHead>N° Doc.</TableHead>
                                            <TableHead>N° Comp.</TableHead>
                                            <TableHead className="text-right">Monto</TableHead>
                                            <TableHead className="hidden md:table-cell">Descripción</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredViaticos.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                                                    No hay datos para mostrar
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredViaticos.map(viatico => (
                                                <TableRow key={viatico.id}>
                                                    <TableCell>{format(parseISO(viatico.fecha), 'd')}</TableCell>
                                                    <TableCell>{format(parseISO(viatico.fecha), 'M')}</TableCell>
                                                    <TableCell>{format(parseISO(viatico.fecha), 'yyyy')}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{format(parseISO(viatico.fecha), 'dd/MM/yyyy')}</TableCell>
                                                    <TableCell><Badge variant="outline" className="whitespace-nowrap">{viatico.para || '-'}</Badge></TableCell>
                                                    <TableCell className="whitespace-nowrap">{viatico.que_sustenta || 'VIATICO'}</TableCell>
                                                    <TableCell className="font-medium">{getUserName(viatico.usuario_id)}</TableCell>
                                                    <TableCell><Badge variant="secondary" className="whitespace-nowrap">{viatico.tipo_comprobante || '-'}</Badge></TableCell>
                                                    <TableCell className="whitespace-nowrap">{viatico.numero_documento || '-'}</TableCell>
                                                    <TableCell className="whitespace-nowrap">{viatico.numero_comprobante || '-'}</TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        S/ {Number(viatico.monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell max-w-xs truncate">{viatico.descripcion || '-'}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                                                onClick={() => handleEdit(viatico)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => onDelete(viatico.id)}
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
            <EditViaticoDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                viatico={editingViatico}
                onSuccess={() => {
                    onUpdate?.()
                }}
            />
        </div>
    )
}
