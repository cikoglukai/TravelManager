// Standalone Nitro app — User Service.
// Scans api/ (-> /api), middleware/, plugins/ and auto-imports from utils/.
export default defineNitroConfig({
  srcDir: '.',
  preset: 'node-server',
  compatibilityDate: '2025-05-01',
  imports: {
    dirs: ['utils'],
  },
  runtimeConfig: {
    serviceName: 'user-service',
  },
})
