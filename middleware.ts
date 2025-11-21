import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas públicas (no requieren autenticación)
const publicRoutes = ['/login', '/api/config']

// Rutas que requieren autenticación
const protectedRoutes = ['/dashboard', '/nuevo-viatico', '/mis-viaticos', '/admin']

// Rutas que requieren rol admin
const adminRoutes = ['/admin']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rutas públicas y API routes (excepto las que requieren auth)
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Permitir archivos estáticos y PWA
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/icons/')
  ) {
    return NextResponse.next()
  }

  // Verificar si hay token de Firebase en cookies
  const firebaseToken = request.cookies.get('firebase-token')?.value

  // Si no hay token y está intentando acceder a una ruta protegida
  if (!firebaseToken && protectedRoutes.some(route => pathname.startsWith(route))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Si hay token pero intenta acceder a /admin, permitir (la verificación de rol se hace en el cliente)
  // El middleware solo verifica autenticación básica
  if (firebaseToken && adminRoutes.some(route => pathname.startsWith(route))) {
    // Permitir acceso, pero el componente verificará el rol
    return NextResponse.next()
  }

  // Si está autenticado e intenta acceder a /login, redirigir a dashboard
  if (firebaseToken && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

