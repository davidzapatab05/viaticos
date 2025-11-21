const CACHE_NAME = 'viaticos-cache-v1'
const PRECACHE_URLS = [
  '/',
  '/index.html',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Agregar URLs una por una para evitar errores
      return Promise.allSettled(
        PRECACHE_URLS.map(url => 
          cache.add(url).catch(err => {
            console.warn(`Failed to cache ${url}:`, err)
            return null
          })
        )
      )
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((k) => k !== CACHE_NAME ? caches.delete(k) : null)
    ))
  )
  self.clients.claim()
})

// Estrategia: network-first para API y navigation, cache-first para assets
self.addEventListener('fetch', (event) => {
  const req = event.request

  // No cache para llamadas a /api (siempre preferir red)
  if (req.url.includes('/api/')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    )
    return
  }

  // Para navegación, intenta red -> fallback cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        return res
      }).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Para assets estáticos, usar cache-first
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      // Opcional: cachear recursos nuevos
      return res
    })).catch(() => null)
  )
})
