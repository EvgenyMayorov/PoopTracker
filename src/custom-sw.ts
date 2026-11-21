// @ts-nocheck
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Workbox injectManifest will replace self.__WB_MANIFEST with precache manifest
// eslint-disable-next-line no-undef
precacheAndRoute(self.__WB_MANIFEST)

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
  let title = 'PoopTrack'
  let options = {
    body: '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'poop-notification',
    data: {},
    vibrate: [200, 100, 200],
  }

  if (event.data) {
    event.waitUntil(
      event.data.text().then((payloadText) => {
        let parsed = {}
        try {
          parsed = JSON.parse(payloadText)
        } catch {
          parsed = { body: payloadText }
        }

        title = parsed.title || 'PoopTrack'
        options.body = parsed.body || payloadText
        options.tag = parsed.tag || 'poop-notification'
        options.data = parsed.data || {}
        options.vibrate = parsed.vibrate || [200, 100, 200]
      }).then(() =>
        self.registration.showNotification(title, options)
      )
    )
  } else {
    event.waitUntil(self.registration.showNotification(title, options))
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.openWindow('/')
  )
})
