// API Gateway — single entry point. Verifies Firebase JWT, resolves tenant +
// plan, enforces rate limits and feature gating, then proxies to services.
export default defineNitroConfig({
  srcDir: '.',
  preset: 'node-server',
  compatibilityDate: '2025-05-01',
  imports: {
    dirs: ['utils'],
  },
  runtimeConfig: {
    serviceName: 'api-gateway',
    services: {
      user: process.env.USER_SERVICE_URL || 'http://localhost:3001',
      trip: process.env.TRIP_SERVICE_URL || 'http://localhost:3002',
      destination: process.env.DESTINATION_SERVICE_URL || 'http://localhost:3003',
      social: process.env.SOCIAL_SERVICE_URL || 'http://localhost:3004',
      travelInfo: process.env.TRAVEL_INFO_SERVICE_URL || 'http://localhost:3005',
    },
  },
})
