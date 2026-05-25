import { initializeApp, getApps } from 'firebase/app'

export default defineNuxtPlugin(() => {
  const { firebase } = useRuntimeConfig().public
  // No apiKey (e.g. local cluster without Firebase) → skip init so the SPA still
  // boots. Auth/login disabled; public browsing works.
  if (!firebase?.apiKey) {
    console.warn('[firebase] no apiKey configured — auth disabled')
    return
  }
  if (getApps().length === 0) {
    initializeApp(firebase)
  }
})
