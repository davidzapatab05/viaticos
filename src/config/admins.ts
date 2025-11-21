/**
 * Configuración de Administradores
 * 
 * Lista de emails que tienen acceso al panel de administración.
 * Para producción, actualiza esta lista con los emails reales de los administradores.
 * 
 * NOTA: Este archivo ya no se usa, los roles se manejan desde Cloudflare D1 (tabla user_roles)
 */

// Lista de emails de administradores (deprecated - usar D1 user_roles)
export const ADMIN_EMAILS: string[] = [
  // Agrega aquí los emails de los administradores
  // Ejemplo:
  // 'admin@tudominio.com',
  // 'supervisor@tudominio.com',
]

/**
 * Verificar si un usuario es administrador (deprecated)
 * @param email - Email del usuario
 * @returns True si es admin, False si no
 */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase().trim())
}

/**
 * Obtener lista de administradores (para debugging) (deprecated)
 * @returns Lista de emails admin
 */
export function getAdminEmails(): string[] {
  return [...ADMIN_EMAILS]
}

