// @ts-nocheck
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

precacheAndRoute([
  { url: '/registerSW.js', revision: null },
  { url: '/manifest.json', revision: null },
  { url: '/logo.svg', revision: null },
  { url: '/index.html', revision: null },
  { url: '/icon-512.png', revision: null },
  { url: '/icon-512-maskable.png', revision: null },
  { url: '/icon-192.png', revision: null },
  { url: '/favicon-32x32.png', revision: null },
  { url: '/favicon-16x16.png', revision: null },
  { url: '/apple-touch-icon.png', revision: null },
])

cleanupOutdatedCaches()

registerRoute(
  ({ url }) => url.origin.startsWith('http://') || url.origin.startsWith('https:'),
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  })
)

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'PoopTrack'
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'poop-notification',
    data: data.data || {},
    vibrate: [200, 100, 200],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.openWindow('/')
  )
})
