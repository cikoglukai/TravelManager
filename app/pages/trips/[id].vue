<template>
  <div class="page-wrapper">
    <!-- Header: back link + edit/delete actions (hidden while in edit mode) -->
    <div class="page-header">
      <NuxtLink to="/trips" class="btn-back">← My Trips</NuxtLink>
      <div v-if="trip && !editing" class="trip-detail-actions" style="margin:0;padding:0;border:none">
        <button class="btn btn-outline" @click="editing = true">Edit</button>
        <button class="btn btn-danger" @click="deleteTrip" :disabled="deleting">
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading…</div>

    <!-- Edit mode: reuse TripForm with the current trip pre-filled -->
    <div v-else-if="editing">
      <TripForm :trip="trip" @saved="onSaved" @cancelled="editing = false" />
    </div>

    <!-- View mode: display all trip fields -->
    <div v-else-if="trip" class="trip-detail">
      <h1>{{ trip.title }}</h1>
      <div class="trip-detail-meta">
        <span class="badge badge-dest">📍 {{ trip.destination }}</span>
        <span class="badge badge-date">📅 {{ formatDate(trip.start_date) }}</span>
      </div>

      <div class="trip-section">
        <h3>Summary</h3>
        <p>{{ trip.short_description }}</p>
      </div>

      <!-- Detail description is optional — only rendered when present -->
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
  // Guard: unauthenticated users are sent to login
  if (!user.value) return navigateTo('/register')
  await fetchTrip()
})

// Loads the full trip (including detail_description) from the API
async function fetchTrip() {
  loading.value = true
  try {
    trip.value = await $fetch(`/api/trips/${route.params.id}`)
  } catch {
    // Trip not found or access error — fall back to the list
    router.push('/trips')
  } finally {
    loading.value = false
  }
}

// Called by TripForm after a successful PUT — updates local state without re-fetching
function onSaved(savedTrip) {
  trip.value = savedTrip
  editing.value = false
}

// Prompts for confirmation before deleting; redirects to list on success
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