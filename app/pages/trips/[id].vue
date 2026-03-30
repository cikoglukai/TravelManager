<template>
  <div class="page-wrapper">
    <div class="page-header">
      <NuxtLink to="/trips" class="btn-back">← My Trips</NuxtLink>
      <div v-if="trip && !editing" class="detail-actions">
        <button class="btn btn-outline" @click="editing = true">Edit Trip</button>
        <button class="btn btn-danger" @click="deleteTrip" :disabled="deleting">
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <span class="loading-spinner">✈</span>
      <p>Loading trip…</p>
    </div>

    <div v-else-if="editing">
      <TripForm :trip="trip" @saved="onSaved" @cancelled="editing = false" />
    </div>

    <div v-else-if="trip" class="trip-detail">
      <div class="trip-detail-header">
        <h1>{{ trip.title }}</h1>
        <div class="trip-detail-meta">
          <span class="badge badge-dest">📍 {{ trip.destination }}</span>
          <span class="badge badge-date">📅 {{ formatDate(trip.start_date) }}</span>
        </div>
      </div>

      <div class="trip-divider"></div>

      <div class="trip-section">
        <h3>Summary</h3>
        <p>{{ trip.short_description }}</p>
      </div>

      <div class="trip-section" v-if="trip.detail_description">
        <h3>Details</h3>
        <p>{{ trip.detail_description }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const { user } = useAuth()
const route = useRoute()
const router = useRouter()

const trip = ref(null)
const loading = ref(true)
const editing = ref(false)
const deleting = ref(false)

onMounted(async () => {
  if (!user.value) return navigateTo('/register')
  await fetchTrip()
})

async function fetchTrip() {
  loading.value = true
  try {
    trip.value = await $fetch(`/api/trips/${route.params.id}`)
  } catch {
    router.push('/trips')
  } finally {
    loading.value = false
  }
}

function onSaved(savedTrip) {
  trip.value = savedTrip
  editing.value = false
}

async function deleteTrip() {
  if (!confirm(`Delete "${trip.value.title}"? This cannot be undone.`)) return
  deleting.value = true
  try {
    await $fetch(`/api/trips/${trip.value.id}`, { method: 'DELETE' })
    router.push('/trips')
  } catch (err) {
    alert(err.data?.statusMessage || 'Delete failed')
    deleting.value = false
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<style scoped>
.detail-actions {
  display: flex;
  gap: 12px;
}

.loading {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-muted);
}
.loading-spinner {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 12px;
  animation: fly 2s ease-in-out infinite;
}
@keyframes fly {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  50% { transform: translateX(10px) rotate(5deg); }
}

.trip-detail {
  background: var(--white);
  border-radius: var(--radius);
  padding: 44px;
  box-shadow: var(--shadow);
}
.trip-detail-header {
  margin-bottom: 28px;
}
.trip-detail h1 {
  font-family: 'Playfair Display', serif;
  font-size: 2.4rem;
  color: var(--navy);
  margin-bottom: 16px;
  line-height: 1.2;
}
.trip-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.trip-divider {
  height: 1px;
  background: linear-gradient(90deg, var(--gold), transparent);
  margin-bottom: 32px;
}
.trip-section {
  margin-bottom: 32px;
}
.trip-section h3 {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--gold);
  font-weight: 700;
  margin-bottom: 12px;
}
.trip-section p {
  color: #444;
  white-space: pre-wrap;
  line-height: 1.8;
  font-size: 0.97rem;
}
</style>
