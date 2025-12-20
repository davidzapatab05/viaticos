import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateUser } from '@/services/api'
import { useToast } from '@/lib/use-toast'
import { useLoading } from '@/contexts/LoadingContext'
import { Loader2 } from 'lucide-react'

interface User {
    uid: string
    email: string
    displayName?: string
    role: string
}

interface EditUserDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    user: User | null
    onSuccess: () => void
}

export function EditUserDialog({ open, onOpenChange, user, onSuccess }: EditUserDialogProps) {
    const { toast } = useToast()
    const [displayName, setDisplayName] = useState('')
    const { setLoading: setGlobalLoading, clearLoading } = useLoading()

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || '')
        }
    }, [user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        if (!displayName.trim()) {
            toast({
                title: "Error",
                description: "El nombre es requerido",
                variant: "destructive"
            })
            return
        }

        setGlobalLoading('Actualizando usuario...')
        try {
            await updateUser(user.uid, { displayName: displayName.trim() })
            toast({
                title: "Éxito",
                description: "Usuario actualizado correctamente",
                variant: "success"
            })
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error('Error actualizando usuario:', error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : 'Error al actualizar usuario',
                variant: "destructive"
            })
        } finally {
            clearLoading()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Usuario</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="displayName">Nombre de Usuario</Label>
                        <Input
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Nombre completo"
                            className="uppercase"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
