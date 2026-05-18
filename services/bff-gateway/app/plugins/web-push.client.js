// Registers the service worker and (lazily, on user opt-in via a UI button) subscribes to Web Push.
// Exposes useWebPush() composable from app/composables/useWebPush.js for the UI.

export default defineNuxtPlugin(async () => {
  if (!('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch (e) {
    console.warn('[web-push] SW register failed:', e?.message || e)
  }
})
