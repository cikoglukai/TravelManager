<!-- Discover travellers. No user-list endpoint exists, so the roster is derived
     from public trips (/api/trips/all), grouped by author. -->
<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h2>Discover Travellers</h2>
      <div class="page-header-right">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search travellers…"
            class="search-input"
            @input="onSearchInput"
          />
        </div>
      </div>
    </div>

    <SocialTabs />

    <div v-if="loading" class="loading-state">
      <span class="loading-spinner">✈</span>
      <p>Loading travellers…</p>
    </div>

    <div v-else-if="travellers.length" class="trip-grid">
      <div v-for="t in travellers" :key="t.uid" class="trip-card traveller-card">
        <NuxtLink :to="`/users/${t.uid}`" class="traveller-main">
          <span class="traveller-avatar">{{ t.name.charAt(0).toUpperCase() }}</span>
          <span class="traveller-info">
            <span class="traveller-name">{{ t.name }}</span>
            <span class="traveller-count">{{ t.tripCount }} {{ t.tripCount === 1 ? 'trip' : 'trips' }}</span>
          </span>
        </NuxtLink>
        <FollowButton :uid="t.uid" />
      </div>
    </div>

    <div v-else class="loading-state">
      <p v-if="debouncedSearch">No travellers match "{{ debouncedSearch }}".</p>
      <p v-else>No travellers found yet.</p>
    </div>
  </div>
</template>

<script setup>
const { user } = useAuth()
const { apiFetch } = useApiFetch()
const { loadFollows } = useFollows()

const searchQuery     = ref('')
const debouncedSearch = ref('')
let debounceTimer = null

function onSearchInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { debouncedSearch.value = searchQuery.value }, 350)
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

onMounted(() => { fetchTrips(); loadFollows() })
watch(debouncedSearch, fetchTrips)

// Collapse trips into one entry per author, excluding the current user.
const travellers = computed(() => {
  const byUid = new Map()
  for (const trip of tripsData.value) {
    if (!trip.user_uid || trip.user_uid === user.value?.firebase_uid) continue
    const existing = byUid.get(trip.user_uid)
    if (existing) existing.tripCount++
    else byUid.set(trip.user_uid, { uid: trip.user_uid, name: trip.author_name || 'Traveller', tripCount: 1 })
  }
  return [...byUid.values()].sort((a, b) => b.tripCount - a.tripCount)
})
</script>

<style scoped>
.page-header-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.search-bar { position: relative; }
.search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  font-size: 0.85rem; pointer-events: none;
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
.search-input:focus { outline: none; border-color: var(--gold); width: 280px; }

.loading-state {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 56px 32px;
  text-align: center;
  color: var(--text-muted);
}
.loading-spinner { display: inline-block; font-size: 2.25rem; margin-bottom: 12px; animation: fly 2s ease-in-out infinite; }
@keyframes fly { 0%,100% { transform: translateX(0) rotate(0deg); } 50% { transform: translateX(10px) rotate(5deg); } }

.traveller-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.traveller-main {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}
.traveller-avatar {
  width: 48px; height: 48px;
  background: var(--navy);
  color: var(--white);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Playfair Display', serif;
  font-size: 1.3rem; font-weight: 700;
  flex-shrink: 0;
}
.traveller-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.traveller-name {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem; font-weight: 700; color: var(--navy);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.traveller-count { font-size: 0.8rem; color: var(--text-muted); }

@media (max-width: 600px) {
  .search-input { width: 160px; }
  .search-input:focus { width: 200px; }
}
</style>
