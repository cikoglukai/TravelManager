// Notification Service (async). Consumes TravelAlert + NewsletterReady,
// delivers email via SendGrid. No public API surface (control endpoint only).
export default defineNitroConfig({
  srcDir: '.',
  preset: 'node-server',
  compatibilityDate: '2025-05-01',
  imports: {
    dirs: ['utils'],
  },
  runtimeConfig: {
    serviceName: 'notification-service',
    userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    sendgridApiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.FROM_EMAIL || 'alerts@travelmanager.app',
    alertSub: process.env.TRAVEL_ALERT_SUB || 'notify-travel-alert-sub',
    newsletterSub: process.env.NEWSLETTER_SUB || 'notify-newsletter-sub',
  },
})
