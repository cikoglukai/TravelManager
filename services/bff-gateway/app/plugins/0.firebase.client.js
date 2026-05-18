import { initializeApp, getApps } from 'firebase/app'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  if (getApps().length === 0) {
    initializeApp(config.public.firebase)
  }
})
