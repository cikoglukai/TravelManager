// bff-gateway = Nuxt SSR + edge BFF + tenant resolver + plan-feature gate.
// All Vue pages live in ./app/. Server routes (proxies to upstream services) live in ./server/.
export default defineNuxtConfig({
  srcDir: 'app/',
  // serverDir defaults to ./server/ — Nuxt picks up our existing proxy routes alongside the SSR app.
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  runtimeConfig: {
    public: {
      firebase: {
        apiKey:        process.env.NUXT_PUBLIC_FIREBASE_API_KEY        ?? '',
        authDomain:    process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN    ?? '',
        projectId:     process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID     ?? '',
        appId:         process.env.NUXT_PUBLIC_FIREBASE_APP_ID         ?? '',
        storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
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
    preset: 'node-server',
  },
})
