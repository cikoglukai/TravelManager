export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return

  const { user, authReady } = useAuth()

  if (!authReady.value) return

  const PROTECTED = ['/trips', '/profile', '/plan']
  const isProtected = PROTECTED.some(p => to.path === p || to.path.startsWith(p + '/'))

  if (!isProtected) return

  if (!user.value) return navigateTo('/register')

  if ((!user.value.name || user.value.name.trim() === '') && to.path !== '/profile') {
    return navigateTo('/profile?setup=1')
  }
})
