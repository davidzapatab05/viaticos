import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Swal from 'sweetalert2'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateGasto } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useLoading } from '@/contexts/LoadingContext'
import { DatePicker } from '@/components/ui/date-picker'

interface Gasto {
    id: string
    fecha: string
    descripcion: string
    monto: number | string
    medio_pago?: string
    entidad?: string
    numero_operacion?: string
}

interface EditGastoDialogProps {
    gasto: Gasto | null
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export function EditGastoDialog({ gasto, open, onOpenChange, onSuccess }: EditGastoDialogProps) {
    const { appUser } = useAuth()
    const { setLoading, clearLoading } = useLoading()
    const [formData, setFormData] = useState<Partial<Gasto>>({})

    useEffect(() => {
        if (gasto) {
            setFormData({
                fecha: gasto.fecha,
                monto: gasto.monto,
                descripcion: gasto.descripcion,
                medio_pago: gasto.medio_pago || '',
                entidad: gasto.entidad || '',
                numero_operacion: gasto.numero_operacion || ''
            })
        }
    }, [gasto])

    const handleChange = (field: keyof Gasto, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!gasto) return

        setLoading('Actualizando gasto...')
        try {
            await updateGasto(gasto.id, formData)

            // Close modal immediately
            onOpenChange(false)
            onSuccess()
            clearLoading()

            // Show auto-closing success message
            await Swal.fire({
                title: 'Actualizado',
                text: 'El gasto ha sido actualizado correctamente.',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false,
                background: '#1f2937',
                color: '#fff'
            })
        } catch (error) {
            clearLoading()
            Swal.fire({
                title: 'Error',
                text: (error as Error).message || 'Error al actualizar gasto',
                icon: 'error',
                confirmButtonColor: '#ef4444',
                background: '#1f2937',
                color: '#fff'
            })
        }
    }

    if (!gasto) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Gasto</DialogTitle>
                    <DialogDescription>
                        Modifica los detalles del gasto. Haz clic en guardar cuando termines.
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
                        <Label htmlFor="medio_pago" className="text-left sm:text-right">
                            Medio Pago
                        </Label>
                        <Select value={formData.medio_pago as string} onValueChange={(val) => handleChange('medio_pago', val)}>
                            <SelectTrigger className="col-span-1 sm:col-span-3">
                                <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                                <SelectItem value="YAPE">Yape</SelectItem>
                                <SelectItem value="PLIN">Plin</SelectItem>
                                <SelectItem value="TARJETA">Tarjeta</SelectItem>
                                <SelectItem value="DEPOSITO">Depósito</SelectItem>
                                <SelectItem value="DESCUENTO TARJETA">Descuento Tarjeta</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <Label htmlFor="entidad" className="text-left sm:text-right">
                            Entidad
                        </Label>
                        <Input
                            id="entidad"
                            value={formData.entidad}
                            onChange={(e) => handleChange('entidad', e.target.value)}
                            className="col-span-1 sm:col-span-3"
                            placeholder="Ej: BCP, Interbank"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                        <Label htmlFor="numero_operacion" className="text-left sm:text-right">
                            N° Op.
                        </Label>
                        <Input
                            id="numero_operacion"
                            value={formData.numero_operacion}
                            onChange={(e) => handleChange('numero_operacion', e.target.value)}
                            className="col-span-1 sm:col-span-3"
                            placeholder="Ej: 123456"
                        />
                    </div>
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
