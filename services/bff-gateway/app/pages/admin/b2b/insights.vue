<script setup>
import { useApiFetch } from '~/composables/useApiFetch.js'
const { apiFetch } = useApiFetch()

const destinations = ref([])
const selectedId = ref(null)
const samples = ref([])
const loading = ref(false)

async function load() {
  destinations.value = await apiFetch('/api/destinations') || []
  if (!selectedId.value && destinations.value.length) selectedId.value = destinations.value[0].id
}

async function fetchInsights() {
  if (!selectedId.value) return
  loading.value = true
  try {
    const r = await apiFetch(`/api/b2b/destinations/${selectedId.value}/insights`)
    samples.value = r.samples || []
  } catch {
    samples.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(selectedId, fetchInsights)

// Build a simple bar-chart by stacking origin-country counts inline (no chart lib dep).
function topBuckets(originCountry) {
  if (!originCountry) return []
  return Object.entries(originCountry)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
}

function pct(count, max) {
  return max > 0 ? Math.round((count / max) * 100) : 0
}
</script>

<template>
  <div class="b2b-page">
    <h1>B2B traveller insights</h1>
    <p class="muted">Enterprise feature. Anonymized: buckets with fewer than 10 travellers are hidden (k-anon).</p>

    <select v-model="selectedId" class="dest-select">
      <option v-for="d in destinations" :key="d.id" :value="d.id">{{ d.city }} ({{ d.country }})</option>
    </select>

    <div v-if="loading" class="muted">Loading…</div>

    <div v-else-if="!samples.length" class="muted">No data yet for this destination.</div>

    <ul v-else class="months">
      <li v-for="(s, i) in samples" :key="i" class="month">
        <header>
          <h3>{{ s.period }}</h3>
          <span class="muted">{{ Object.keys(s.aggregates.origin_country || {}).length }} origin countries</span>
        </header>
        <ul class="buckets">
          <li v-for="[country, count] in topBuckets(s.aggregates.origin_country)"
              :key="country" class="bucket">
            <span class="country">{{ country }}</span>
            <div class="bar"><div class="fill" :style="{ width: pct(count, Object.values(s.aggregates.origin_country).reduce((a, b) => Math.max(a, b), 0)) + '%' }"></div></div>
            <span class="count">{{ count }}</span>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.b2b-page { max-width: 900px; margin: 2rem auto; padding: 0 1rem; }
.muted { color: #64748b; }
.dest-select { margin: 1rem 0; padding: 0.55rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; }
.months { list-style: none; padding: 0; display: grid; gap: 1rem; }
.month { background: white; padding: 1.25rem; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
.month header { display: flex; justify-content: space-between; align-items: baseline; }
.month h3 { margin: 0; }
.buckets { list-style: none; padding: 0; margin-top: 0.75rem; display: grid; gap: 0.4rem; }
.bucket { display: grid; grid-template-columns: 80px 1fr 50px; gap: 0.75rem; align-items: center; font-size: 0.9rem; }
.country { font-weight: 600; }
.bar { background: #e2e8f0; border-radius: 999px; height: 8px; overflow: hidden; }
.fill { background: var(--navy, #0f172a); height: 100%; transition: width 0.3s; }
.count { text-align: right; font-variant-numeric: tabular-nums; }
</style>
