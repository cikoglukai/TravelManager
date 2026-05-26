<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h2>My Trips</h2>
      <NuxtLink to="/trips/new" class="btn btn-gold">+ New Trip</NuxtLink>
    </div>

    <WeatherStrip v-if="!loading && trips.length" />

    <TripMap v-if="!loading && tripMarkers.length" :markers="tripMarkers" class="trips-map" />

    <div v-if="loading" class="loading-state">
      <span class="loading-spinner">✈</span>
      <p>Loading your trips…</p>
    </div>

    <div v-else-if="trips.length" class="trip-grid">
      <NuxtLink
        v-for="trip in trips"
        :key="trip.id"
        :to="`/trips/${trip.id}`"
        class="trip-card"
        :class="{ 'trip-card--warned': tripWarning(trip) }"
      >
        <span
          v-if="tripWarning(trip)"
          class="warn-flag"
          :title="`Travel warning: ${tripWarning(trip).country} — ${tripWarning(trip).title}`"
        >❗</span>
        <div class="trip-card-meta">
          <span class="trip-card-destination">{{ trip.destination }}</span>
          <span class="trip-card-date">{{ formatDate(trip.start_date) }}</span>
        </div>
        <h3>{{ trip.title }}</h3>
        <p>{{ trip.short_description }}</p>
      </NuxtLink>
    </div>

    <div v-else class="empty-state">
      <h3>No trips yet</h3>
      <p>Create your first trip to start planning.</p>
      <NuxtLink to="/trips/new" class="btn btn-primary">Create Trip</NuxtLink>
    </div>
  </div>
</template>

<script setup>
const { user, waitAuthReady } = useAuth()
const { apiFetch } = useApiFetch()
const router = useRouter()

const trips = ref([])
const alerts = ref([])
const loading = ref(true)

// Trip pins for the map, coloured red/amber when an active warning matches the
// trip's destination country (alert data already comes from /api/alerts).
// Active warning matching a trip — match on the geocoded country (dest_country),
// falling back to a substring match on the destination text.
function tripWarning(trip) {
  const country = String(trip.dest_country || '').toLowerCase()
  const dest = String(trip.destination || '').toLowerCase()
  return alerts.value.find((a) => {
    const ac = String(a.country || '').toLowerCase()
    return ac && (ac === country || dest.includes(ac))
  }) || null
}

// Trip pins for the map, coloured by any active warning.
const tripMarkers = computed(() =>
  trips.value
    .filter(t => t.dest_lat != null && t.dest_lng != null)
    .map((t) => {
      const alert = tripWarning(t)
      return {
        lat: Number(t.dest_lat),
        lng: Number(t.dest_lng),
        title: t.title,
        kind: alert ? 'warning' : 'trip',
        severity: alert?.severity || null,
        link: `/trips/${t.id}`,
      }
    })
)

onMounted(async () => {
  await waitAuthReady()
  if (!user.value) return navigateTo('/register')
  try {
    trips.value = await apiFetch('/api/trips')
    // Best-effort — map still renders without alert colouring.
    alerts.value = await apiFetch('/api/alerts').catch(() => [])
  } catch {
    router.push('/register')
  } finally {
    loading.value = false
  }
})

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<style scoped>
.trips-map { margin-bottom: 20px; }

.trip-card { position: relative; }
.trip-card--warned { box-shadow: inset 0 0 0 2px rgba(192,57,43,0.5), var(--shadow); }
.warn-flag {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 1.1rem;
  line-height: 1;
  filter: saturate(1.4);
  cursor: help;
}

.loading-state,
.empty-state {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 56px 32px;
  text-align: center;
}

.loading-state p,
.empty-state p {
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

.empty-state h3 {
  color: var(--navy);
  font-family: 'Playfair Display', serif;
  font-size: 1.75rem;
  margin-bottom: 8px;
}

.empty-state .btn {
  margin-top: 20px;
}

.trip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}

.trip-card {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.trip-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

.trip-card-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-muted);
  font-size: 0.84rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.trip-card-destination {
  color: var(--gold);
  font-weight: 700;
}

.trip-card h3 {
  color: var(--navy);
  font-family: 'Playfair Display', serif;
  font-size: 1.45rem;
  line-height: 1.2;
}

.trip-card p {
  color: var(--text);
}
</style>
