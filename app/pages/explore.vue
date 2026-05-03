<template>
  <div class="explore-page">

    <!-- ── Hero header ── -->
    <div class="explore-hero">
      <div class="explore-hero-inner">
        <h1 class="explore-title">Explore Europe</h1>
        <p class="explore-subtitle">
          Click any destination on the globe to discover routes, transport and accommodation options —
          then plan your next adventure.
        </p>
      </div>
    </div>

    <!-- ── Main: globe + panel ── -->
    <div class="explore-main">

      <!-- Globe column -->
      <div class="globe-col">
        <DestinationGlobe
          :destinations="destinations"
          :selected-id="selected?.id ?? null"
          @select="onGlobeSelect"
        />
      </div>

      <!-- Info panel column -->
      <div class="panel-col" :class="{ 'panel-col--visible': !!selected }">

        <!-- Empty state -->
        <div v-if="!selected" class="panel-empty">
          <div class="panel-empty-globe">🌍</div>
          <h3>Click a destination</h3>
          <p>Select any glowing point on the globe to discover routes, transport options and accommodation.</p>
          <ul class="panel-countries">
            <li v-for="d in destinations" :key="d.id" @click="onGlobeSelect(d)">
              {{ d.emoji }} {{ d.country }}
            </li>
          </ul>
        </div>

        <!-- Destination detail -->
        <template v-else>
          <div class="panel-header">
            <span class="panel-flag">{{ selected.emoji }}</span>
            <div>
              <h2 class="panel-country">{{ selected.country }}</h2>
              <p class="panel-city">{{ selected.city }}</p>
            </div>
            <button class="panel-close" @click="selected = null" aria-label="Close">✕</button>
          </div>

          <p class="panel-desc">{{ selected.description }}</p>

          <!-- Routes -->
          <div class="panel-routes">
            <h4 class="panel-section-label">Suggested Routes</h4>

            <div v-if="loadingRoutes" class="panel-loading">Loading routes…</div>
            <div v-else class="panel-route-list">
              <button
                v-for="r in routes"
                :key="r.id"
                class="panel-route"
                :class="{ 'panel-route--active': selectedRoute?.id === r.id }"
                @click="selectedRoute = r"
              >
                <div class="pr-top">
                  <span class="pr-name">{{ r.name }}</span>
                  <span class="pr-duration">{{ r.duration_days }} days</span>
                </div>
                <p class="pr-desc">{{ r.description }}</p>
                <div class="pr-highlights">
                  <span v-for="h in r.highlights.split('·').slice(0,3)" :key="h" class="pr-tag">
                    {{ h.trim() }}
                  </span>
                </div>
              </button>
            </div>
          </div>

          <!-- Trip creation CTA -->
          <div class="panel-cta">
            <template v-if="!creating">
              <button class="btn btn-gold btn-block" @click="startCreate">
                Plan a New Trip to {{ selected.country }} →
              </button>
            </template>

            <template v-else>
              <h4 class="panel-section-label">New Trip Details</h4>
              <form @submit.prevent="createAndPlan" class="create-form">
                <div class="cf-group">
                  <label>Trip Title *</label>
                  <input v-model="form.title" type="text" required
                    :placeholder="`My ${selected.country} Adventure`" />
                </div>
                <div class="cf-group">
                  <label>Start Date *</label>
                  <input v-model="form.start_date" type="date" required />
                </div>
                <div class="cf-group">
                  <label>
                    Short Description *
                    <span class="cf-count" :class="{ warn: form.short_description.length > 80 }">
                      {{ form.short_description.length }}/80
                    </span>
                  </label>
                  <input v-model="form.short_description" type="text" maxlength="80" required
                    :placeholder="`Exploring the best of ${selected.country}.`" />
                </div>
                <div class="form-error" v-if="createError">{{ createError }}</div>
                <div class="cf-actions">
                  <button type="button" class="btn btn-secondary" @click="creating = false">Cancel</button>
                  <button type="submit" class="btn btn-gold" :disabled="creating && saving">
                    {{ saving ? 'Creating…' : 'Create & Plan →' }}
                  </button>
                </div>
              </form>
            </template>
          </div>
        </template>
      </div><!-- /.panel-col -->
    </div><!-- /.explore-main -->
  </div>
</template>

<script setup>
const { user, waitAuthReady } = useAuth()
const { apiFetch } = useApiFetch()
const router   = useRouter()

onMounted(async () => {
  await waitAuthReady()
  if (!user.value) navigateTo('/register')
})

// ── Destinations ─────────────────────────────────────────────────────────────
const { data: destinations } = await useFetch('/api/destinations', { key: 'explore-destinations' })
const safeDestinations = computed(() => destinations.value ?? [])

// ── Globe selection ───────────────────────────────────────────────────────────
const selected      = ref(null)
const routes        = ref([])
const loadingRoutes = ref(false)
const selectedRoute = ref(null)

async function onGlobeSelect(dest) {
  selected.value      = dest
  selectedRoute.value = null
  creating.value      = false
  loadingRoutes.value = true
  try {
    routes.value = await apiFetch(`/api/destinations/${dest.id}/routes`)
    if (routes.value.length) selectedRoute.value = routes.value[0]
  } finally {
    loadingRoutes.value = false
  }
}

// ── Trip creation ─────────────────────────────────────────────────────────────
const creating    = ref(false)
const saving      = ref(false)
const createError = ref('')

const form = reactive({ title: '', start_date: '', short_description: '' })

function startCreate() {
  form.title             = `My ${selected.value.country} Trip`
  form.start_date        = ''
  form.short_description = `Exploring the best of ${selected.value.country}.`
  createError.value      = ''
  creating.value         = true
}

