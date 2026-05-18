// Guards /admin/* routes:
//   - signed-in required (else /register)
//   - role must be admin or destination_manager (else /)
//   - plan must clear the per-route minimum (else /upgrade)
//
// Plan + role come from event.context.tenant + user.role propagated by bff-gateway server middleware.
// Client-side we rely on the user object hydrated by useAuth() and tenant from useState('tenant').

export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return
  if (!to.path.startsWith('/admin')) return

  const { user, authReady } = useAuth()
  if (!authReady.value) return
  if (!user.value) return navigateTo('/register')

  const role = user.value.role || 'member'
  if (role !== 'admin' && role !== 'destination_manager') return navigateTo('/')

  // Per-route plan minimum: admin/branding + admin/destinations -> standard, b2b -> enterprise.
  const PLAN_RANK = { free: 0, standard: 1, enterprise: 2 }
  const need = to.path.startsWith('/admin/b2b') ? 'enterprise' : 'standard'
  const tenant = useState('tenant', () => ({ plan: 'free' }))
  const have = PLAN_RANK[tenant.value?.plan ?? 'free']
  if (have < PLAN_RANK[need]) return navigateTo(`/upgrade?need=${need}`)
})
