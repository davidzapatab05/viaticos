'use client'

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { uploadGasto } from '@/services/api'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FileCheck, Upload, Camera, X, Loader2, AlertCircle, CheckCircle2, Info, FileText, RefreshCcw, CalendarDays } from 'lucide-react'
import Layout from '@/components/Layout'
import AuthGuard from '@/components/AuthGuard'
import { DatePicker } from '@/components/ui/date-picker'
import { useViaticoDeadline } from '@/hooks/useViaticoDeadline'

export default function NuevoGastoPage() {
    const { appUser, loading: authLoading } = useAuth()
    const router = useRouter()

    const { activeDate: activeDateObj, activeDateDisplay, isGracePeriod } = useViaticoDeadline()
    const [activeDate, setActiveDate] = useState(activeDateObj ? activeDateObj.toISOString().split('T')[0] : '')

    useEffect(() => {
        if (activeDateObj) {
            const newDateStr = format(activeDateObj, 'yyyy-MM-dd')
            setActiveDate(newDateStr)
        }
    }, [activeDateObj])

    const [files, setFiles] = useState<File[]>([])
    const [previews, setPreviews] = useState<{ url: string; isPdf: boolean; name: string }[]>([])
    const [monto, setMonto] = useState('')
    const [descripcion, setDescripcion] = useState('')
    const [medioPago, setMedioPago] = useState('')
    const [entidad, setEntidad] = useState('')
    const [numeroOperacion, setNumeroOperacion] = useState('')

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [showCamera, setShowCamera] = useState(false)
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files
        if (!selectedFiles) return

        const newFiles = Array.from(selectedFiles)
        let currentFiles = [...files];
        let currentPreviews = [...previews];

        for (const file of newFiles) {
            if (file.size > 10 * 1024 * 1024) {
                setError(`El archivo ${file.name} es demasiado grande. Máximo 10MB.`)
                continue;
            }
            currentFiles.push(file);
            const isPdf = file.type === 'application/pdf'
            const reader = new FileReader()
            reader.onload = (event) => {
                currentPreviews.push({
                    url: event.target?.result as string,
                    isPdf: isPdf,
                    name: file.name,
                })
                setPreviews([...currentPreviews]);
            }
            reader.readAsDataURL(file)
        }
        setFiles(currentFiles);
        setError('')
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index))
        setPreviews(previews.filter((_, i) => i !== index))
    }

    const startCamera = () => {
        setShowCamera(true)
        setFacingMode('environment')
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
    }

    const switchCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
    }

    useEffect(() => {
        if (showCamera) {
            stopCamera()
            const constraints = { video: { facingMode: facingMode } }
            navigator.mediaDevices.getUserMedia(constraints)
                .then((stream) => {
                    streamRef.current = stream
                    if (videoRef.current) videoRef.current.srcObject = stream
                })
                .catch((err) => {
                    console.error('Error accediendo a la cámara:', err)
                    setError('No se pudo acceder a la cámara.')
                    setShowCamera(false)
                })
        } else {
            stopCamera()
        }
        return () => stopCamera()
    }, [showCamera, facingMode])

    const capturePhoto = () => {
        const video = videoRef.current
        const canvas = document.getElementById('canvas') as HTMLCanvasElement
        if (!video || !canvas) return
        const context = canvas.getContext('2d')
        if (!context) return
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)
        canvas.toBlob((blob) => {
            if (blob) {
                const newFile = new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' })
                setFiles([...files, newFile])
                setPreviews([...previews, { url: URL.createObjectURL(blob), isPdf: false, name: newFile.name }])
                setShowCamera(false)
            }
        }, 'image/jpeg', 0.8)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (files.length === 0 || !monto || !descripcion || descripcion.trim() === '') {
            setError('Por favor completa todos los campos obligatorios: foto, monto y descripción.')
            return
        }

        setLoading(true)
        setError('')
        setSuccess(false)

        try {
            const formData = new FormData()
            files.forEach(file => formData.append('foto', file))
            formData.append('monto', monto)
            formData.append('descripcion', descripcion)
            formData.append('medio_pago', medioPago)
            formData.append('entidad', entidad)
            formData.append('numero_operacion', numeroOperacion)
            formData.append('fecha_manual', activeDate)

            await uploadGasto(formData)
            setSuccess(true)
            resetForm()
            setTimeout(() => setSuccess(false), 3000)
        } catch (err) {
            setError((err as Error).message || 'Error al subir el gasto')
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFiles([])
        setPreviews([])
        setMonto('')
        setDescripcion('')
        setMedioPago('')
        setEntidad('')
        setNumeroOperacion('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    if (authLoading || !appUser) {
        return (
            <AuthGuard>
                <Layout>
                    <div className="max-w-5xl mx-auto space-y-6">
                        <Card>
                            <CardContent className="p-6 sm:p-20">
                                <div className="flex flex-col items-center justify-center text-center space-y-4">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                    <p className="text-muted-foreground">Cargando...</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </Layout>
            </AuthGuard>
        );
    }

    return (
        <AuthGuard>
            <Layout>
                <TooltipProvider>
                    <div className="max-w-5xl mx-auto space-y-6">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Nuevo Viático que se entrega</h1>
                            <p className="text-muted-foreground">Registra un nuevo viático que se entrega con foto o PDF</p>
                        </div>

                        <Card className={`border-2 ${isGracePeriod ? 'border-orange-500 bg-orange-950/40' : 'border-primary/20 bg-primary/5'}`}>
                            <CardContent className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full ${isGracePeriod ? 'bg-orange-900/40' : 'bg-primary/10'}`}>
                                        <CalendarDays className={`h-8 w-8 ${isGracePeriod ? 'text-orange-600' : 'text-primary'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-muted-foreground">Fecha de Registro Activa</p>
                                        {appUser?.role === 'admin' || appUser?.role === 'super_admin' ? (
                                            <div className="flex items-center gap-2">
                                                <DatePicker
                                                    date={activeDate ? new Date(activeDate + 'T12:00:00') : undefined}
                                                    onSelect={(date) => {
                                                        if (date) setActiveDate(date.toISOString().split('T')[0])
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className={`flex items-center min-h-10 h-auto px-3 py-2 border rounded-md ${isGracePeriod ? 'bg-orange-600 border-orange-600' : 'bg-background'}`}>
                                                <span className={`text-sm text-center sm:text-left ${isGracePeriod ? 'text-white' : 'text-primary'}`}>
                                                    {activeDateObj ? format(activeDateObj, "EEEE d 'de' MMMM 'de' yyyy", { locale: es }) : activeDateDisplay}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
                                    {isGracePeriod && (
                                        <p className="text-xs text-orange-600 font-medium text-center sm:text-right max-w-[250px]">
                                            Tienes hasta las 10:00 AM para registrar gastos de ayer.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Información del Comprobante</CardTitle>
                                    <CardDescription>Sube tus comprobantes y completa los datos</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label>Comprobantes</Label>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Badge variant="outline" className="text-xs"><Info className="h-3 w-3 mr-1" />Formatos: JPG, PNG, WEBP, PDF</Badge>
                                                </TooltipTrigger>
                                                <TooltipContent><p>El tamaño máximo es de 10MB por archivo</p></TooltipContent>
                                            </Tooltip>
                                        </div>
                                        <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" multiple />
                                        {previews.length > 0 ? (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                {previews.map((preview, index) => (
                                                    <div key={index} className="relative group w-full">
                                                        <div className="rounded-lg border overflow-hidden aspect-square flex items-center justify-center bg-muted">
                                                            {preview.isPdf ? (
                                                                <div className="p-4 flex flex-col items-center justify-center text-center">
                                                                    <FileText className="w-10 h-10 text-primary" />
                                                                    <p className="mt-2 text-xs font-medium break-all max-w-xs">{preview.name}</p>
                                                                    <a href={preview.url} target="_blank" rel="noreferrer" className="mt-2"><Button variant="outline" size="sm">Ver</Button></a>
                                                                </div>
                                                            ) : (
                                                                <img src={preview.url} alt={`Vista previa ${index + 1}`} className="w-full h-full object-cover" />
                                                            )}
                                                        </div>
                                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button type="button" variant="destructive" size="icon" onClick={() => removeFile(index)}><X className="h-4 w-4" /></Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors aspect-square" onClick={() => fileInputRef.current?.click()}>
                                                    <Upload className="w-8 h-8 text-primary" />
                                                    <p className="mt-2 text-sm font-semibold">Añadir más</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-6 sm:p-10 text-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => fileInputRef.current?.click()}>
                                                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-primary/10 flex items-center justify-center mb-4"><Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary" /></div>
                                                <p className="mt-2 sm:mt-4 font-semibold text-sm sm:text-base">Seleccionar Archivos</p>
                                                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">o arrastra y suelta aquí</p>
                                                <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2 flex-wrap">
                                                    <Badge variant="outline" className="text-[10px] sm:text-xs">JPG</Badge>
                                                    <Badge variant="outline" className="text-[10px] sm:text-xs">PNG</Badge>
                                                    <Badge variant="outline" className="text-[10px] sm:text-xs">WEBP</Badge>
                                                    <Badge variant="outline" className="text-[10px] sm:text-xs">PDF</Badge>
                                                </div>
                                                <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 sm:mt-4">Máximo 10MB por archivo</p>
                                            </div>
                                        )}
                                        <Button type="button" variant="outline" className="w-full" onClick={startCamera}><Camera className="h-4 w-4 mr-2" />Tomar y Añadir Foto</Button>
                                    </div>

                                    <div className="space-y-6 pt-6 border-t">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="medio_pago">Medio de Pago</Label>
                                                <Select value={medioPago} onValueChange={setMedioPago}>
                                                    <SelectTrigger id="medio_pago"><SelectValue placeholder="Selecciona una opción" /></SelectTrigger>
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
                                            <div className="space-y-2">
                                                <Label htmlFor="entidad">Entidad</Label>
                                                <Input id="entidad" value={entidad} onChange={(e) => setEntidad(e.target.value)} placeholder="Ej: BCP, Interbank" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="numero_operacion">Número de Operación</Label>
                                                <Input id="numero_operacion" value={numeroOperacion} onChange={(e) => setNumeroOperacion(e.target.value)} placeholder="Ej: 123456" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="monto">Monto (S/) *</Label>
                                                <Input id="monto" type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} required placeholder="0.00" />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="descripcion">Descripción *</Label>
                                            <Textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required placeholder="Ej: Compra de materiales" rows={4} />
                                        </div>
                                    </div>

                                    {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
                                    {success && <Alert><CheckCircle2 className="h-4 w-4" /><AlertTitle>Éxito</AlertTitle><AlertDescription>Viático que se entrega registrado correctamente.</AlertDescription></Alert>}
                                </CardContent>
                                <CardFooter className="flex justify-end">
                                    <Button type="submit" size="lg" disabled={loading} className="min-w-[200px]">
                                        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registrando...</> : <><FileCheck className="mr-2 h-4 w-4" />Registrar Viático que se entrega</>}
                                    </Button>
                                </CardFooter>
                            </Card>
                        </form>

                        <Dialog open={showCamera} onOpenChange={setShowCamera}>
                            <DialogContent className="max-w-4xl">
                                <DialogHeader><DialogTitle>Tomar Foto</DialogTitle><DialogDescription>Captura una foto de tu comprobante</DialogDescription></DialogHeader>
                                <div className="space-y-4">
                                    <div className="relative rounded-lg overflow-hidden bg-black">
                                        <video ref={videoRef} id="video" autoPlay playsInline className="w-full rounded-lg" />
                                        <Button variant="secondary" size="icon" className="absolute top-4 right-4 rounded-full bg-black/50 hover:bg-black/70 text-white border-none" onClick={switchCamera}><RefreshCcw className="h-5 w-5" /></Button>
                                    </div>
                                    <canvas id="canvas" style={{ display: 'none' }} />
                                    <div className="flex gap-3 justify-end">
                                        <Button variant="outline" onClick={() => setShowCamera(false)}>Cancelar</Button>
                                        <Button onClick={capturePhoto}><Camera className="h-4 w-4 mr-2" />Capturar Foto</Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </TooltipProvider>
                {loading && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-lg font-medium text-foreground">Registrando gasto...</p>
                        </div>
                    </div>
                )}
            </Layout>
        </AuthGuard>
    )
}
