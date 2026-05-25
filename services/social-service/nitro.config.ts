// Social Service (async). Consumes TripCreated/TripUpdated to build per-user
// feeds; serves /api/feed and the follow graph; emits NewsletterReady.
export default defineNitroConfig({
  srcDir: '.',
  preset: 'node-server',
  compatibilityDate: '2025-05-01',
  imports: {
    dirs: ['utils'],
  },
  runtimeConfig: {
    serviceName: 'social-service',
    tripCreatedSub: process.env.TRIP_CREATED_SUB || 'social-trip-created-sub',
    tripUpdatedSub: process.env.TRIP_UPDATED_SUB || 'social-trip-updated-sub',
  },
})
