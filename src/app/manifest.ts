import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Gestión de Viáticos',
        short_name: 'Viáticos',
        description: 'Registro y gestión de viáticos con subida a OneDrive',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1a73e8',
        icons: [
            {
                src: '/icons/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icons/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}
