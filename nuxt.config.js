export default defineNuxtConfig({
  srcDir: 'app/',
  serverDir: 'server/',
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
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
})
