'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'

import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Avatar, AvatarFallback } from './ui/avatar'
import { LogOut, Home, Plus, List, Settings, Menu, User, Crown, Shield } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from './ui/sheet'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

import { CountdownBanner } from './CountdownBanner'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut, appUser } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    const result = await signOut()
    if (result.success) {
      router.push('/login')
    }
    setMobileMenuOpen(false)
  }

  const navItems = [
    { path: '/dashboard', label: 'Inicio', icon: Home },
  ]

  // Solo mostrar opciones de viáticos si tiene permiso de crear carpeta
  if (appUser?.crear_carpeta) {
    navItems.push(
      { path: '/nuevo-viatico', label: 'Nuevo Viático', icon: Plus },
      { path: '/mis-viaticos', label: 'Mis Viáticos', icon: List }
    )
  }

  if (appUser?.role === 'admin' || appUser?.role === 'super_admin') {
    navItems.push({ path: '/admin', label: 'Admin', icon: Settings })
  }



  const getRoleIcon = () => {
    if (appUser?.role === 'super_admin') return <Crown className="h-3.5 w-3.5 text-yellow-500" />
    if (appUser?.role === 'admin') return <Shield className="h-3.5 w-3.5 text-blue-500" />
    return <User className="h-3.5 w-3.5 text-muted-foreground" />
  }

  const getRoleLabel = () => {
    if (appUser?.role === 'super_admin') return 'Super Admin'
    if (appUser?.role === 'admin') return 'Admin'
    return 'Usuario'
  }

  const getRoleBadgeVariant = () => {
    if (appUser?.role === 'super_admin') return 'default' as const
    if (appUser?.role === 'admin') return 'secondary' as const
    return 'outline' as const
  }

  const displayName = appUser?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Usuario'
  const userInitials = displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'

  return (
    <div className="min-h-screen bg-background">
      <CountdownBanner />
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-lg">💰</span>
            </div>
            <span className="hidden font-bold sm:inline-block">Gestión de Viáticos</span>
          </Link>
          <nav className="flex flex-1 items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.path
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "transition-colors hover:text-foreground/80",
                    isActive ? "text-foreground" : "text-foreground/60"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              {appUser?.role && (
                <Badge variant={getRoleBadgeVariant()} className="text-xs">
                  {getRoleIcon()}
                  <span className="ml-1">{getRoleLabel()}</span>
                </Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="flex items-center gap-2">
                    {getRoleIcon()}
                    <span className="text-xs">Rol: {getRoleLabel()}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" className="md:hidden" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle>{displayName}</SheetTitle>
                      <SheetDescription>{user?.email}</SheetDescription>
                      {appUser?.role && (
                        <Badge variant={getRoleBadgeVariant()} className="mt-2 text-xs">
                          {getRoleIcon()}
                          <span className="ml-1">Rol: {getRoleLabel()}</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </SheetHeader>
                <div className="mt-6 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                          isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </div>
                <div className="mt-6 pt-6 border-t">
                  <Button variant="destructive" className="w-full" onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar Sesión
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      <main className="container py-6">
        {children}
      </main>
    </div>
  )
}
