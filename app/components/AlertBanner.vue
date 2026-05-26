<!-- Travel-warning banner. Pulls /api/alerts (Travel Info service) and shows any
     active warnings affecting the user's trips. -->
<template>
  <div v-if="uniqueAlerts.length && !dismissed" class="alert-banner">
    <div class="alert-inner">
      <span class="alert-icon">⚠️</span>
      <div class="alert-list">
        <p v-for="a in uniqueAlerts.slice(0, 3)" :key="a.country + a.title" class="alert-item">
          <strong>{{ a.country }}</strong> — {{ a.title }}
          <span class="alert-sev" :class="a.severity">{{ a.severity }}</span>
        </p>
      </div>
      <button class="alert-dismiss" @click="dismissed = true" aria-label="Dismiss">×</button>
    </div>
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()
const alerts = ref([])
const dismissed = ref(false)

// The same country warning can hit several of the user's trips — collapse to
// one banner row per country+title so it isn't shown twice.
const uniqueAlerts = computed(() => {
  const seen = new Set()
  return alerts.value.filter((a) => {
    const key = `${a.country}|${a.title}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

onMounted(async () => {
  try {
    const data = await apiFetch('/api/alerts')
    if (!dismissed.value) alerts.value = Array.isArray(data) ? data : []
  } catch { /* not signed in or no alerts */ }
})
</script>

<style scoped>
.alert-banner { background: #fff4e5; border-bottom: 2px solid #e6a23c; }
.alert-inner {
  max-width: 1020px; margin: 0 auto; padding: 10px 24px;
  display: flex; align-items: center; gap: 14px;
}
.alert-icon { font-size: 1.2rem; }
.alert-list { flex: 1; }
.alert-item { font-size: 0.85rem; color: #8a5a00; margin: 2px 0; }
.alert-sev {
  margin-left: 8px; font-size: 0.7rem; text-transform: uppercase;
  padding: 1px 8px; border-radius: 100px; font-weight: 700;
}
.alert-sev.warning { background: #c0392b; color: #fff; }
.alert-sev.partial { background: #e6a23c; color: #fff; }
.alert-dismiss { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #8a5a00; }
</style>
