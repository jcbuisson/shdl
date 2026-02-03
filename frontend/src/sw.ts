/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

export const SW_VERSION = '2.0.15';

self.addEventListener('message', (event) => {
   if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();

   } else if (event.data === 'GET_VERSION') {
      // when app ask for version number
      event.source.postMessage({ type: 'VERSION', version: SW_VERSION });
   }
})

// self.__WB_MANIFEST is the default injection point
precacheAndRoute(self.__WB_MANIFEST)


////////  COPIED FROM A VITE-VUE-PWA SCAFOLDING EXAMPLE

// clean old assets
cleanupOutdatedCaches()

/** @type {RegExp[] | undefined} */
let allowlist
// in dev mode, we disable precaching to avoid caching issues
if (import.meta.env.DEV)
   allowlist = [/^\/$/]

// to allow work offline
registerRoute(new NavigationRoute(
   createHandlerBoundToURL('index.html'),
   { allowlist },
))
