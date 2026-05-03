<template>
  <div class="page-wrapper">
    <!-- Breadcrumb -->
    <div class="plan-breadcrumb">
      <NuxtLink :to="`/trips/${tripId}`" class="btn btn-back">← Back to Trip</NuxtLink>
      <span class="breadcrumb-trip" v-if="trip">{{ trip.title }}</span>
    </div>

    <!-- Loading -->
    <div v-if="loadingTrip" class="loading">Loading…</div>

    <template v-else>
      <!-- Wizard header -->
      <div class="wizard-header">
        <h2 class="wizard-title">Travel Plan</h2>
        <p class="wizard-subtitle">
          {{ existingPlan ? 'Update your travel plan for this trip.' : 'Select your destination, route, transport and accommodation.' }}
        </p>
      </div>

      <!-- Progress bar -->
      <div class="wizard-progress">
        <div
          v-for="(s, i) in STEPS"
          :key="i"
          class="progress-step"
          :class="{ active: step === i + 1, done: step > i + 1 }"
          @click="goToStep(i + 1)"
        >
          <div class="progress-dot">
            <span v-if="step > i + 1">✓</span>
            <span v-else>{{ i + 1 }}</span>
          </div>
          <span class="progress-label">{{ s }}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }"></div>
        </div>
      </div>

      <!-- ── Step 1: Destination ── -->
      <div v-if="step === 1" class="wizard-step">
        <div class="step-heading-row">
          <div>
            <h3 class="step-heading">Choose your destination</h3>
            <p class="step-hint">Click a marker on the globe or use the list below.</p>
          </div>
          <div class="view-toggle">
            <button :class="{ 'vt-active': viewMode === 'globe' }" @click="viewMode = 'globe'">
              🌍 Globe
            </button>
            <button :class="{ 'vt-active': viewMode === 'grid' }" @click="viewMode = 'grid'">
              ☰ List
            </button>
          </div>
        </div>

        <div v-if="loadingDest" class="loading">Loading destinations…</div>

        <template v-else>
          <!-- Globe view -->
          <div v-show="viewMode === 'globe'" class="globe-step-wrapper">
            <DestinationGlobe
              :destinations="destinations"
              :selected-id="sel.destination?.id ?? null"
              @select="d => { selectDestination(d); step = 2 }"
            />
            <p v-if="sel.destination" class="globe-selected-hint">
              ✓ <strong>{{ sel.destination.emoji }} {{ sel.destination.country }}</strong> selected —
              <button class="inline-link" @click="step = 2">continue to route selection →</button>
            </p>
            <p v-else class="globe-selected-hint globe-selected-hint--idle">
              Click any glowing marker to select a destination and continue automatically.
            </p>
          </div>

          <!-- List/grid view -->
          <div v-show="viewMode === 'grid'" class="dest-grid">
            <button
              v-for="d in destinations"
              :key="d.id"
              class="dest-card"
              :class="{ selected: sel.destination?.id === d.id }"
              @click="selectDestination(d)"
            >
              <span class="dest-emoji">{{ d.emoji }}</span>
              <span class="dest-country">{{ d.country }}</span>
              <span class="dest-city">{{ d.city }}</span>
              <p class="dest-desc">{{ d.description }}</p>
              <span v-if="sel.destination?.id === d.id" class="selected-badge">✓ Selected</span>
            </button>
          </div>
        </template>

        <div class="wizard-nav">
          <span></span>
          <button class="btn btn-gold" :disabled="!sel.destination" @click="step = 2">
            Next: Choose Route →
          </button>
        </div>
      </div>

      <!-- ── Step 2: Route ── -->
      <div v-if="step === 2" class="wizard-step">
        <div class="step-context">
          <span class="step-context-flag">{{ sel.destination?.emoji }}</span>
          <strong>{{ sel.destination?.country }}</strong>
        </div>
        <h3 class="step-heading">Choose a route</h3>
        <p class="step-hint">Select the itinerary that best matches your travel style.</p>

        <div v-if="loadingRoutes" class="loading">Loading routes…</div>
        <div v-else class="route-grid">
          <button
            v-for="r in routes"
            :key="r.id"
            class="route-card"
            :class="{ selected: sel.route?.id === r.id }"
            @click="selectRoute(r)"
          >
            <div class="route-card-top">
              <span class="route-name">{{ r.name }}</span>
              <span class="route-duration">{{ r.duration_days }} days</span>
            </div>
            <p class="route-desc">{{ r.description }}</p>
            <div class="route-highlights">
              <span class="highlights-label">Highlights</span>
              <div class="highlights-tags">
                <span v-for="h in r.highlights.split('·')" :key="h" class="highlight-tag">
                  {{ h.trim() }}
                </span>
              </div>
            </div>
            <span v-if="sel.route?.id === r.id" class="selected-badge">✓ Selected</span>
          </button>
        </div>

        <div class="wizard-nav">
          <button class="btn btn-secondary" @click="step = 1">← Destination</button>
          <button class="btn btn-gold" :disabled="!sel.route" @click="step = 3">
            Next: Transport →
          </button>
        </div>
      </div>

      <!-- ── Step 3: Transport ── -->
      <div v-if="step === 3" class="wizard-step">
        <div class="step-context">
          <span class="step-context-flag">{{ sel.destination?.emoji }}</span>
          <strong>{{ sel.route?.name }}</strong>
          <span class="step-context-sep">·</span>
          <span>{{ sel.route?.duration_days }} days</span>
        </div>
        <h3 class="step-heading">Choose your transport</h3>
        <p class="step-hint">How will you get there and travel around?</p>

        <div class="option-grid">
          <button
            v-for="t in sel.route?.transport_options"
            :key="t.id"
            class="option-card transport-card"
            :class="{ selected: sel.transport?.id === t.id }"
            @click="sel.transport = t"
          >
            <div class="option-card-icon">{{ transportIcon(t.type) }}</div>
            <div class="option-card-body">
              <div class="option-type-badge" :class="`type-${t.type}`">{{ t.type }}</div>
              <div class="option-name">{{ t.provider }}</div>
              <div class="option-detail">
                <span class="option-duration">🕐 {{ t.duration }}</span>
                <span class="option-price">From €{{ t.price_from }}</span>
              </div>
              <p class="option-notes">{{ t.notes }}</p>
            </div>
            <span v-if="sel.transport?.id === t.id" class="selected-badge">✓ Selected</span>
          </button>
        </div>

        <div class="wizard-nav">
          <button class="btn btn-secondary" @click="step = 2">← Route</button>
          <button class="btn btn-gold" :disabled="!sel.transport" @click="step = 4">
            Next: Accommodation →
          </button>
        </div>
      </div>

      <!-- ── Step 4: Accommodation ── -->
      <div v-if="step === 4" class="wizard-step">
        <div class="step-context">
          <span class="step-context-flag">{{ sel.destination?.emoji }}</span>
          <strong>{{ sel.route?.name }}</strong>
          <span class="step-context-sep">·</span>
          <span class="option-type-badge" :class="`type-${sel.transport?.type}`">{{ sel.transport?.type }}</span>
          <strong>{{ sel.transport?.provider }}</strong>
        </div>
        <h3 class="step-heading">Choose your accommodation</h3>
        <p class="step-hint">Where will you stay during this journey?</p>

        <div class="option-grid">
          <button
            v-for="a in sel.route?.accommodation_options"
            :key="a.id"
            class="option-card accommodation-card"
            :class="{ selected: sel.accommodation?.id === a.id }"
            @click="sel.accommodation = a"
          >
            <div class="option-card-icon">{{ accommodationIcon(a.type) }}</div>
            <div class="option-card-body">
              <div class="option-type-badge" :class="`accom-${a.type}`">{{ a.type }}</div>
              <div class="option-name">{{ a.name }}</div>
              <div class="option-detail">
                <span class="option-price">€{{ a.price_per_night }}/night</span>
                <span class="option-rating">{{ starRating(a.rating) }} {{ a.rating }}</span>
              </div>
              <p class="option-notes">{{ a.notes }}</p>
            </div>
            <span v-if="sel.accommodation?.id === a.id" class="selected-badge">✓ Selected</span>
          </button>
        </div>

        <div class="wizard-nav">
          <button class="btn btn-secondary" @click="step = 3">← Transport</button>
          <button class="btn btn-gold" :disabled="!sel.accommodation" @click="step = 5">
            Review & Save →
          </button>
        </div>
      </div>

      <!-- ── Step 5: Review ── -->
      <div v-if="step === 5" class="wizard-step">
        <h3 class="step-heading">Review your travel plan</h3>
        <p class="step-hint">Everything looks right? Add any personal notes and save.</p>

        <div class="review-card">
          <!-- Trip info -->
          <div class="review-section review-trip">
            <span class="review-label">Trip</span>
            <div class="review-value review-trip-title">{{ trip?.title }}</div>
            <div class="review-meta">
              <span class="badge badge-dest">📍 {{ trip?.destination }}</span>
              <span class="badge badge-date">📅 {{ trip?.start_date }}</span>
            </div>
          </div>

          <div class="review-divider"></div>

          <!-- Destination + Route -->
          <div class="review-grid">
            <div class="review-section">
              <span class="review-label">Destination</span>
              <div class="review-value">
                {{ sel.destination?.emoji }} {{ sel.destination?.country }}
              </div>
              <div class="review-sub">{{ sel.destination?.city }}</div>
            </div>
            <div class="review-section">
              <span class="review-label">Route</span>
              <div class="review-value">{{ sel.route?.name }}</div>
              <div class="review-sub">{{ sel.route?.duration_days }} days</div>
            </div>
          </div>

          <div class="review-divider"></div>

          <!-- Transport + Accommodation -->
          <div class="review-grid">
            <div class="review-section">
              <span class="review-label">Transport</span>
              <div class="review-value">
                {{ transportIcon(sel.transport?.type) }} {{ sel.transport?.provider }}
              </div>
              <div class="review-sub">
                {{ sel.transport?.duration }} · From €{{ sel.transport?.price_from }}
              </div>
            </div>
            <div class="review-section">
              <span class="review-label">Accommodation</span>
              <div class="review-value">
                {{ accommodationIcon(sel.accommodation?.type) }} {{ sel.accommodation?.name }}
              </div>
              <div class="review-sub">
                €{{ sel.accommodation?.price_per_night }}/night · {{ starRating(sel.accommodation?.rating) }} {{ sel.accommodation?.rating }}
              </div>
            </div>
          </div>

          <div class="review-divider"></div>

          <!-- Highlights -->
          <div class="review-section">
            <span class="review-label">Highlights</span>
            <div class="review-highlights">
              <span v-for="h in sel.route?.highlights.split('·')" :key="h" class="highlight-tag">
                {{ h.trim() }}
              </span>
            </div>
          </div>

          <div class="review-divider"></div>

          <!-- Notes -->
          <div class="review-section">
            <label class="review-label" for="plan-notes">
              Personal Notes
              <span class="char-count">{{ notes.length }}/1000</span>
            </label>
            <textarea
              id="plan-notes"
              v-model="notes"
              rows="4"
              maxlength="1000"
              placeholder="Any personal notes, reminders or custom details for this plan…"
              class="plan-notes-input"
            ></textarea>
          </div>
        </div>

        <div class="form-error" v-if="saveError">{{ saveError }}</div>

        <div class="wizard-nav">
          <button class="btn btn-secondary" @click="step = 4">← Accommodation</button>
          <button class="btn btn-gold" :disabled="saving" @click="savePlan">
            {{ saving ? 'Saving…' : existingPlan ? '✓ Update Plan' : '✓ Save Travel Plan' }}
          </button>
        </div>
      </div>

      <!-- ── Existing plan summary (shown after save) ── -->
      <div v-if="savedConfirm" class="saved-confirm">
        <div class="confirm-icon">✓</div>
        <h3>Travel Plan Saved!</h3>
        <p>Your travel plan for <strong>{{ trip?.title }}</strong> has been saved.</p>
        <NuxtLink :to="`/trips/${tripId}`" class="btn btn-gold">View Trip →</NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup>
