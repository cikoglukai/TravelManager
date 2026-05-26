<!-- Personalized live feed (Social service). Standard+ plan. -->
<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h2>Your Feed</h2>
    </div>

    <SocialTabs />

    <p v-if="error" class="form-error">{{ error }}</p>
    <p v-if="pending" class="loading">Loading your feed…</p>

    <div v-else-if="entries.length" class="trip-grid">
      <NuxtLink v-for="e in entries" :key="e.trip_id" :to="`/trips/${e.trip_id}`" class="trip-card">
        <div class="trip-card-title">{{ e.title }}</div>
        <div class="trip-card-meta">
          <span class="badge badge-dest">📍 {{ e.destination }}</span>
          <span class="badge badge-date">by {{ e.author_name }}</span>
        </div>
      </NuxtLink>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">📰</div>
      <p>Your feed is empty. Follow travellers and their new trips show up here.</p>
      <NuxtLink to="/discover" class="btn btn-gold" style="margin-top:16px">Find travellers to follow →</NuxtLink>
    </div>
  </div>
</template>

<script setup>
const { apiFetch } = useApiFetch()
const entries = ref([])
const pending = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    entries.value = await apiFetch('/api/feed')
  } catch (err) {
    error.value = err?.data?.statusMessage || 'The feed requires the Standard plan or higher.'
  } finally {
    pending.value = false
  }
})
</script>

<style scoped>
.empty-icon { font-size: 2.6rem; margin-bottom: 8px; }
</style>
