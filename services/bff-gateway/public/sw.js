// Service worker for Web Push notifications.
self.addEventListener('install',  (e) => { self.skipWaiting() })
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()) })

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { title: 'TravelManager' } }
  const title = data.title || 'TravelManager'
  const options = {
    body: data.body || '',
    icon: '/logo_banner.png',
    badge: '/favicon.ico',
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(clients.matchAll({ type: 'window' }).then((cls) => {
    for (const c of cls) {
      if (c.url.includes(url) && 'focus' in c) return c.focus()
    }
    if (clients.openWindow) return clients.openWindow(url)
  }))
})
