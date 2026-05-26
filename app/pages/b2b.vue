<!-- Partner Insights: Enterprise B2B destination traveller stats. Aggregated &
     anonymized — never PII. Gated to destinationMgr role (the API also enforces
     the Enterprise plan, surfaced here as a 403 message). -->
<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h2>Partner Insights</h2>
    </div>

    <div class="b2b-controls">
      <label for="dest-select">Destination</label>
      <select id="dest-select" v-model="selectedId" class="dest-select" @change="loadStats">
        <option value="" disabled>Select a destination…</option>
        <option v-for="d in destinations" :key="d.id" :value="d.id">
          {{ d.emoji }} {{ d.city }}, {{ d.country }}
        </option>
      </select>
    </div>

    <div v-if="error" class="form-error">{{ error }}</div>
    <div v-else-if="loading" class="loading">Loading insights…</div>

    <template v-else-if="report">
      <div class="stat-cards">
        <div class="stat-card">
          <span class="stat-card-value">{{ report.aggregates.tripCount }}</span>
          <span class="stat-card-label">Total trips</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-value">{{ report.aggregates.upcomingCount }}</span>
          <span class="stat-card-label">Upcoming trips</span>
        </div>
        <div class="stat-card">
          <span class="stat-card-value">{{ report.aggregates.topOrigins.length }}</span>
          <span class="stat-card-label">Origin markets</span>
        </div>
      </div>

      <div class="origins-block">
        <h3 class="section-label">Top traveller origins</h3>
        <div v-if="report.aggregates.topOrigins.length" class="origins-list">
          <div v-for="(o, i) in report.aggregates.topOrigins" :key="o.origin" class="origin-row">
            <span class="origin-rank">{{ i + 1 }}</span>
            <span class="origin-name">{{ o.origin }}</span>
            <span class="origin-bar-wrap">
              <span class="origin-bar" :style="{ width: barWidth(o.travelers) }"></span>
            </span>
            <span class="origin-count">{{ o.travelers }}</span>
          </div>
        </div>
        <p v-else class="muted">No origin data for this destination yet.</p>
      </div>

      <p class="b2b-note">{{ report.note }}</p>
    </template>
  </div>
</template>

<script setup>
const { user } = useAuth()
const { apiFetch } = useApiFetch()

const destinations = ref([])
const selectedId   = ref('')
const report       = ref(null)
const loading      = ref(false)
const error        = ref('')

onMounted(async () => {
  try {
    destinations.value = await apiFetch('/api/destinations')
  } catch {
    error.value = 'Could not load destinations.'
  }
})

async function loadStats() {
  if (!selectedId.value) return
  loading.value = true
  error.value = ''
  report.value = null
  try {
    report.value = await apiFetch(`/api/b2b/destinations/${selectedId.value}/travelers`)
  } catch (err) {
    const status = err?.status || err?.statusCode
    error.value = status === 403
      ? (err?.data?.statusMessage || 'Partner Insights requires the Enterprise plan and the Destination Manager role.')
      : (err?.data?.statusMessage || 'Could not load insights.')
  } finally {
    loading.value = false
  }
}

const maxTravelers = computed(() =>
  Math.max(1, ...(report.value?.aggregates.topOrigins.map(o => o.travelers) ?? [1]))
)
function barWidth(n) { return `${Math.round((n / maxTravelers.value) * 100)}%` }
</script>

<style scoped>
.b2b-controls { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
.b2b-controls label {
  font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.08em;
  font-weight: 600; color: var(--navy);
}
.dest-select {
  padding: 11px 16px;
  border: 2px solid var(--sand-dark);
  border-radius: 10px;
  font-family: inherit; font-size: 0.92rem;
  background: var(--white); color: var(--text);
  min-width: 260px;
}
.dest-select:focus { outline: none; border-color: var(--gold); }

.stat-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin-bottom: 32px; }
.stat-card {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  border-top: 3px solid var(--gold);
  padding: 28px 24px;
  display: flex; flex-direction: column; gap: 6px; align-items: flex-start;
}
.stat-card-value { font-family: 'Playfair Display', serif; font-size: 2.4rem; font-weight: 700; color: var(--navy); line-height: 1; }
.stat-card-label { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); font-weight: 500; }

.origins-block { background: var(--white); border-radius: var(--radius); box-shadow: var(--shadow); padding: 28px 32px; }
.section-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.14em; color: var(--gold); font-weight: 600; margin-bottom: 16px; }
.origins-list { display: flex; flex-direction: column; gap: 12px; }
.origin-row { display: flex; align-items: center; gap: 12px; }
.origin-rank {
  width: 22px; height: 22px; flex-shrink: 0;
  background: var(--navy); color: var(--white);
  border-radius: 50%; font-size: 0.7rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
}
.origin-name { width: 140px; flex-shrink: 0; font-weight: 500; color: var(--navy); font-size: 0.9rem; }
.origin-bar-wrap { flex: 1; height: 10px; background: var(--sand-dark); border-radius: 100px; overflow: hidden; }
.origin-bar { display: block; height: 100%; background: linear-gradient(90deg, var(--gold), var(--gold-light)); border-radius: 100px; }
.origin-count { width: 32px; text-align: right; font-weight: 700; color: var(--navy); font-size: 0.9rem; }

.muted { color: var(--text-muted); font-size: 0.9rem; }
.b2b-note { margin-top: 20px; font-size: 0.8rem; color: var(--text-muted); font-style: italic; }

@media (max-width: 600px) {
  .b2b-controls { flex-direction: column; align-items: stretch; }
  .dest-select { min-width: 0; width: 100%; }
  .origin-name { width: 90px; }
}
</style>
