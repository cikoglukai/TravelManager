// useAuth — global authentication state composable.
//
// Nuxt's useState creates a key-scoped reactive value shared across all
// components. Combined with localStorage the session survives page refreshes.
//
// Usage: const { user, setUser, logout, initAuth } = useAuth()
export const useAuth = () => {
  // 'user' is the shared state key — all calls to useAuth() reference the same value
  const user = useState('user', () => null)

  // Saves the logged-in user to both reactive state and localStorage
  const setUser = (u) => {
    user.value = u
    if (import.meta.client) {
      localStorage.setItem('tm_user', JSON.stringify(u))
    }
  }

  // Clears session from both reactive state and localStorage
  const logout = () => {
    user.value = null
    if (import.meta.client) {
      localStorage.removeItem('tm_user')
    }
  }

  // Restores session from localStorage on page load.
  // Only runs on the client — localStorage is not available during SSR.
  // Called by plugins/auth.client.js before any page mounts.
  const initAuth = () => {
    if (import.meta.client && !user.value) {
      const stored = localStorage.getItem('tm_user')
      if (stored) {
        try {
          user.value = JSON.parse(stored)
        } catch {
          // Corrupted data — clear it to avoid a broken session
          localStorage.removeItem('tm_user')
        }
      }
    }
  }

  return { user, setUser, logout, initAuth }
}