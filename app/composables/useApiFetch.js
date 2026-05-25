import { getAuth } from 'firebase/auth'

export const useApiFetch = () => {
  const apiFetch = async (url, options = {}) => {
    let headers = { ...options.headers }

    if (import.meta.client) {
      try {
        const auth = getAuth()
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken()
          headers['Authorization'] = `Bearer ${token}`
        }
      } catch { /* no token available */ }
    }

    // Prefix relative /api calls with the gateway origin when configured.
    // Empty apiBase = same-origin (ingress / nginx routes /api -> gateway).
    const base = useRuntimeConfig().public.apiBase
    const target = base && url.startsWith('/api') ? `${base}${url}` : url

    return $fetch(target, { ...options, headers })
  }

  return { apiFetch }
}
