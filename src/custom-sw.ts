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

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim())
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

const DEFAULT_PUSH_TITLE = 'PoopTrack'
const DEFAULT_PUSH_BODY = 'Новое уведомление!'
const PUSH_TAG = 'pooptrack-push'

async function extractPushPayload(event) {
  if (!event.data) {
    return { title: DEFAULT_PUSH_TITLE, body: DEFAULT_PUSH_BODY, tag: PUSH_TAG, data: {} }
  }

  // Пробуем распарсить JSON-полезную нагрузку (основной формат send-push)
  try {
    const json = await event.data.json()
    if (json && typeof json === 'object') {
      return {
        title: typeof json.title === 'string' && json.title ? json.title : DEFAULT_PUSH_TITLE,
        body: typeof json.body === 'string' && json.body ? json.body : DEFAULT_PUSH_BODY,
        tag: typeof json.tag === 'string' && json.tag ? json.tag : PUSH_TAG,
        data: json.data && typeof json.data === 'object' ? json.data : {},
      }
    }
  } catch {
    // JSON-парсинг не удался — пробуем обычный текст
  }

  // Fallback: обычный текст (например, при ручной отправке)
  try {
    const text = await event.data.text()
    return {
      title: DEFAULT_PUSH_TITLE,
      body: text && text.trim() ? text : DEFAULT_PUSH_BODY,
      tag: PUSH_TAG,
      data: {},
    }
  } catch {
    return { title: DEFAULT_PUSH_TITLE, body: DEFAULT_PUSH_BODY, tag: PUSH_TAG, data: {} }
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    const payload = await extractPushPayload(event)

    // Уникальный tag с timestamp: каждый пуш показывается как НОВОЕ системное
    // уведомление, а не тихо заменяет предыдущее (важно для iOS/Android).
    const uniqueTag = `${payload.tag || PUSH_TAG}-${Date.now()}`

    const options = {
      body: payload.body,
      tag: uniqueTag,
      renotify: true,
      data: payload.data,
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200, 100, 200],
      timestamp: Date.now(),
    }

    try {
      await self.registration.showNotification(payload.title, options)
    } catch (err) {
      // iOS Safari may reject unknown options; retry without them
      try {
        await self.registration.showNotification(payload.title, {
          body: payload.body,
          tag: uniqueTag,
          renotify: true,
          data: payload.data,
        })
      } catch (err2) {
        console.error('[SW] Push notification failed:', err2)
      }
    }
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  // Базовый URL приложения вычисляется из области видимости Service Worker.
  // Для GitHub Pages это https://evgenymayorov.github.io/PoopTracker/,
  // для локальной разработки — http://localhost:3000/PoopTracker/.
  const appUrl = new URL('./', self.registration.scope).href

  let targetUrl = appUrl
  const rawDataUrl = event.notification.data?.url
  if (typeof rawDataUrl === 'string' && rawDataUrl) {
    if (rawDataUrl.startsWith('/')) {
      // Относительный путь без ведущего слэша → резолвим относительно scope SW.
      targetUrl = new URL(rawDataUrl.replace(/^\/+/, ''), appUrl).href
    } else {
      targetUrl = new URL(rawDataUrl, appUrl).href
    }
  }

  event.waitUntil(
    (async () => {
      // Если вкладка приложения уже открыта — фокусируем её.
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clientList) {
        if (client.url.startsWith(appUrl) && typeof client.focus === 'function') {
          await client.focus()
          return
        }
      }

      // Иначе открываем новое окно с правильным URL.
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl)
      }
    })()
  )
})
