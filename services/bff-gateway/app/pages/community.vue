<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h2>Community Trips</h2>
      <div class="page-header-right">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search trips…"
            class="search-input"
            @input="onSearchInput"
          />
        </div>
        <NuxtLink v-if="user" to="/trips/new" class="btn btn-gold">+ New Trip</NuxtLink>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <span class="loading-spinner">✈</span>
      <p>Loading trips…</p>
    </div>

    <div v-else-if="trips.length" class="trip-grid">
      <NuxtLink
        v-for="trip in trips"
        :key="trip.id"
        :to="`/trips/${trip.id}`"
        class="trip-card"
      >
        <div class="trip-card-meta">
          <span class="trip-card-destination">{{ trip.destination }}</span>
          <span class="trip-card-date">{{ formatDate(trip.start_date) }}</span>
        </div>
        <h3 class="trip-card-title">{{ trip.title }}</h3>
        <p class="trip-card-desc">{{ trip.short_description }}</p>
        <div class="trip-card-author">
          <span class="author-avatar">{{ trip.author_name.charAt(0).toUpperCase() }}</span>
          {{ trip.author_name }}
        </div>
      </NuxtLink>
    </div>

    <div v-else class="loading-state">
      <p v-if="debouncedSearch">No trips match "{{ debouncedSearch }}".</p>
      <p v-else>No trips found yet. Be the first to create one!</p>
      <NuxtLink v-if="user" to="/trips/new" class="btn btn-gold" style="margin-top:16px">Create Trip</NuxtLink>
    </div>
  </div>
</template>

<script setup>
const { user } = useAuth()
const { apiFetch } = useApiFetch()

const searchQuery     = ref('')
const debouncedSearch = ref('')
let debounceTimer = null

function onSearchInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = searchQuery.value
  }, 350)
}

const tripsData = ref([])
const loading   = ref(false)

async function fetchTrips() {
  loading.value = true
  try {
    const url = debouncedSearch.value
      ? `/api/trips/all?q=${encodeURIComponent(debouncedSearch.value)}`
      : '/api/trips/all'
    tripsData.value = await apiFetch(url)
  } catch {
    tripsData.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchTrips)
watch(debouncedSearch, fetchTrips)

const trips = computed(() => tripsData.value)

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}
</script>

<style scoped>
.page-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-bar {
  position: relative;
}
.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
  pointer-events: none;
}
.search-input {
  padding: 9px 16px 9px 36px;
  border: 2px solid var(--sand-dark);
  border-radius: 100px;
  font-size: 0.88rem;
  font-family: inherit;
  background: var(--white);
  color: var(--text);
  width: 220px;
  transition: border-color 0.2s, width 0.2s;
}
.search-input:focus {
  outline: none;
  border-color: var(--gold);
  width: 280px;
}

.loading-state {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 56px 32px;
  text-align: center;
  color: var(--text-muted);
}

.loading-spinner {
  display: inline-block;
  font-size: 2.25rem;
  margin-bottom: 12px;
  animation: fly 2s ease-in-out infinite;
}

@keyframes fly {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  50% { transform: translateX(10px) rotate(5deg); }
}

.trip-card-author {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
}

.author-avatar {
  width: 22px;
  height: 22px;
  background: var(--navy);
  color: var(--white);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .page-header-right { gap: 8px; }
  .search-input { width: 160px; }
  .search-input:focus { width: 200px; }
}
</style>
