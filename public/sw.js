// Self-destructing service worker.
//
// This app has no service worker and wants none. But `localhost:3000` is a
// shared origin — a previous project served from this port registered one, and
// a registration outlives the app that created it. The browser keeps re-fetching
// `/sw.js` to check for an update, which is what filled the dev console with
// "No match found for location with path /sw.js" plus a 404 from Nitro.
//
// Returning 404 never clears that, because a failed update check leaves the old
// worker installed. The only thing that removes it is a *successful* fetch of a
// worker that then unregisters itself — which is this file.
//
// Safe to delete once no browser still has the stale registration. If this app
// ever adopts a real service worker (PWA), that worker replaces this file and
// this comment goes with it.

self.addEventListener('install', () => {
    // Skip the waiting phase so this replaces the stale worker immediately
    // instead of sitting idle until every old tab closes.
    self.skipWaiting()
})

self.addEventListener('activate', async () => {
    // Drop anything the previous worker cached, or its stale responses would keep
    // being served for this origin even after it is gone.
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))

    await self.registration.unregister()

    // Reload open clients so they leave worker control and fetch from the network.
    const clients = await self.clients.matchAll({type: 'window'})
    for (const client of clients) client.navigate(client.url)
})