const { user, waitAuthReady } = useAuth()
const { apiFetch } = useApiFetch()
const route    = useRoute()
const router   = useRouter()

const tripId = Number(route.params.tripId)

// ── Auth guard ───────────────────────────────────────────────────────────────
onMounted(async () => {
  await waitAuthReady()
  if (!user.value) navigateTo('/register')
})

// ── Load trip ────────────────────────────────────────────────────────────────
const trip        = ref(null)
const loadingTrip = ref(true)

onMounted(async () => {
  try {
    trip.value = await apiFetch(`/api/trips/${tripId}`)
    await waitAuthReady()
    if (!user.value || trip.value.user_uid !== user.value.firebase_uid) {
      return router.replace(`/trips/${tripId}`)
    }
  } catch {
    router.push('/trips')
  } finally {
    loadingTrip.value = false
  }
})

// ── Wizard state ─────────────────────────────────────────────────────────────
const STEPS    = ['Destination', 'Route', 'Transport', 'Accommodation', 'Review']
const step     = ref(1)
const viewMode = ref('globe')   // 'globe' | 'grid'
const notes    = ref('')
const saving       = ref(false)
const saveError    = ref('')
const savedConfirm = ref(false)

const sel = reactive({
  destination:   null,
  route:         null,
  transport:     null,
  accommodation: null,
})

