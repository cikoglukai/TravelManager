<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h2>New Trip</h2>
      <NuxtLink to="/trips" class="btn-back">← My Trips</NuxtLink>
    </div>
    <TripForm @saved="onSaved" />
  </div>
</template>

<script setup>
const { user, waitAuthReady } = useAuth()
onMounted(async () => {
  await waitAuthReady()
  if (!user.value) navigateTo('/register')
})
function onSaved(trip) { navigateTo(`/trips/${trip.id}`) }
</script>
