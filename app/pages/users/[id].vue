<!-- Public read-only profile of another traveller. Mirrors profile.vue's layout
     without the edit/avatar controls, plus a Follow button. -->
<template>
  <div class="page-wrapper">
    <div class="page-header">
      <NuxtLink to="/discover" class="btn btn-back">← Discover</NuxtLink>
    </div>

    <div v-if="pending" class="loading">Loading profile…</div>
    <div v-else-if="error" class="form-error">{{ error }}</div>

    <template v-else-if="profile">
      <div class="profile-card">
        <!-- Hero -->
        <div class="profile-hero">
          <div class="profile-hero-bg"></div>
          <div class="profile-hero-content">
            <div class="avatar-wrapper">
              <img
                v-if="profile.avatar_url"
                :src="profile.avatar_url"
                class="profile-avatar profile-avatar-img"
                alt="Profile photo"
              />
              <div v-else class="profile-avatar" :style="{ background: avatarGradient }">
                {{ profile.name.charAt(0).toUpperCase() }}
              </div>
            </div>

            <div class="profile-meta">
              <h1 class="profile-name">{{ profile.name }}</h1>
              <p class="profile-location" v-if="profile.home_city">
                <span class="location-icon">📍</span> {{ profile.home_city }}
              </p>
              <p class="profile-since">Member since {{ memberSince }}</p>
            </div>

            <div class="profile-hero-actions">
              <NuxtLink v-if="isSelf" to="/profile" class="btn btn-outline">View your profile →</NuxtLink>
              <FollowButton v-else :uid="uid" />
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-value">{{ trips.length }}</span>
            <span class="stat-label">{{ trips.length === 1 ? 'Trip' : 'Trips' }}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ uniqueDestinations }}</span>
            <span class="stat-label">{{ uniqueDestinations === 1 ? 'Destination' : 'Destinations' }}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ memberYear }}</span>
            <span class="stat-label">Member Since</span>
          </div>
        </div>

        <!-- Bio -->
        <div class="profile-body">
          <div class="profile-section">
            <h3 class="section-label">About</h3>
            <p v-if="profile.bio" class="profile-bio">{{ profile.bio }}</p>
            <p v-else class="profile-bio-empty">This traveller hasn't added a bio yet.</p>
          </div>
        </div>

        <!-- Their trips -->
        <div class="profile-body trips-block" v-if="trips.length">
          <div class="profile-section">
            <h3 class="section-label">Trips</h3>
            <div class="trip-grid">
              <NuxtLink
                v-for="trip in trips"
                :key="trip.id"
                :to="`/trips/${trip.id}`"
                class="trip-card"
              >
                <div class="trip-card-meta">
                  <span class="badge badge-dest">📍 {{ trip.destination }}</span>
                  <span class="badge badge-date">{{ formatDate(trip.start_date) }}</span>
                </div>
                <h3 class="trip-card-title">{{ trip.title }}</h3>
                <p class="trip-card-desc">{{ trip.short_description }}</p>
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
const route = useRoute()
const { user } = useAuth()
const { apiFetch } = useApiFetch()
const { loadFollows } = useFollows()

const uid = computed(() => route.params.id)
const isSelf = computed(() => user.value?.firebase_uid === uid.value)

const profile = ref(null)
const trips   = ref([])
const pending = ref(true)
const error   = ref('')

onMounted(async () => {
  loadFollows()
  try {
    const [p, allTrips] = await Promise.all([
      apiFetch(`/api/users/${uid.value}`),
      apiFetch('/api/trips/all'),
    ])
    profile.value = p
    // No per-user public trips endpoint; filter the public feed by author.
    trips.value = (allTrips || []).filter(t => t.user_uid === uid.value)
  } catch (err) {
    error.value = err?.data?.statusMessage || 'Traveller not found.'
  } finally {
    pending.value = false
  }
})

const uniqueDestinations = computed(() =>
  new Set(trips.value.map(t => (t.destination || '').toLowerCase().trim())).size
)

const memberSince = computed(() => {
  if (!profile.value?.created_at) return ''
  return new Date(profile.value.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})
const memberYear = computed(() => {
  if (!profile.value?.created_at) return ''
  return new Date(profile.value.created_at).getFullYear()
})

const avatarGradient = computed(() => {
  const palettes = [
    ['#1a3260', '#c9a84c'], ['#2d6a4f', '#b7e4c7'], ['#6a1a4f', '#f4accd'],
    ['#1a4a6a', '#a8d8ea'], ['#4a3728', '#d4a26a'], ['#2d3561', '#a8d8ea'],
  ]
  const name = profile.value?.name ?? 'A'
  const [from, to] = palettes[name.charCodeAt(0) % palettes.length]
  return `linear-gradient(135deg, ${from}, ${to})`
})

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<style scoped>
.profile-card {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.profile-hero { position: relative; padding: 0; }
.profile-hero-bg {
  height: 120px;
  background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%);
}
.profile-hero-content {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  padding: 0 40px 32px;
  position: relative;
  margin-top: -48px;
  flex-wrap: wrap;
}
.avatar-wrapper { position: relative; width: 96px; height: 96px; flex-shrink: 0; border-radius: 50%; }
.profile-avatar {
  width: 96px; height: 96px;
  border-radius: 50%;
  border: 4px solid var(--white);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Playfair Display', serif;
  font-size: 2.6rem; font-weight: 700; color: var(--white);
  box-shadow: 0 4px 16px rgba(15,31,61,0.2);
}
.profile-avatar-img { object-fit: cover; display: block; }
.profile-meta { flex: 1; min-width: 0; padding-top: 52px; }
.profile-name {
  font-family: 'Playfair Display', serif;
  font-size: 1.8rem; color: var(--navy); font-weight: 700;
  line-height: 1.2; margin-bottom: 4px;
}
.profile-location { color: var(--navy); font-size: 0.88rem; font-weight: 500; margin-bottom: 4px; }
.location-icon { margin-right: 2px; }
.profile-since { color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; }
.profile-hero-actions { margin-left: auto; margin-top: 52px; display: flex; align-items: flex-end; }

.profile-stats {
  display: flex; align-items: center; justify-content: center;
  border-top: 1px solid var(--sand-dark);
  border-bottom: 1px solid var(--sand-dark);
  padding: 24px 40px;
}
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }
.stat-value { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; color: var(--navy); line-height: 1; }
.stat-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); font-weight: 500; }
.stat-divider { width: 1px; height: 48px; background: var(--sand-dark); flex-shrink: 0; }

.profile-body { padding: 36px 40px; }
.trips-block { padding-top: 0; }
.section-label {
  font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.14em;
  color: var(--gold); font-weight: 600; margin-bottom: 12px;
}
.profile-bio { color: var(--text); line-height: 1.8; white-space: pre-wrap; font-size: 0.95rem; }
.profile-bio-empty { color: var(--text-muted); font-size: 0.9rem; font-style: italic; }

@media (max-width: 600px) {
  .profile-hero-content { padding: 0 20px 28px; gap: 16px; }
  .profile-body { padding: 28px 20px; }
  .profile-stats { padding: 20px; }
  .profile-hero-actions { margin-top: 0; }
  .profile-meta { padding-top: 8px; }
}
</style>