async function createAndPlan() {
  createError.value = ''
  saving.value      = true
  try {
    const trip = await apiFetch('/api/trips', {
      method: 'POST',
      body: {
        title:             form.title,
        destination:       selected.value.city,
        start_date:        form.start_date,
        short_description: form.short_description,
        detail_description: '',
      },
    })
    await router.push(`/plan/${trip.id}?destId=${selected.value.id}`)
  } catch (err) {
    createError.value = err.data?.statusMessage || err.message || 'Something went wrong'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* ── Page ── */
.explore-page {
  min-height: 100vh;
  background: var(--navy);
}

/* ── Hero ── */
.explore-hero {
  background: linear-gradient(135deg, #0a1628, #1a3260);
  padding: 52px 32px 40px;
  text-align: center;
  border-bottom: 1px solid rgba(201,168,76,0.15);
}
.explore-hero-inner {
  max-width: 680px;
  margin: 0 auto;
}
.explore-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.6rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12px;
  line-height: 1.1;
}
.explore-subtitle {
  color: rgba(255,255,255,0.58);
  font-size: 0.95rem;
  line-height: 1.7;
}

/* ── Main layout ── */
.explore-main {
  display: flex;
  gap: 0;
  align-items: flex-start;
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 24px 60px;
  gap: 32px;
}
.globe-col {
  flex: 1 1 0;
  min-width: 0;
  position: sticky;
  top: 80px;
}
.panel-col {
  width: 380px;
  flex-shrink: 0;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 28px;
  min-height: 520px;
  display: flex;
  flex-direction: column;
  transition: opacity 0.3s;
}

/* ── Empty state ── */
.panel-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  text-align: center;
  padding-top: 20px;
  gap: 10px;
}
.panel-empty-globe {
  font-size: 3rem;
  margin-bottom: 4px;
}
.panel-empty h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.2rem;
  color: var(--white);
  font-weight: 700;
}
.panel-empty p {
  color: rgba(255,255,255,0.45);
  font-size: 0.84rem;
  line-height: 1.6;
  max-width: 280px;
}
.panel-countries {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.panel-countries li {
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 0.84rem;
  color: rgba(255,255,255,0.55);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.panel-countries li:hover {
  background: rgba(201,168,76,0.1);
  color: var(--gold);
}

/* ── Destination panel ── */
.panel-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 16px;
}
.panel-flag {
  font-size: 2.8rem;
  line-height: 1;
  flex-shrink: 0;
}
.panel-country {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  line-height: 1.1;
  margin-bottom: 3px;
}
.panel-city {
  color: rgba(255,255,255,0.45);
  font-size: 0.82rem;
  font-style: italic;
}
.panel-close {
  margin-left: auto;
  background: none;
  border: none;
  color: rgba(255,255,255,0.3);
  font-size: 1rem;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
  flex-shrink: 0;
}
.panel-close:hover { color: #fff; }

.panel-desc {
  color: rgba(255,255,255,0.55);
  font-size: 0.84rem;
  line-height: 1.7;
  margin-bottom: 20px;
  padding-bottom: 18px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

/* ── Routes ── */
.panel-routes { margin-bottom: 20px; }
.panel-section-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--gold);
  font-weight: 700;
  margin-bottom: 12px;
  display: block;
}
.panel-loading {
  color: rgba(255,255,255,0.35);
  font-size: 0.82rem;
  padding: 12px 0;
}
.panel-route-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.panel-route {
  background: rgba(255,255,255,0.04);
  border: 1.5px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 14px 16px;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.panel-route:hover {
  border-color: rgba(201,168,76,0.4);
  background: rgba(201,168,76,0.06);
}
.panel-route--active {
  border-color: var(--gold) !important;
  background: rgba(201,168,76,0.1) !important;
}
.pr-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.pr-name {
  font-weight: 700;
  font-size: 0.9rem;
  color: #fff;
  line-height: 1.2;
}
.pr-duration {
  background: var(--gold);
  color: var(--navy);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 100px;
  white-space: nowrap;
  flex-shrink: 0;
}
.pr-desc {
  font-size: 0.78rem;
  color: rgba(255,255,255,0.45);
  line-height: 1.5;
}
.pr-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}
.pr-tag {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.55);
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 0.68rem;
}

/* ── CTA + Create form ── */
.panel-cta { margin-top: auto; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.07); }
.btn-block { width: 100%; justify-content: center; }

.create-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.cf-group {
  margin-bottom: 14px;
}
.cf-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 600;
  color: rgba(255,255,255,0.55);
  margin-bottom: 6px;
}
.cf-count {
  margin-left: auto;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.35);
}
.cf-count.warn { color: var(--error); }

.cf-group input {
  width: 100%;
  background: rgba(255,255,255,0.06);
  border: 1.5px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  padding: 10px 13px;
  font-size: 0.88rem;
  font-family: inherit;
  color: #fff;
  transition: border-color 0.2s, background 0.2s;
}
.cf-group input::placeholder { color: rgba(255,255,255,0.25); }
.cf-group input:focus {
  outline: none;
  border-color: var(--gold);
  background: rgba(255,255,255,0.09);
}
.cf-actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}
.cf-actions .btn { flex: 1; justify-content: center; }

.form-error {
  color: #f08080;
  background: rgba(192,57,43,0.15);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.82rem;
  margin-bottom: 10px;
  border-left: 3px solid var(--error);
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .explore-main {
    flex-direction: column;
    padding: 20px 16px 40px;
  }
  .globe-col { position: static; }
  .panel-col {
    width: 100%;
    min-height: auto;
  }
  .explore-title { font-size: 1.9rem; }
  .explore-hero  { padding: 36px 20px 28px; }
}
</style>
