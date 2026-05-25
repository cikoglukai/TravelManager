export default defineNuxtConfig({
  srcDir: 'app/',
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  // Pure frontend now: the monolith server/ moved to archive/monolith-server.
  // All /api traffic is routed to the API Gateway by the ingress (prod) or nginx
  // (local). apiBase lets the SPA target a different gateway origin if needed.
  runtimeConfig: {
    public: {
      apiBase:       process.env.NUXT_PUBLIC_API_BASE ?? '',
      googleMapsKey: process.env.NUXT_PUBLIC_GOOGLE_MAPS_KEY ?? '',
      firebase: {
        apiKey:            process.env.NUXT_PUBLIC_FIREBASE_API_KEY          ?? '',
        authDomain:        process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN      ?? '',
        projectId:         process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID       ?? '',
        appId:             process.env.NUXT_PUBLIC_FIREBASE_APP_ID           ?? '',
        storageBucket:     process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET   ?? '',
      },
    },
  },

  vite: {
    build: {
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/three') || id.includes('node_modules/globe.gl')) {
              return 'vendor-globe'
            }
          },
        },
      },
    },
  },
  nitro: {
    preset: "node-server"
  }
})
