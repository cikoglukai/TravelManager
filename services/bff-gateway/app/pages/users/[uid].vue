<script setup>
import FollowButton from '~/components/FollowButton.vue'
import { useApiFetch } from '~/composables/useApiFetch.js'

const route = useRoute()
const uid = computed(() => String(route.params.uid))
const { apiFetch } = useApiFetch()

const profile = ref(null)
const trips = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    // /api/users/:id served by identity-tenant (proxied through bff-gateway /api/users/* route)
    profile.value = await apiFetch(`/api/users/${uid.value}`).catch(() => null)
    const all = await apiFetch('/api/trips/all').catch(() => [])
    trips.value = (all || []).filter((t) => t.user_uid === uid.value)
  } finally {
    loading.value = false
  }
}

watch(uid, load, { immediate: true })
</script>

<template>
  <div class="user-page">
    <div v-if="loading" class="loading">Loading…</div>
    <template v-else-if="profile">
      <header class="hero">
        <img v-if="profile.avatar_url" :src="profile.avatar_url" class="avatar" :alt="profile.name" />
        <div v-else class="avatar avatar-placeholder">{{ (profile.name || '?').charAt(0) }}</div>
        <div class="meta">
          <h1>{{ profile.name || uid }}</h1>
          <p v-if="profile.home_city" class="muted">From {{ profile.home_city }}</p>
          <p v-if="profile.bio" class="bio">{{ profile.bio }}</p>
          <FollowButton :user-uid="uid" />
        </div>
      </header>

      <section class="trips">
        <h2>Trips ({{ trips.length }})</h2>
        <ul v-if="trips.length" class="trip-list">
          <li v-for="t in trips" :key="t.id">
            <NuxtLink :to="`/trips/${t.id}`">
              <strong>{{ t.title }}</strong> — {{ t.destination }}
              <span class="muted"> · {{ t.start_date }}</span>
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="muted">No public trips yet.</p>
      </section>
    </template>
    <div v-else class="loading">User not found.</div>
  </div>
</template>

<style scoped>
.user-page { max-width: 760px; margin: 2rem auto; padding: 0 1rem; }
.hero { display: flex; gap: 1.5rem; align-items: center; background: white; padding: 1.5rem; border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
.avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; }
.avatar-placeholder { display: grid; place-items: center; background: var(--navy, #0f172a); color: white; font-size: 2rem; font-weight: 700; }
.meta h1 { margin: 0 0 0.25rem; }
.muted { color: #64748b; }
.bio { margin: 0.5rem 0 0.75rem; }
.trips { margin-top: 2rem; }
.trip-list { list-style: none; padding: 0; display: grid; gap: 0.5rem; }
.trip-list li { padding: 0.75rem 1rem; background: white; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.trip-list a { text-decoration: none; color: inherit; }
.loading { text-align: center; padding: 3rem; color: #64748b; }
</style>
