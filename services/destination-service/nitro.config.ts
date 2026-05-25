// Standalone Nitro app — Destination Service (+ B2B partner data access).
export default defineNitroConfig({
  srcDir: '.',
  preset: 'node-server',
  compatibilityDate: '2025-05-01',
  imports: {
    dirs: ['utils'],
  },
  runtimeConfig: {
    serviceName: 'destination-service',
    tripServiceUrl: process.env.TRIP_SERVICE_URL || 'http://localhost:3002',
  },
})
