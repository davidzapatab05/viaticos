import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Swal from 'sweetalert2'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateViatico } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useLoading } from '@/contexts/LoadingContext'
import { DatePicker } from '@/components/ui/date-picker'

interface Viatico {
    id: string
    fecha: string
    para?: string
    que_sustenta?: string
    tipo_comprobante?: string
    numero_documento?: string
    numero_comprobante?: string
    monto: number | string
    descripcion: string
}

interface EditViaticoDialogProps {
    viatico: Viatico | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function EditViaticoDialog({ viatico, open, onOpenChange, onSuccess }: EditViaticoDialogProps) {
    const { appUser } = useAuth()
    const { setLoading, clearLoading } = useLoading()
    const [formData, setFormData] = useState<Partial<Viatico>>({})

    useEffect(() => {
        if (viatico) {
            setFormData({
                fecha: viatico.fecha,
                monto: viatico.monto,
                descripcion: viatico.descripcion,
                para: viatico.para || '',
                que_sustenta: viatico.que_sustenta || 'VIATICO',
                tipo_comprobante: viatico.tipo_comprobante || '',
                numero_documento: viatico.numero_documento || '',
                numero_comprobante: viatico.numero_comprobante || ''
            })
        }
    }, [viatico])

    const handleChange = (field: keyof Viatico, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!viatico) return

        setLoading('Actualizando viático...')
        try {
            await updateViatico(viatico.id, formData)

            // Close modal immediately
            onOpenChange(false)
            onSuccess()
            clearLoading()

            // Show auto-closing success message
            await Swal.fire({
                title: 'Actualizado',
                text: 'El viático ha sido actualizado correctamente.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            })
        } catch (error) {
            clearLoading()
            Swal.fire({
                title: 'Error',
                text: (error as Error).message || 'Error al actualizar viático',
                icon: 'error',
                confirmButtonColor: '#ef4444'
            })
        }
    }

    if (!viatico) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Viático</DialogTitle>
                    <DialogDescription>
                        Modifica los detalles del viático. Haz clic en guardar cuando termines.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    {/* Admin Date Override */}
                    {(appUser?.role === 'admin' || appUser?.role === 'super_admin') && (
                        <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                            <Label className="text-left sm:text-right">Fecha</Label>
                            <div className="col-span-1 sm:col-span-3">
                                <DatePicker
                                    date={formData.fecha ? new Date(formData.fecha + 'T12:00:00') : undefined}
                                    onSelect={(date) => {
                                        if (date) {
                                            handleChange('fecha', format(date, 'yyyy-MM-dd'))
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <Label htmlFor="monto" className="text-left sm:text-right">
                            Monto
                        </Label>
                        <Input
                            id="monto"
                            type="number"
                            step="0.01"
                            value={formData.monto}
                            onChange={(e) => handleChange('monto', e.target.value)}
                            className="col-span-1 sm:col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <Label htmlFor="descripcion" className="text-left sm:text-right">
                            Descripción
                        </Label>
                        <Textarea
                            id="descripcion"
                            value={formData.descripcion}
                            onChange={(e) => handleChange('descripcion', e.target.value)}
                            className="col-span-1 sm:col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <Label htmlFor="para" className="text-left sm:text-right">
                            Para
                        </Label>
                        <Select value={formData.para as string} onValueChange={(val) => handleChange('para', val)}>
                            <SelectTrigger className="col-span-1 sm:col-span-3">
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EMPRESA">EMPRESA</SelectItem>
                                <SelectItem value="PERSONAL">PERSONAL</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <Label htmlFor="tipo_comprobante" className="text-left sm:text-right">
                            Tipo Comp.
                        </Label>
                        <Select value={formData.tipo_comprobante as string} onValueChange={(val) => handleChange('tipo_comprobante', val)}>
                            <SelectTrigger className="col-span-1 sm:col-span-3">
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FACTURA">FACTURA</SelectItem>
                                <SelectItem value="BOLETA">BOLETA</SelectItem>
                                <SelectItem value="RECIBO POR HONORARIO">RECIBO POR HONORARIO</SelectItem>
                                <SelectItem value="SIN COMPROBANTE">SIN COMPROBANTE</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {formData.tipo_comprobante && formData.tipo_comprobante !== 'SIN COMPROBANTE' && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                <Label htmlFor="numero_documento" className="text-left sm:text-right">
                                    {formData.tipo_comprobante === 'BOLETA' ? 'N° DNI' : 'N° RUC'}
                                </Label>
                                <Input
                                    id="numero_documento"
                                    value={formData.numero_documento}
                                    onChange={(e) => handleChange('numero_documento', e.target.value)}
                                    className="col-span-1 sm:col-span-3"
                                    placeholder={formData.tipo_comprobante === 'BOLETA' ? 'Ej: 12345678' : 'Ej: 20123456789'}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                                <Label htmlFor="numero_comprobante" className="text-left sm:text-right">
                                    N° Comp.
                                </Label>
                                <Input
                                    id="numero_comprobante"
                                    value={formData.numero_comprobante}
                                    onChange={(e) => handleChange('numero_comprobante', e.target.value)}
                                    className="col-span-1 sm:col-span-3"
                                    placeholder="Serie-Número"
                                />
                            </div>
                        </>
                    )}
                    <DialogFooter>
                        <Button type="submit">
                            Guardar cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
