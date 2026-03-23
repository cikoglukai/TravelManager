<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h2>New Trip</h2>
      <NuxtLink to="/trips" class="btn-back">← My Trips</NuxtLink>
    </div>

    <!-- TripForm with no :trip prop = create mode -->
    <TripForm @saved="onSaved" />
  </div>
</template>

<script setup>
const { user } = useAuth()

// Guard: redirect unauthenticated users before the page renders
onMounted(() => { if (!user.value) navigateTo('/register') })

// After the trip is created, navigate directly to its detail page
function onSaved(trip) {
  navigateTo(`/trips/${trip.id}`)
}
</script>