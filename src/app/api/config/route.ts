import { NextResponse } from 'next/server'

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || ''
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ''
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ''
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ''

  // Validación (opcional pero recomendado)
  if (!apiUrl || !apiKey || !authDomain || !projectId) {
    return NextResponse.json(
      {
        error: 'Missing environment variables',
        received: {
          apiUrl,
          apiKey,
          authDomain,
          projectId,
        },
      },
      { status: 500 }
    )
  }

  // Respuesta correcta
  return NextResponse.json({
    firebase: {
      apiKey,
      authDomain,
      projectId,
    },
    apiUrl,
  })
}
