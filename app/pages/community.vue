<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h2>Community Trips</h2>
      <div class="page-header-right">
        <div v-show="sortMode === 'newest'" class="search-bar">
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

    <SocialTabs />

    <!-- Sort: chronological vs personalised "For You" -->
    <div class="sort-toggle">
      <button class="sort-btn" :class="{ active: sortMode === 'newest' }" @click="sortMode = 'newest'">Newest</button>
      <button class="sort-btn" :class="{ active: sortMode === 'foryou' }" @click="sortMode = 'foryou'">✨ For You</button>
    </div>

    <div v-if="loading" class="loading-state">
      <span class="loading-spinner">✈</span>
      <p>Loading trips…</p>
    </div>

    <div v-else-if="trips.length" class="trip-grid">
      <div
        v-for="trip in trips"
        :key="trip.id"
        class="trip-card"
      >
        <NuxtLink :to="`/trips/${trip.id}`" class="trip-card-body">
          <div class="trip-card-meta">
            <span class="trip-card-destination">{{ trip.destination }}</span>
            <span class="trip-card-date">{{ formatDate(trip.start_date) }}</span>
          </div>
          <h3 class="trip-card-title">{{ trip.title }}</h3>
          <p class="trip-card-desc">{{ trip.short_description }}</p>
          <span v-if="trip.reason" class="reason-badge" :class="`reason-${trip.reason}`">
            {{ reasonLabel(trip.reason) }}
          </span>
        </NuxtLink>
        <div class="trip-card-footer">
          <NuxtLink :to="`/users/${trip.user_uid}`" class="trip-card-author">
            <span class="author-avatar">{{ trip.author_name.charAt(0).toUpperCase() }}</span>
            {{ trip.author_name }}
          </NuxtLink>
          <FollowButton :uid="trip.user_uid" />
        </div>
      </div>
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
const { loadFollows } = useFollows()

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
const sortMode  = ref('newest')   // 'newest' | 'foryou'

async function fetchTrips() {
  loading.value = true
  try {
    let url
    if (sortMode.value === 'foryou') {
      url = '/api/trips/recommended'           // personalised, ignores search
    } else {
      url = debouncedSearch.value
        ? `/api/trips/all?q=${encodeURIComponent(debouncedSearch.value)}`
        : '/api/trips/all'
    }
    tripsData.value = await apiFetch(url)
  } catch {
    tripsData.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchTrips(); loadFollows() })
watch(debouncedSearch, fetchTrips)
watch(sortMode, fetchTrips)

const trips = computed(() => tripsData.value)

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

const REASON_LABELS = {
  interest: '✨ In a country you love',
  popular: '🔥 Popular',
  new: '🆕 Fresh',
}
function reasonLabel(r) { return REASON_LABELS[r] || '' }
</script>

<style scoped>
.page-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* Sort toggle */
.sort-toggle {
  display: inline-flex;
  gap: 4px;
  background: var(--white);
  border: 1px solid var(--sand-dark);
  border-radius: 100px;
  padding: 4px;
  margin-bottom: 20px;
}
.sort-btn {
  border: none;
  background: none;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  padding: 6px 16px;
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.2s;
}
.sort-btn.active { background: var(--navy); color: var(--white); }

/* Recommendation reason badge */
.reason-badge {
  display: inline-block;
  margin-top: 10px;
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 0.72rem;
  font-weight: 600;
}
.reason-interest { background: rgba(201,168,76,0.18); color: #8a6d20; }
.reason-popular  { background: rgba(192,57,43,0.12); color: var(--error); }
.reason-new      { background: rgba(15,31,61,0.07); color: var(--navy); }

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

.trip-card-body { display: block; }

.trip-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--sand-dark);
}

.trip-card-author {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 500;
  transition: color 0.2s;
}
.trip-card-author:hover { color: var(--navy); }

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
