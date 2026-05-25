// Travel Info Service (async). CronJobs poll travel warnings + weather, diff
// against active trips, publish TravelAlert events. Also serves /api/alerts.
export default defineNitroConfig({
  srcDir: '.',
  preset: 'node-server',
  compatibilityDate: '2025-05-01',
  imports: {
    dirs: ['utils'],
  },
  runtimeConfig: {
    serviceName: 'travel-info-service',
    tripServiceUrl: process.env.TRIP_SERVICE_URL || 'http://localhost:3002',
    warningsApiUrl: process.env.WARNINGS_API_URL || 'https://www.auswaertiges-amt.de/opendata/travelwarning',
    weatherApiUrl: process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast',
  },
})
