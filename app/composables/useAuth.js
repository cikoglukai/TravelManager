import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  updateProfile,
} from 'firebase/auth'

export const useAuth = () => {
  const user = useState('user', () => null)
  const authReady = useState('authReady', () => false)

  const _getToken = async () => {
    if (!import.meta.client) return null
    const auth = getAuth()
    if (!auth.currentUser) return null
    return auth.currentUser.getIdToken()
  }

  const _hydrateProfile = async (fbUser) => {
    const token = await fbUser.getIdToken()
    try {
      user.value = await $fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch (err) {
      // /api/users/me 404 → SQL row missing (e.g. DB wiped while Firebase
      // session still cached). Upsert it so subsequent FK-bound writes
      // (trips, reviews, …) succeed.
      if (err?.status === 404 || err?.statusCode === 404) {
        try {
          user.value = await $fetch('/api/users', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: { name: fbUser.displayName ?? fbUser.email },
          })
          return
        } catch { /* fall through to stub */ }
      }
      user.value = {
        firebase_uid: fbUser.uid,
        email: fbUser.email,
        name: fbUser.displayName ?? fbUser.email,
      }
    }
  }

  const signUpEmail = async (email, password, name) => {
    const auth = getAuth()
    const { user: fbUser } = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(fbUser, { displayName: name })
    const token = await fbUser.getIdToken(true)
    const profile = await $fetch('/api/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { name },
    })
    user.value = profile
    authReady.value = true
  }

  const signInEmail = async (email, password) => {
    const auth = getAuth()
    const { user: fbUser } = await signInWithEmailAndPassword(auth, email, password)
    // Hydrate synchronously so the caller's navigateTo() runs against a
    // populated user.value — otherwise the global auth middleware sees
    // user.value === null and bounces back to /register.
    await _hydrateProfile(fbUser)
    authReady.value = true
  }

  const signInGoogle = async () => {
    const auth = getAuth()
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const token = await result.user.getIdToken()
    await $fetch('/api/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: { name: result.user.displayName ?? result.user.email },
    })
    await _hydrateProfile(result.user)
    authReady.value = true
  }

  const setUser = (nextUser) => {
    user.value = nextUser
  }

  const initAuth = () => {
    if (!import.meta.client) return
    const auth = getAuth()
    onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        await _hydrateProfile(fbUser)
      } else {
        user.value = null
      }
      authReady.value = true
    })
  }

  const logout = async () => {
    if (!import.meta.client) return
    const auth = getAuth()
    await signOut(auth)
    user.value = null
  }

  // Resolves once `onAuthStateChanged` has fired at least once.
  // Use before any guard like `if (!user.value) return navigateTo('/register')`
  // to avoid a hydration race where the Firebase session is restored from
  // IndexedDB after the page's onMounted has already run.
  const waitAuthReady = () => {
    if (!import.meta.client || authReady.value) return Promise.resolve()
    return new Promise((resolve) => {
      const stop = watch(authReady, (ready) => {
        if (ready) { stop(); resolve() }
      })
    })
  }

  return {
    user,
    authReady,
    setUser,
    signUpEmail,
    signInEmail,
    signInGoogle,
    initAuth,
    logout,
    waitAuthReady,
  }
}
