export default defineNitroConfig({
  srcDir: '.',
  routeRules: { '/api/**': { cors: true } },
})