// ── Destinations ─────────────────────────────────────────────────────────────
const destinations  = ref([])
const loadingDest   = ref(true)

onMounted(async () => {
  destinations.value = await apiFetch('/api/destinations')
  loadingDest.value  = false

  // ── Pre-select from ?destId (coming from the Explore globe page) ──────────
  const destId = Number(route.query.destId)
  if (destId) {
    const preselect = destinations.value.find(d => d.id === destId)
    if (preselect) {
      selectDestination(preselect)
      step.value = 2   // jump straight to route selection
    }
  }
})

function selectDestination(d) {
  sel.destination   = d
  sel.route         = null
  sel.transport     = null
  sel.accommodation = null
}

// ── Routes (loaded when destination selected) ────────────────────────────────
const routes       = ref([])
const loadingRoutes = ref(false)

watch(() => sel.destination, async (dest) => {
  if (!dest) return
  loadingRoutes.value = true
  try {
    routes.value = await apiFetch(`/api/destinations/${dest.id}/routes`)
  } finally {
    loadingRoutes.value = false
  }
})

function selectRoute(r) {
  sel.route         = r
  sel.transport     = null
  sel.accommodation = null
}

// ── Load existing plan ───────────────────────────────────────────────────────
const existingPlan = ref(null)

onMounted(async () => {
  try {
    const plan = await apiFetch(`/api/travel-plans/${tripId}`)
    existingPlan.value = plan
    notes.value = plan.notes ?? ''
    // Pre-load the destination and fetch its routes so we can restore selections
    const dest = destinations.value.find(d => d.id === plan.destination_id)
    if (dest) {
      await selectAndLoadDestination(dest, plan)
    }
  } catch {
    // 404 = no existing plan, fine
  }
})

