'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { uploadViatico } from '@/services/api'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { FileCheck, Upload, Camera, X, Loader2, AlertCircle, CheckCircle2, Info, FileText } from 'lucide-react'
import Layout from '@/components/Layout'
import AuthGuard from '@/components/AuthGuard'

export default function NuevoViaticoPage() {
  const { appUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<{ url: string; isPdf: boolean; name: string }[]>([])
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  // La fecha se tomará automáticamente en el servidor
  const [tipo, setTipo] = useState('otro')
  // Por defecto, crear .txt estará activado
  const [createTxt, setCreateTxt] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoading && appUser && !appUser.crear_carpeta) {
      router.push('/dashboard')
    }
  }, [appUser, authLoading, router])

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
  }

  useEffect(() => {
    if (showCamera) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          const video = document.getElementById('video') as HTMLVideoElement
          if (video) {
            video.srcObject = stream
          }
        })
        .catch((err) => {
          console.error('Error accediendo a la cámara:', err)
          setError('No se pudo acceder a la cámara')
          setShowCamera(false)
        })
    } else {
      const video = document.getElementById('video') as HTMLVideoElement
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [showCamera])

  const capturePhoto = () => {
    const video = document.getElementById('video') as HTMLVideoElement
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
        setPreviews([...previews, {
          url: URL.createObjectURL(blob),
          isPdf: false,
          name: newFile.name
        }])
        setShowCamera(false)
      }
    }, 'image/jpeg', 0.8)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (files.length === 0 || !monto || !descripcion) {
      setError('Por favor completa todos los campos y sube al menos un archivo.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('foto', file)
      })
      formData.append('monto', monto)
      formData.append('descripcion', descripcion)
      // La fecha se establecerá en el backend con la fecha y hora de registro
      formData.append('tipo', tipo)
      // Siempre enviar createTxt para que el backend sepa la preferencia, que ahora es true por defecto
      formData.append('createTxt', createTxt ? '1' : '0')

      await uploadViatico(formData)
      setSuccess(true)
      setTimeout(() => {
        router.push('/mis-viaticos')
      }, 2000)
    } catch (err) {
      setError((err as Error).message || 'Error al subir el viático')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !appUser) {
    return (
      <AuthGuard>
        <Layout>
          <div className="max-w-5xl mx-auto space-y-6">
            <Card>
              <CardContent className="p-20">
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

  if (!appUser.crear_carpeta) {
    return (
      <AuthGuard>
        <Layout>
          <div className="max-w-5xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Acceso Restringido</CardTitle>
                <CardDescription>No tienes permiso para acceder a esta página</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Sin Permiso</AlertTitle>
                  <AlertDescription>
                    Tu carpeta de OneDrive no está habilitada. No puedes subir viáticos en este momento.
                    Por favor, contacta al administrador para habilitar tu cuenta.
                    <br /><br />
                    Serás redirigido al dashboard...
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </Layout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <Layout>
      <TooltipProvider>
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nuevo Viático</h1>
            <p className="text-muted-foreground">
              Registra un nuevo comprobante con su foto o PDF
            </p>
          </div>

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
                        <Badge variant="outline" className="text-xs">
                          <Info className="h-3 w-3 mr-1" />
                          Formatos: JPG, PNG, WEBP, PDF
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>El tamaño máximo es de 10MB por archivo</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    multiple
                  />
                  {previews.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {previews.map((preview, index) => (
                        <div key={index} className="relative group w-full">
                          <div className="rounded-lg border overflow-hidden aspect-square flex items-center justify-center bg-muted">
                            {preview.isPdf ? (
                              <div className="p-4 flex flex-col items-center justify-center text-center">
                                <FileText className="w-10 h-10 text-primary" />
                                <p className="mt-2 text-xs font-medium break-all max-w-xs">{preview.name}</p>
                                <a href={preview.url} target="_blank" rel="noreferrer" className="mt-2">
                                  <Button variant="outline" size="sm">Ver</Button>
                                </a>
                              </div>
                            ) : (
                              <img
                                src={preview.url}
                                alt={`Vista previa ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" variant="destructive" size="icon" onClick={() => removeFile(index)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Eliminar archivo</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                      <div
                        className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors aspect-square"
                        onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-8 h-8 text-primary" />
                        <p className="mt-2 text-sm font-semibold">Añadir más</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-20 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}>
                      <div className="mx-auto w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <Upload className="w-8 h-8 text-primary" />
                      </div>
                      <p className="mt-4 font-semibold">Seleccionar Archivos</p>
                      <p className="text-sm text-muted-foreground mt-2">o arrastra y suelta aquí</p>
                      <div className="mt-6 flex items-center justify-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">JPG</Badge>
                        <Badge variant="outline" className="text-xs">PNG</Badge>
                        <Badge variant="outline" className="text-xs">WEBP</Badge>
                        <Badge variant="outline" className="text-xs">PDF</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">Máximo 10MB por archivo</p>
                    </div>
                  )}
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full" 
                    onClick={startCamera}>
                    <Camera className="h-4 w-4 mr-2" />
                    Tomar y Añadir Foto
                  </Button>
                </div>

                <div className="space-y-6 pt-6 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto (S/)</Label>
                  <Input 
                    id="monto" 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    value={monto} 
                    onChange={(e) => setMonto(e.target.value)} 
                    required 
                    placeholder="0.00" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea 
                      id="descripcion" 
                      value={descripcion} 
                      onChange={(e) => setDescripcion(e.target.value)} 
                      required 
                      placeholder="Ej: Almuerzo con cliente, taxi al aeropuerto, etc." 
                      rows={4}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo de Gasto</Label>
                      <Select value={tipo} onValueChange={setTipo}>
                        <SelectTrigger id="tipo">
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desayuno">🌅 Desayuno</SelectItem>
                          <SelectItem value="almuerzo">🍽️ Almuerzo</SelectItem>
                          <SelectItem value="cena">🌙 Cena</SelectItem>
                          <SelectItem value="otro">📝 Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Switch id="createTxt" checked={createTxt} onCheckedChange={setCreateTxt} />
                      <div className="flex flex-col">
                        <Label htmlFor="createTxt" className="text-sm cursor-pointer">Crear .txt en OneDrive</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xs text-muted-foreground cursor-help">¿Qué es esto?</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Crea un archivo de texto adicional con la información del viático en OneDrive</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Éxito</AlertTitle>
                    <AlertDescription>
                      Viático registrado correctamente. Redirigiendo...
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={loading}
                  className="min-w-[200px]">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <FileCheck className="mr-2 h-4 w-4" />
                      Registrar Viático
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>

          <Dialog open={showCamera} onOpenChange={setShowCamera}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Tomar Foto</DialogTitle>
                <DialogDescription>
                  Captura una foto de tu comprobante usando la cámara
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <video id="video" autoPlay className="w-full rounded-lg" style={{ display: 'block' }} />
                <canvas id="canvas" style={{ display: 'none' }} />
                <div className="flex gap-3 justify-end">
                  <Button variant="outline" onClick={() => setShowCamera(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={capturePhoto}>
                    <Camera className="h-4 w-4 mr-2" />
                    Capturar Foto
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </Layout>
    </AuthGuard>
  )
}
