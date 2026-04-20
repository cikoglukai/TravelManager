<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h2>Community Trips</h2>
      <NuxtLink to="/trips/new" class="btn btn-gold">+ New Trip</NuxtLink>
    </div>

    <div v-if="loading" class="loading-state">
      <span class="loading-spinner">✈</span>
      <p>Loading trips…</p>
    </div>

    <div v-else-if="filtered.length" class="trip-grid">
      <NuxtLink
        v-for="trip in filtered"
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
      <p>No trips found yet. Be the first to create one!</p>
      <NuxtLink to="/trips/new" class="btn btn-gold" style="margin-top:16px">Create Trip</NuxtLink>
    </div>
  </div>
</template>

<script setup>
const { user } = useAuth()

onMounted(() => {
  if (!user.value) navigateTo('/register')
})

const { data, pending } = await useFetch('/api/trips/all', { key: 'community-trips' })

const loading = computed(() => pending.value)
const filtered = computed(() => data.value ?? [])

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}
</script>

<style scoped>
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
</style>
