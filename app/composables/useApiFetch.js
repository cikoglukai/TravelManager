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

    return $fetch(url, { ...options, headers })
  }

  return { apiFetch }
}
