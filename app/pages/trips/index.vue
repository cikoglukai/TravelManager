<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h2>My Trips</h2>
      <NuxtLink to="/trips/new" class="btn btn-primary">+ New Trip</NuxtLink>
    </div>

    <div v-if="loading" class="loading">Loading trips…</div>

    <!-- Empty state shown when the user has not created any trips yet -->
    <div v-else-if="trips.length === 0" class="empty-state">
      <p>You have no trips yet.</p>
      <NuxtLink to="/trips/new">Create your first trip →</NuxtLink>
    </div>

    <!-- Trip cards — each card links to the full detail page -->
    <div v-else class="trip-grid">
      <NuxtLink
        v-for="trip in trips"
        :key="trip.id"
        :to="`/trips/${trip.id}`"
        class="trip-card"
      >
        <div class="trip-card-title">{{ trip.title }}</div>
        <div class="trip-card-meta">
          <span class="badge badge-dest">📍 {{ trip.destination }}</span>
          <span class="badge badge-date">📅 {{ formatDate(trip.start_date) }}</span>
        </div>
        <div class="trip-card-desc">{{ trip.short_description }}</div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup>
const { user } = useAuth()
const trips = ref([])
const loading = ref(true)

onMounted(async () => {
  // Guard: unauthenticated users are sent to the register/login page
  if (!user.value) return navigateTo('/register')
  await fetchTrips()
})

// Fetches only this user's trips by passing their id as a query parameter
async function fetchTrips() {
  loading.value = true
  try {
    trips.value = await $fetch(`/api/trips?userId=${user.value.id}`)
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>