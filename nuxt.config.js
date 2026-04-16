export default defineNuxtConfig({
  srcDir: 'app/',
  serverDir: 'server/',
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  nitro: {
    preset: "node-server"
  }
})
