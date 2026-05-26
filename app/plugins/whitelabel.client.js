// White-label theming. When the signed-in user belongs to a non-default tenant
// with a custom brand, pull its public config and apply the accent colour + logo.
// Additive: default-tenant users see no change. The nav reads `brandLogo` to swap
// its logo. Runs after auth (1.x ordering: filename sorts after auth.client.js).
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const { user } = useAuth()
  const { apiFetch } = useApiFetch()
  const brandLogo = useState('brandLogo', () => null)

  const applied = ref(null) // tenant id we've already themed, avoids refetch loops

  const apply = async (tenantId) => {
    if (!tenantId || tenantId === 'default' || tenantId === applied.value) return
    applied.value = tenantId
    try {
      const tenant = await apiFetch(`/api/tenants/${tenantId}`)
      if (tenant?.brand_color) {
        const root = document.documentElement
        root.style.setProperty('--gold', tenant.brand_color)
        root.style.setProperty('--gold-light', tenant.brand_color)
      }
      if (tenant?.logo_url) brandLogo.value = tenant.logo_url
    } catch { /* no custom brand / 404 — keep defaults */ }
  }

  // React to login (user hydrates asynchronously after Firebase restore).
  watch(() => user.value?.tenant_id, (tid) => { apply(tid) }, { immediate: true })
})
