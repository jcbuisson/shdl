import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
   // Enable worker support
   worker: {
      format: 'es', // Use ES module format for workers
      plugins: () => []
   },

   plugins: [
      vue({
         template: {
            compilerOptions: {
               isCustomElement: tag => tag.startsWith('jcb-')
            },
         }
      }),
   
      VitePWA({
         devOptions: {
            enabled: false
         },
         mode: "development",
         base: "/",
         srcDir: "src",
         filename: "sw.ts",
         includeAssets: ["/favicon.png"],
         strategies: "injectManifest",
         manifest: {
            name: "Offline",
            short_name: "Offline",
            theme_color: "#ffffff",
            start_url: "/",
            display: "standalone",
            background_color: "#ffffff",
            icons: [
               {
                  src: "icons/logo-world-192x192.jpg",
                  sizes: "192x192",
                  type: "image/jpeg",
               },
               {
                  src: "icons/logo-world-512x512.jpg",
                  sizes: "512x512",
                  type: "image/jpeg",
               },
               {
                  src: "icons/logo-world-512x512.jpg",
                  sizes: "512x512",
                  type: "image/jpeg",
                  purpose: "any maskable",
               },
            ],
         },
      }),
   ],
   server: {
      port: 8080,
      open: true,
      host: true, // allows for external device connection on local network
      proxy: {
         '^/shdl-socket-io/.*': {
            target: 'http://localhost:3000',
            ws: true,
            secure: false,
            changeOrigin: true,
         },
         '^/static/.*': 'http://localhost:3000',
      }
   },
})
