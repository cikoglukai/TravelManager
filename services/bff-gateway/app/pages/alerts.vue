<script setup>
import { useApiFetch } from '~/composables/useApiFetch.js'
import { useAuth } from '~/composables/useAuth.js'

const { user, authReady } = useAuth()
const { apiFetch } = useApiFetch()
const alerts = ref([])
const loading = ref(false)

async function load() {
  if (!user.value) return
  loading.value = true
  try {
    alerts.value = await apiFetch('/api/alerts/me') || []
  } finally {
    loading.value = false
  }
}

watch(() => authReady.value && user.value, () => load(), { immediate: true })

const severityClass = (s) => `sev sev-${s}`
</script>

<template>
  <div class="alerts-page">
    <header><h1>Travel alerts</h1><p class="muted">Warnings that match your trip destinations.</p></header>

    <div v-if="!user && authReady" class="empty">
      <p>Sign in to see alerts for your trips.</p>
      <NuxtLink to="/register" class="cta">Sign in</NuxtLink>
    </div>

    <div v-else-if="loading" class="empty">Loading…</div>

    <div v-else-if="!alerts.length" class="empty">
      <h2>All clear ✓</h2>
      <p>No active warnings for your destinations.</p>
    </div>

    <ul v-else class="alert-list">
      <li v-for="a in alerts" :key="`${a.trip_id}-${a.warning_id}`" class="alert">
        <span :class="severityClass(a.severity)">{{ a.severity }}</span>
        <div class="body">
          <strong>{{ a.country_iso2 }}{{ a.region ? ` · ${a.region}` : '' }}</strong>
          <p>{{ a.summary }}</p>
          <small class="muted">Source: {{ a.source }} · <NuxtLink :to="`/trips/${a.trip_id}`">View trip</NuxtLink></small>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.alerts-page { max-width: 760px; margin: 2rem auto; padding: 0 1rem; }
h1 { margin: 0 0 0.25rem; }
.muted { color: #64748b; }
.empty { margin-top: 2rem; text-align: center; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
.cta { display: inline-block; margin-top: 1rem; padding: 0.6rem 1.4rem; background: var(--navy, #0f172a); color: white; border-radius: 8px; text-decoration: none; font-weight: 600; }
.alert-list { list-style: none; padding: 0; display: grid; gap: 0.75rem; margin-top: 1.5rem; }
.alert { display: flex; gap: 0.75rem; padding: 1rem 1.25rem; background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.body p { margin: 0.25rem 0; }
.sev { font-size: 0.75rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 999px; text-transform: uppercase; height: fit-content; }
.sev-info     { background: #dbeafe; color: #1e3a8a; }
.sev-advisory { background: #fef3c7; color: #92400e; }
.sev-warning  { background: #fed7aa; color: #9a3412; }
.sev-danger   { background: #fecaca; color: #991b1b; }
.sev-extreme  { background: #1e293b; color: #fecaca; }
</style>
