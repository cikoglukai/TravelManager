<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h2>My Trips</h2>
      <NuxtLink to="/trips/new" class="btn btn-gold">+ New Trip</NuxtLink>
    </div>

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
      >
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
const loading = ref(true)

onMounted(async () => {
  await waitAuthReady()
  if (!user.value) return navigateTo('/register')
  try {
    trips.value = await apiFetch('/api/trips')
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
