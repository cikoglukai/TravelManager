// Client-only Nuxt plugin (the .client.js suffix ensures it never runs on the server).
// Restores the logged-in user from localStorage before any page mounts,
// so protected pages can read user.value synchronously in onMounted.
export default defineNuxtPlugin(() => {
  const { initAuth } = useAuth()
  initAuth()
})