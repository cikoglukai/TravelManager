// Standalone Nitro app — Trip Service (core domain + event publisher).
export default defineNitroConfig({
  srcDir: '.',
  preset: 'node-server',
  compatibilityDate: '2025-05-01',
  imports: {
    dirs: ['utils'],
  },
  runtimeConfig: {
    serviceName: 'trip-service',
    rapidApiKey: process.env.RAPIDAPI_KEY ?? '',
    destinationServiceUrl: process.env.DESTINATION_SERVICE_URL || 'http://localhost:3003',
  },
})
