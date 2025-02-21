import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

// prompt for new content
self.addEventListener('message', (event) => {
   if (event.data && event.data.type === 'SKIP_WAITING')
      self.skipWaiting()
})

// cleanup outdated cached assets
cleanupOutdatedCaches()

// cache assets
precacheAndRoute(self.__WB_MANIFEST)