async function selectAndLoadDestination(dest, plan) {
  sel.destination = dest
  loadingRoutes.value = true
  try {
    routes.value = await apiFetch(`/api/destinations/${dest.id}/routes`)
    const r = routes.value.find(r => r.id === plan.route_id)
    if (r) {
      sel.route         = r
      sel.transport     = r.transport_options.find(t => t.id === plan.transport_id)
      sel.accommodation = r.accommodation_options.find(a => a.id === plan.accommodation_id)
    }
  } finally {
    loadingRoutes.value = false
  }
}

// ── Navigation ───────────────────────────────────────────────────────────────
function goToStep(n) {
  // Only allow jumping to completed steps
  if (n <= step.value) step.value = n
  if (n === 2 && sel.destination) step.value = 2
  if (n === 3 && sel.route)       step.value = 3
  if (n === 4 && sel.transport)   step.value = 4
  if (n === 5 && sel.accommodation) step.value = 5
}

// ── Save ─────────────────────────────────────────────────────────────────────
async function savePlan() {
  saveError.value = ''
  saving.value    = true
  try {
    await apiFetch(`/api/travel-plans/${tripId}`, {
      method: 'POST',
      body: {
        destination_id:          sel.destination.id,
        route_id:                sel.route.id,
        transport_option_id:     sel.transport.id,
        accommodation_option_id: sel.accommodation.id,
        notes:                   notes.value,
      },
    })
    savedConfirm.value = true
    step.value = 99  // hide wizard
  } catch (err) {
    saveError.value = err.data?.statusMessage || err.message || 'Something went wrong'
  } finally {
    saving.value = false
  }
}

// ── Icons & helpers ──────────────────────────────────────────────────────────
const TRANSPORT_ICONS = { flight: '✈️', train: '🚂', bus: '🚌', car: '🚗', ferry: '⛴️' }
const ACCOMMODATION_ICONS = { hotel: '🏨', hostel: '🛏️', apartment: '🏠', guesthouse: '🏡', camping: '⛺' }

function transportIcon(type)     { return TRANSPORT_ICONS[type]     ?? '🚀' }
function accommodationIcon(type) { return ACCOMMODATION_ICONS[type] ?? '🏠' }
function starRating(r)           { return '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r)) }
</script>

<style scoped>
/* ── Step 1: Globe wrapper ── */
.step-heading-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}
.view-toggle {
  display: flex;
  border: 1.5px solid var(--sand-dark);
  border-radius: 100px;
  overflow: hidden;
  flex-shrink: 0;
}
.view-toggle button {
  background: none;
  border: none;
  padding: 6px 16px;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  color: var(--text-muted);
  transition: background 0.2s, color 0.2s;
}
.view-toggle button.vt-active {
  background: var(--navy);
  color: var(--white);
}

