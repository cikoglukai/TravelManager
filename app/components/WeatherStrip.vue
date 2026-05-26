<!-- Weather strip. Pulls /api/weather (Travel Info service) and shows a cached
     daily high/low per upcoming-trip destination. Value-add, hidden when empty. -->
<template>
  <div v-if="cards.length" class="weather-strip">
    <div class="weather-card" v-for="w in cards" :key="w.city">
      <div class="weather-city">{{ w.city }}</div>
      <div class="weather-temps">
        <span class="weather-max">{{ round(w.max_temp) }}°</span>
        <span class="weather-min">{{ round(w.min_temp) }}°</span>
      </div>
      <div class="weather-summary">{{ w.summary }}</div>
    </div>
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()
const cards = ref([])

function round(t) {
  return t == null ? '–' : Math.round(Number(t))
}

onMounted(async () => {
  try {
    const data = await apiFetch('/api/weather')
    cards.value = Array.isArray(data) ? data : []
  } catch { /* not signed in, no trips, or no cached weather yet */ }
})
</script>

<style scoped>
.weather-strip {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 6px;
  margin-bottom: 28px;
}
.weather-card {
  flex: 0 0 auto;
  min-width: 150px;
  background: var(--white);
  border-radius: var(--radius);
  padding: 16px 20px;
  box-shadow: var(--shadow);
  border-left: 3px solid var(--gold);
}
.weather-city {
  font-family: 'Playfair Display', serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 6px;
}
.weather-temps {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.weather-max { font-size: 1.5rem; font-weight: 700; color: var(--navy); }
.weather-min { font-size: 1rem; color: var(--text-muted); }
.weather-summary { font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; }
</style>
