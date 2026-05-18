// Trip service Nitro config — minimal HTTP server, no UI.
export default defineNitroConfig({
  srcDir: '.',
  routeRules: {
    '/api/**': { cors: true },
  },
  runtimeConfig: {
    // All real config lives in env (12-Factor); this section just declares the ones we read.
    databaseUrlTrip: '',
    googleCloudProject: '',
  },
})