.globe-step-wrapper {
  background: #0a1628;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 20px;
  border: 1.5px solid rgba(201,168,76,0.15);
}
.globe-selected-hint {
  padding: 10px 20px 14px;
  font-size: 0.82rem;
  color: rgba(255,255,255,0.5);
  text-align: center;
}
.globe-selected-hint strong { color: #c9a84c; }
.globe-selected-hint--idle { color: rgba(255,255,255,0.3); }
.inline-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--gold);
  font-weight: 600;
  font-size: inherit;
  font-family: inherit;
  cursor: pointer;
  text-decoration: underline;
}

/* ── Layout ── */
.plan-breadcrumb {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
}
.breadcrumb-trip {
  font-family: 'Playfair Display', serif;
  font-size: 1rem;
  color: var(--navy);
  opacity: 0.6;
}

.wizard-header {
  margin-bottom: 28px;
}
.wizard-title {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  color: var(--navy);
  font-weight: 700;
  margin-bottom: 6px;
}
.wizard-subtitle {
  color: var(--text-muted);
  font-size: 0.92rem;
}

/* ── Progress bar ── */
.wizard-progress {
  display: flex;
  align-items: center;
  gap: 0;
  background: var(--white);
  border-radius: var(--radius);
  padding: 20px 28px;
  box-shadow: var(--shadow);
  margin-bottom: 28px;
  position: relative;
  overflow: hidden;
}
.progress-track {
  position: absolute;
  left: 60px;
  right: 60px;
  top: 50%;
  height: 2px;
  background: var(--sand-dark);
  z-index: 0;
  transform: translateY(-50%);
}
.progress-fill {
  height: 100%;
  background: var(--gold);
  transition: width 0.4s ease;
}
.progress-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  position: relative;
  z-index: 1;
}
.progress-dot {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid var(--sand-dark);
  background: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  transition: all 0.3s;
}
.progress-step.active .progress-dot {
  border-color: var(--gold);
  background: var(--gold);
  color: var(--navy);
}
.progress-step.done .progress-dot {
  border-color: var(--gold);
  background: var(--gold);
  color: var(--navy);
}
.progress-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  font-weight: 600;
  white-space: nowrap;
}
.progress-step.active .progress-label,
.progress-step.done .progress-label {
  color: var(--navy);
}

/* ── Step wrapper ── */
.wizard-step {
  background: var(--white);
  border-radius: var(--radius);
  padding: 40px;
  box-shadow: var(--shadow);
}
.step-heading {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  color: var(--navy);
  margin-bottom: 6px;
}
.step-hint {
  color: var(--text-muted);
  font-size: 0.88rem;
  margin-bottom: 28px;
}
.step-context {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: var(--text-muted);
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.step-context-flag { font-size: 1.2rem; }
.step-context strong { color: var(--navy); }
.step-context-sep { color: var(--sand-dark); }

/* ── Destination grid ── */
.dest-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}
.dest-card {
  background: var(--sand);
  border: 2px solid transparent;
  border-radius: var(--radius);
  padding: 20px 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-family: inherit;
  position: relative;
}
.dest-card:hover {
  border-color: var(--gold);
  background: rgba(201,168,76,0.06);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}
.dest-card.selected {
  border-color: var(--gold);
  background: rgba(201,168,76,0.1);
  box-shadow: 0 0 0 4px rgba(201,168,76,0.15);
}
.dest-emoji  { font-size: 2.2rem; }
.dest-country {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  font-size: 1rem;
  color: var(--navy);
}
.dest-city {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-style: italic;
}
.dest-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-top: 4px;
}

/* ── Route grid ── */
.route-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}
.route-card {
  background: var(--sand);
  border: 2px solid transparent;
  border-radius: var(--radius);
  padding: 24px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-family: inherit;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}
.route-card:hover {
  border-color: var(--gold);
  background: rgba(201,168,76,0.06);
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}
.route-card.selected {
  border-color: var(--gold);
  background: rgba(201,168,76,0.1);
  box-shadow: 0 0 0 4px rgba(201,168,76,0.15);
}
.route-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.route-name {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--navy);
  line-height: 1.2;
}
.route-duration {
  background: var(--navy);
  color: var(--white);
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
.route-desc {
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.6;
}
.route-highlights {}
.highlights-label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--gold);
  font-weight: 600;
  margin-bottom: 8px;
}
.highlights-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.highlight-tag {
  background: rgba(15,31,61,0.07);
  color: var(--navy);
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 500;
}

