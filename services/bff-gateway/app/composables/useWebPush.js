import { useApiFetch } from './useApiFetch.js'

// Public VAPID key — safe to embed. Set via NUXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY env -> runtimeConfig.public.
function getVapidPublicKey() {
  const cfg = useRuntimeConfig()
  return cfg.public?.webpushVapidPublicKey || ''
}

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export const useWebPush = () => {
  const { apiFetch } = useApiFetch()

  async function ensurePermissionAndSubscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return null
    const reg = await navigator.serviceWorker.ready
    const key = getVapidPublicKey()
    if (!key) {
      console.warn('[web-push] NUXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY not set — cannot subscribe')
      return null
    }
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      })
    }
    // Persist subscription server-side.
    await apiFetch('/api/subscriptions', { method: 'POST', body: sub.toJSON() })
    return sub
  }

  return { ensurePermissionAndSubscribe }
}