/* ── Option cards (transport & accommodation) ── */
.option-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
}
.option-card {
  background: var(--sand);
  border: 2px solid transparent;
  border-radius: var(--radius);
  padding: 22px 24px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-family: inherit;
  display: flex;
  align-items: flex-start;
  gap: 20px;
  position: relative;
}
.option-card:hover {
  border-color: var(--gold);
  background: rgba(201,168,76,0.06);
  box-shadow: var(--shadow);
}
.option-card.selected {
  border-color: var(--gold);
  background: rgba(201,168,76,0.08);
  box-shadow: 0 0 0 4px rgba(201,168,76,0.15);
}
.option-card-icon {
  font-size: 2rem;
  flex-shrink: 0;
  width: 48px;
  text-align: center;
}
.option-card-body {
  flex: 1;
  min-width: 0;
}
.option-type-badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 100px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}
.type-flight  { background: #e8f4fd; color: #1a6fa0; }
.type-train   { background: #e8f7e8; color: #1a7a3a; }
.type-bus     { background: #fdf3e8; color: #8a5a1a; }
.type-car     { background: #f0e8fd; color: #5a1a8a; }
.type-ferry   { background: #e8f7fd; color: #1a6a7a; }
.accom-hotel     { background: #fdf3e8; color: #8a5a1a; }
.accom-hostel    { background: #e8f4fd; color: #1a6fa0; }
.accom-apartment { background: #e8fdf3; color: #1a7a4a; }
.accom-guesthouse { background: #f7e8fd; color: #6a1a8a; }
.accom-camping   { background: #f0fde8; color: #3a7a1a; }

.option-name {
  font-weight: 700;
  font-size: 1rem;
  color: var(--navy);
  margin-bottom: 6px;
}
.option-detail {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 0.85rem;
  flex-wrap: wrap;
}
.option-duration { color: var(--text-muted); }
.option-price {
  font-weight: 700;
  color: var(--navy);
  font-size: 0.92rem;
}
.option-rating {
  color: var(--gold);
  font-size: 0.82rem;
  font-weight: 600;
}
.option-notes {
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.6;
}

/* ── Selected badge ── */
.selected-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  background: var(--gold);
  color: var(--navy);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 100px;
}

/* ── Review card ── */
.review-card {
  background: var(--sand);
  border-radius: var(--radius);
  padding: 32px;
  margin-bottom: 28px;
  border: 1px solid var(--sand-dark);
}
.review-section { margin-bottom: 0; }
.review-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--gold);
  font-weight: 700;
  margin-bottom: 8px;
}
.char-count {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text-muted);
}
.review-value {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 4px;
}
.review-trip-title { font-size: 1.3rem; margin-bottom: 10px; }
.review-meta { display: flex; gap: 10px; flex-wrap: wrap; }
.review-sub { font-size: 0.85rem; color: var(--text-muted); }
.review-divider {
  height: 1px;
  background: var(--sand-dark);
  margin: 20px 0;
}
.review-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.review-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.plan-notes-input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid var(--sand-dark);
  border-radius: 10px;
  font-size: 0.9rem;
  font-family: inherit;
  background: var(--white);
  color: var(--text);
  resize: vertical;
  transition: border-color 0.2s;
}
.plan-notes-input:focus {
  outline: none;
  border-color: var(--gold);
}

/* ── Navigation ── */
.wizard-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 28px;
  border-top: 1px solid var(--sand-dark);
  margin-top: 8px;
}

/* ── Save confirmation ── */
.saved-confirm {
  background: var(--white);
  border-radius: var(--radius);
  padding: 60px 40px;
  box-shadow: var(--shadow);
  text-align: center;
}
.confirm-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--gold);
  color: var(--navy);
  font-size: 1.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}
.saved-confirm h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.8rem;
  color: var(--navy);
  margin-bottom: 10px;
}
.saved-confirm p {
  color: var(--text-muted);
  margin-bottom: 28px;
}

@media (max-width: 640px) {
  .wizard-step { padding: 24px 16px; }
  .dest-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .route-grid { grid-template-columns: 1fr; }
  .review-grid { grid-template-columns: 1fr; }
  .progress-label { display: none; }
  .wizard-progress { padding: 16px; }
  .review-card { padding: 20px 16px; }
}
</style>
