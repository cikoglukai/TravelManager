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

      <!-- Progress bar (hidden once saved) -->
      <div class="wizard-progress" v-if="!savedConfirm">
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

      <!-- Draft restored notice -->
      <div v-if="draftRestored && !savedConfirm" class="draft-banner">
        ✓ Unsaved draft restored. <button class="draft-discard" @click="discardDraft">Start fresh</button>
      </div>

      <!-- Step container — directional slide on step change -->
      <div class="wizard-steps" :class="`dir-${direction}`">

      <!-- ── Step 1: Destination (template mode only) ── -->
      <div v-if="step === 1 && planMode === 'template'" class="wizard-step">
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

      <!-- ── Step 2: Route (template mode) ── -->
      <div v-if="step === 2 && planMode === 'template'" class="wizard-step">
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

      <!-- ── Step 3: Transport (template mode) ── -->
      <div v-if="step === 3 && planMode === 'template'" class="wizard-step">
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

        <LiveOffers
          :tabs="['flights', 'buses']"
          :origin="trip?.origin"
          :destination="sel.destination?.city || sel.destination?.country"
          :date-from="trip?.start_date"
        />

        <div class="wizard-nav">
          <button class="btn btn-secondary" @click="step = 2">← Route</button>
          <button class="btn btn-gold" :disabled="!sel.transport" @click="step = 4">
            Next: Accommodation →
          </button>
        </div>
      </div>

      <!-- ── Step 4: Accommodation (template mode) ── -->
      <div v-if="step === 4 && planMode === 'template'" class="wizard-step">
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

        <LiveOffers
          :tabs="['hotels']"
          :destination="sel.destination?.city || sel.destination?.country"
          :date-from="trip?.start_date"
        />

        <div class="wizard-nav">
          <button class="btn btn-secondary" @click="step = 3">← Transport</button>
          <button class="btn btn-gold" :disabled="!sel.accommodation" @click="step = 5">
            Review & Save →
          </button>
        </div>
      </div>

      <!-- ── Step 5: Review (template mode) ── -->
      <div v-if="step === 5 && planMode === 'template'" class="wizard-step">
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

      <!-- ════════════════ CUSTOM-MODE STEPS ════════════════ -->

      <!-- ── Custom Step 1: Route details ── -->
      <div v-if="step === 1 && planMode === 'custom'" class="wizard-step">
        <div v-if="trip?.destination" class="step-context">
          <span class="step-context-flag">📍</span>
          <strong>{{ trip.destination }}</strong>
        </div>
        <h3 class="step-heading">Describe your route</h3>
        <p class="step-hint">Outline your itinerary — how long, where you'll go, what makes it special.</p>

        <div class="custom-form">
          <div class="cf-row">
            <label>Route name *</label>
            <input v-model="custom.route_name" type="text" placeholder='e.g. "Norwegian Fjords Loop"' />
          </div>
          <div class="cf-row">
            <label>Short description</label>
            <textarea v-model="custom.route_description" rows="2"
              placeholder="A line or two about the journey." />
          </div>
          <div class="cf-row">
            <label>Duration (days) *</label>
            <input v-model.number="custom.duration_days" type="number" min="1" max="365" placeholder="7" />
          </div>
          <div class="cf-row">
            <label>Highlights</label>
            <input v-model="custom.highlights" type="text"
              placeholder="Comma-separated, e.g. Bergen, Geirangerfjord, Trollstigen" />
            <span class="cf-hint">Comma-separated list of stops or experiences.</span>
          </div>
        </div>

        <p v-if="!customRouteValid" class="validation-hint">
          Add a <strong>route name</strong> and <strong>duration</strong> to continue.
        </p>
        <div class="wizard-nav">
          <span></span>
          <button class="btn btn-gold" :disabled="!customRouteValid" @click="step = 2">
            Next: Transport →
          </button>
        </div>
      </div>

      <!-- ── Custom Step 2: Transport ── -->
      <div v-if="step === 2 && planMode === 'custom'" class="wizard-step">
        <div class="step-context">
          <span class="step-context-flag">📍</span>
          <strong>{{ custom.route_name }}</strong>
          <span class="step-context-sep">·</span>
          <span>{{ custom.duration_days }} days</span>
        </div>
        <h3 class="step-heading">How are you getting there?</h3>
        <p class="step-hint">Pick a transport type and add the details you have.</p>

        <div class="custom-type-row">
          <button
            v-for="t in TRANSPORT_TYPES" :key="t"
            class="type-pill" :class="{ 'type-pill--active': custom.transport_type === t }"
            @click="custom.transport_type = t"
          >
            {{ transportIcon(t) }} {{ t }}
          </button>
        </div>

        <LiveOffers
          selectable
          :tabs="['flights', 'buses', 'hotels']"
          :default-tab="custom.transport_type === 'bus' ? 'buses' : 'flights'"
          :origin="trip?.origin"
          :destination="trip?.destination"
          :date-from="trip?.start_date"
          @select="onTransportPanelSelect"
        />

        <div class="custom-form">
          <div class="cf-row">
            <label>Provider / carrier</label>
            <input v-model="custom.transport_provider" type="text"
              placeholder='e.g. "Lufthansa", "Eurostar", "Self-drive"' />
          </div>
          <div class="cf-row cf-row--split">
            <div>
              <label>Duration</label>
              <input v-model="custom.transport_duration" type="text" placeholder="e.g. 2h 30m" />
            </div>
            <div>
              <label>Price from (€)</label>
              <input v-model.number="custom.transport_price_from" type="number" min="0" placeholder="120" />
            </div>
          </div>
          <div class="cf-row">
            <label>Notes</label>
            <textarea v-model="custom.transport_notes" rows="2"
              placeholder="Booking ref, departure, anything to remember." />
          </div>
        </div>

        <p v-if="!customTransportValid" class="validation-hint">
          Pick a <strong>transport type</strong> above to continue.
        </p>
        <div class="wizard-nav">
          <button class="btn btn-secondary" @click="step = 1">← Route</button>
          <button class="btn btn-gold" :disabled="!customTransportValid" @click="step = 3">
            Next: Accommodation →
          </button>
        </div>
      </div>

      <!-- ── Custom Step 3: Accommodation ── -->
      <div v-if="step === 3 && planMode === 'custom'" class="wizard-step">
        <div class="step-context">
          <span class="step-context-flag">📍</span>
          <strong>{{ custom.route_name }}</strong>
          <span class="step-context-sep">·</span>
          <span>{{ transportIcon(custom.transport_type) }} {{ custom.transport_type }}</span>
        </div>
        <h3 class="step-heading">Where will you stay?</h3>
        <p class="step-hint">Hotel, hostel, apartment — describe your accommodation.</p>

        <div class="custom-type-row">
          <button
            v-for="t in ACCOMMODATION_TYPES" :key="t"
            class="type-pill" :class="{ 'type-pill--active': custom.accommodation_type === t }"
            @click="custom.accommodation_type = t"
          >
            {{ accommodationIcon(t) }} {{ t }}
          </button>
        </div>

        <LiveOffers
          selectable
          :tabs="['flights', 'buses', 'hotels']"
          default-tab="hotels"
          :origin="trip?.origin"
          :destination="trip?.destination"
          :date-from="trip?.start_date"
          @select="onAccommodationPanelSelect"
        />

        <div class="custom-form">
          <div class="cf-row">
            <label>Name *</label>
            <input ref="accommodationNameInput" v-model="custom.accommodation_name" type="text"
              autocomplete="off"
              placeholder='Search a real hotel/stay — e.g. "Hotel Bristol"' />
          </div>
          <div class="cf-row cf-row--split">
            <div>
              <label>Price per night (€)</label>
              <input v-model.number="custom.accommodation_price_per_night" type="number" min="0" placeholder="95" />
            </div>
            <div>
              <label>Rating (1-5)</label>
              <select v-model="custom.accommodation_rating">
                <option value="">—</option>
                <option v-for="n in 5" :key="n" :value="n">{{ '★'.repeat(n) }} {{ n }}</option>
              </select>
            </div>
          </div>
          <div class="cf-row">
            <label>Notes</label>
            <textarea v-model="custom.accommodation_notes" rows="2"
              placeholder="Address, check-in time, breakfast included…" />
          </div>
        </div>

        <p v-if="!customAccomValid" class="validation-hint">
          Pick an <strong>accommodation type</strong> and enter a <strong>name</strong> to continue.
        </p>
        <div class="wizard-nav">
          <button class="btn btn-secondary" @click="step = 2">← Transport</button>
          <button class="btn btn-gold" :disabled="!customAccomValid" @click="step = 4">
            Review & Save →
          </button>
        </div>
      </div>

      <!-- ── Custom Step 4: Review ── -->
      <div v-if="step === 4 && planMode === 'custom'" class="wizard-step">
        <h3 class="step-heading">Review your travel plan</h3>
        <p class="step-hint">Everything looks right? Add any personal notes and save.</p>

        <div class="review-card">
          <div class="review-section review-trip">
            <span class="review-label">Trip</span>
            <div class="review-value review-trip-title">{{ trip?.title }}</div>
            <div class="review-meta">
              <span class="badge badge-dest">📍 {{ trip?.destination }}</span>
              <span class="badge badge-date">📅 {{ trip?.start_date }}</span>
            </div>
          </div>

          <div class="review-divider"></div>

          <div class="review-grid">
            <div class="review-section">
              <span class="review-label">Route</span>
              <div class="review-value">{{ custom.route_name }}</div>
              <div class="review-sub">{{ custom.duration_days }} days</div>
            </div>
            <div class="review-section">
              <span class="review-label">Description</span>
              <div class="review-sub">{{ custom.route_description || '—' }}</div>
            </div>
          </div>

          <div class="review-divider"></div>

          <div class="review-grid">
            <div class="review-section">
              <span class="review-label">Transport</span>
              <div class="review-value">
                {{ transportIcon(custom.transport_type) }} {{ custom.transport_provider || custom.transport_type }}
              </div>
              <div class="review-sub">
                {{ custom.transport_duration || '—' }}
                <template v-if="custom.transport_price_from"> · From €{{ custom.transport_price_from }}</template>
              </div>
            </div>
            <div class="review-section">
              <span class="review-label">Accommodation</span>
              <div class="review-value">
                {{ accommodationIcon(custom.accommodation_type) }} {{ custom.accommodation_name }}
              </div>
              <div class="review-sub">
                <template v-if="custom.accommodation_price_per_night">€{{ custom.accommodation_price_per_night }}/night</template>
                <template v-if="custom.accommodation_rating"> · {{ starRating(custom.accommodation_rating) }} {{ custom.accommodation_rating }}</template>
              </div>
            </div>
          </div>

          <div v-if="custom.highlights" class="review-divider"></div>
          <div v-if="custom.highlights" class="review-section">
            <span class="review-label">Highlights</span>
            <div class="review-highlights">
              <span v-for="h in custom.highlights.split(',')" :key="h" class="highlight-tag">
                {{ h.trim() }}
              </span>
            </div>
          </div>

          <div class="review-divider"></div>

          <div class="review-section">
            <label class="review-label" for="plan-notes-custom">
              Personal Notes
              <span class="char-count">{{ notes.length }}/1000</span>
            </label>
            <textarea
              id="plan-notes-custom"
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
          <button class="btn btn-secondary" @click="step = 3">← Accommodation</button>
          <button class="btn btn-gold" :disabled="saving" @click="savePlan">
            {{ saving ? 'Saving…' : existingPlan ? '✓ Update Plan' : '✓ Save Travel Plan' }}
          </button>
        </div>
      </div>

      </div><!-- /.wizard-steps -->

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
    await waitAuthReady()
    trip.value = await apiFetch(`/api/trips/${tripId}`)
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
// Two plan modes share this page:
//   - 'template': pick from seeded globe destinations → routes → options
//   - 'custom':   user fills route/transport/accommodation free-form
const planMode = ref(route.query.mode === 'custom' ? 'custom' : 'template')

const STEPS_TEMPLATE = ['Destination', 'Route', 'Transport', 'Accommodation', 'Review']
const STEPS_CUSTOM   = ['Route', 'Transport', 'Accommodation', 'Review']
const STEPS = computed(() => planMode.value === 'custom' ? STEPS_CUSTOM : STEPS_TEMPLATE)

const step     = ref(1)
const viewMode = ref('globe')   // 'globe' | 'grid' — template mode only
const notes    = ref('')
const saving       = ref(false)
const saveError    = ref('')
const savedConfirm = ref(false)

// Slide direction for the step transition: forward when advancing, back when
// returning. Drives the .dir-fwd / .dir-back classes on the steps wrapper.
const direction = ref('fwd')

// Each step can be a very different height (the LiveOffers panel is tall), so
// jump back to the top on every change — the user always lands on the new
// step's heading instead of somewhere mid-page. Honours reduced-motion.
watch(step, (to, from) => {
  direction.value = to >= from ? 'fwd' : 'back'
  if (!import.meta.client) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
})

// Template-mode selections
const sel = reactive({
  destination:   null,
  route:         null,
  transport:     null,
  accommodation: null,
})

// Custom-mode free-form fields
const custom = reactive({
  route_name: '',
  route_description: '',
  duration_days: '',
  highlights: '',
  transport_type: '',
  transport_provider: '',
  transport_duration: '',
  transport_price_from: '',
  transport_notes: '',
  accommodation_type: '',
  accommodation_name: '',
  accommodation_price_per_night: '',
  accommodation_rating: '',
  accommodation_notes: '',
})

// Places autocomplete on the custom accommodation name → pick a real stay.
const accommodationNameInput = ref(null)
usePlacesAutocomplete(accommodationNameInput, {
  types: ['establishment'],
  onSelect: ({ name }) => { custom.accommodation_name = name },
})

// ── Draft autosave (custom mode) ──────────────────────────────────────────────
// Persist the in-progress custom plan to localStorage so a reload / accidental
// navigation doesn't lose work. Cleared once the plan is saved.
const DRAFT_KEY = `tm:plan-draft:${tripId}`
const draftRestored = ref(false)

onMounted(() => {
  if (planMode.value !== 'custom' || !import.meta.client) return
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const d = JSON.parse(raw)
    if (d.custom) Object.assign(custom, d.custom)
    if (d.notes) notes.value = d.notes
    if (d.step) step.value = d.step
    draftRestored.value = true
  } catch { /* corrupt draft — ignore */ }
})

watch([custom, notes, step], () => {
  if (planMode.value !== 'custom' || !import.meta.client) return
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ custom, notes: notes.value, step: step.value }))
}, { deep: true })

function discardDraft() {
  if (import.meta.client) localStorage.removeItem(DRAFT_KEY)
  Object.keys(custom).forEach(k => { custom[k] = '' })
  notes.value = ''
  step.value = 1
  draftRestored.value = false
}

const TRANSPORT_TYPES     = ['flight', 'train', 'bus', 'car', 'ferry']
const ACCOMMODATION_TYPES = ['hotel', 'hostel', 'apartment', 'guesthouse', 'camping']

// ── Destinations ─────────────────────────────────────────────────────────────
const destinations  = ref([])
const loadingDest   = ref(true)

onMounted(async () => {
  // Custom plans skip the globe — no need to load template destinations.
  if (planMode.value === 'custom') {
    loadingDest.value = false
    return
  }

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
    await waitAuthReady()
    const plan = await apiFetch(`/api/travel-plans/${tripId}`)
    existingPlan.value = plan
    notes.value = plan.notes ?? ''
    if (plan.mode === 'custom') {
      planMode.value = 'custom'
      custom.route_name                    = plan.custom_route_name                    ?? ''
      custom.route_description             = plan.custom_route_description             ?? ''
      custom.duration_days                 = plan.custom_duration_days                 ?? ''
      custom.highlights                    = plan.custom_highlights                    ?? ''
      custom.transport_type                = plan.custom_transport_type                ?? ''
      custom.transport_provider            = plan.custom_transport_provider            ?? ''
      custom.transport_duration            = plan.custom_transport_duration            ?? ''
      custom.transport_price_from          = plan.custom_transport_price_from          ?? ''
      custom.transport_notes               = plan.custom_transport_notes               ?? ''
      custom.accommodation_type            = plan.custom_accommodation_type            ?? ''
      custom.accommodation_name            = plan.custom_accommodation_name            ?? ''
      custom.accommodation_price_per_night = plan.custom_accommodation_price_per_night ?? ''
      custom.accommodation_rating          = plan.custom_accommodation_rating          ?? ''
      custom.accommodation_notes           = plan.custom_accommodation_notes           ?? ''
    } else {
      // Template plan — pre-load the destination and fetch its routes so we can restore selections
      const dest = destinations.value.find(d => d.id === plan.destination_id)
      if (dest) {
        await selectAndLoadDestination(dest, plan)
      }
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
  if (planMode.value === 'template') {
    if (n === 2 && sel.destination)   step.value = 2
    if (n === 3 && sel.route)         step.value = 3
    if (n === 4 && sel.transport)     step.value = 4
    if (n === 5 && sel.accommodation) step.value = 5
  } else {
    if (n === 2 && custom.route_name)         step.value = 2
    if (n === 3 && custom.transport_type)     step.value = 3
    if (n === 4 && custom.accommodation_name) step.value = 4
  }
}

// ── Custom-step validation flags ─────────────────────────────────────────────
const customRouteValid = computed(() => !!custom.route_name.trim() && !!custom.duration_days)
const customTransportValid = computed(() => !!custom.transport_type)
const customAccomValid = computed(() => !!custom.accommodation_type && !!custom.accommodation_name.trim())

// ── LiveOffers @select handlers — auto-fill custom-mode fields ──────────────
function priceToNumber(p) {
  if (p == null) return ''
  if (typeof p === 'number') return p
  const match = String(p).replace(/,/g, '').match(/[\d.]+/)
  return match ? Number(match[0]) : ''
}

function fillCustomTransport({ kind, offer }) {
  custom.transport_type       = kind === 'flights' ? 'flight' : 'bus'
  custom.transport_provider   = offer.airline || offer.provider || ''
  custom.transport_duration   = offer.duration || ''
  custom.transport_price_from = priceToNumber(offer.price)
  custom.transport_notes      = offer.bookingLink
    ? `Booked via: ${offer.bookingLink}`
    : custom.transport_notes
}

function fillCustomAccommodation({ offer }) {
  custom.accommodation_name            = offer.name || ''
  custom.accommodation_price_per_night = priceToNumber(offer.price)
  custom.accommodation_rating          = offer.rating ? Number(offer.rating) : ''
  custom.accommodation_notes           = offer.bookingLink
    ? `Booked via: ${offer.bookingLink}`
    : custom.accommodation_notes
  if (!custom.accommodation_type) custom.accommodation_type = 'hotel'
}

// Either custom-mode panel renders all three tabs now, so route the select
// event to the right filler based on the tab the offer came from.
function onTransportPanelSelect(evt) {
  if (evt.kind === 'hotels') fillCustomAccommodation(evt)
  else                       fillCustomTransport(evt)
}
function onAccommodationPanelSelect(evt) {
  if (evt.kind === 'hotels') fillCustomAccommodation(evt)
  else                       fillCustomTransport(evt)
}

// ── Save ─────────────────────────────────────────────────────────────────────
async function savePlan() {
  saveError.value = ''
  saving.value    = true
  try {
    if (planMode.value === 'custom') {
      await apiFetch(`/api/travel-plans/${tripId}`, {
        method: 'POST',
        body: {
          mode: 'custom',
          custom_destination:                   trip.value?.destination ?? '',
          custom_route_name:                    custom.route_name,
          custom_route_description:             custom.route_description,
          custom_duration_days:                 custom.duration_days,
          custom_highlights:                    custom.highlights,
          custom_transport_type:                custom.transport_type,
          custom_transport_provider:            custom.transport_provider,
          custom_transport_duration:            custom.transport_duration,
          custom_transport_price_from:          custom.transport_price_from,
          custom_transport_notes:               custom.transport_notes,
          custom_accommodation_type:            custom.accommodation_type,
          custom_accommodation_name:            custom.accommodation_name,
          custom_accommodation_price_per_night: custom.accommodation_price_per_night,
          custom_accommodation_rating:          custom.accommodation_rating,
          custom_accommodation_notes:           custom.accommodation_notes,
          notes:                                notes.value,
        },
      })
    } else {
      await apiFetch(`/api/travel-plans/${tripId}`, {
        method: 'POST',
        body: {
          mode: 'template',
          destination_id:          sel.destination.id,
          route_id:                sel.route.id,
          transport_option_id:     sel.transport.id,
          accommodation_option_id: sel.accommodation.id,
          notes:                   notes.value,
        },
      })
    }
    savedConfirm.value = true
    step.value = 99  // hide wizard
    if (import.meta.client) localStorage.removeItem(DRAFT_KEY)  // draft consumed
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
/* Each step is its own v-if block, so a step change unmounts the old and mounts
   a fresh .wizard-step → the entrance animation replays. Direction comes from
   the .dir-fwd / .dir-back class the wrapper carries (set in script). */
.dir-fwd  .wizard-step { animation: stepInFwd 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.dir-back .wizard-step { animation: stepInBack 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
@keyframes stepInFwd {
  from { opacity: 0; transform: translateX(26px); }
  to   { opacity: 1; transform: none; }
}
@keyframes stepInBack {
  from { opacity: 0; transform: translateX(-26px); }
  to   { opacity: 1; transform: none; }
}

/* Draft restored banner */
.draft-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(201,168,76,0.1);
  border: 1px solid rgba(201,168,76,0.3);
  color: var(--navy);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.85rem;
  margin-bottom: 16px;
}
.draft-discard {
  background: none;
  border: none;
  color: var(--text-muted);
  font-family: inherit;
  font-size: 0.82rem;
  text-decoration: underline;
  cursor: pointer;
  margin-left: auto;
}
.draft-discard:hover { color: var(--error); }

/* Inline validation hint — tells the user why "Next" is disabled */
.validation-hint {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-top: 20px;
  text-align: right;
}
.validation-hint strong { color: var(--navy); }
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

/* ── Custom-mode form ── */
.custom-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-bottom: 28px;
}
.cf-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cf-row--split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.cf-row--split > div {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cf-row label,
.cf-row--split label {
  font-weight: 600;
  font-size: 0.78rem;
  color: var(--navy);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.cf-row input,
.cf-row textarea,
.cf-row--split input,
.cf-row--split select {
  width: 100%;
  padding: 11px 14px;
  border: 2px solid var(--sand-dark);
  border-radius: 10px;
  font-size: 0.92rem;
  font-family: inherit;
  background: var(--sand);
  color: var(--text);
  transition: border-color 0.2s, background 0.2s;
  resize: vertical;
}
.cf-row input:focus,
.cf-row textarea:focus,
.cf-row--split input:focus,
.cf-row--split select:focus {
  outline: none;
  border-color: var(--gold);
  background: var(--white);
}
.cf-hint {
  font-size: 0.74rem;
  color: var(--text-muted);
}

.custom-type-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 22px;
}
.type-pill {
  background: var(--sand);
  border: 2px solid transparent;
  border-radius: 100px;
  padding: 9px 18px;
  font-size: 0.88rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--navy);
  cursor: pointer;
  text-transform: capitalize;
  transition: all 0.2s;
}
.type-pill:hover {
  border-color: var(--gold);
  background: rgba(201,168,76,0.08);
}
.type-pill:active { transform: scale(0.95); }
.type-pill--active {
  border-color: var(--gold);
  background: var(--gold);
  color: var(--navy);
  animation: pillPop 0.22s ease;
}
@keyframes pillPop {
  0% { transform: scale(0.92); }
  60% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* ── Save confirmation — reward moment ── */
.saved-confirm { animation: confirmIn 0.45s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.confirm-icon  { animation: confirmPop 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 0.12s backwards; }
@keyframes confirmIn {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to   { opacity: 1; transform: none; }
}
@keyframes confirmPop {
  0% { transform: scale(0); }
  60% { transform: scale(1.18); }
  100% { transform: scale(1); }
}

/* Respect users who prefer no motion: keep the layout, drop the movement. */
@media (prefers-reduced-motion: reduce) {
  .dir-fwd .wizard-step,
  .dir-back .wizard-step,
  .saved-confirm,
  .confirm-icon,
  .type-pill--active { animation: none; }
  .progress-fill { transition: none; }
}

@media (max-width: 640px) {
  .cf-row--split { grid-template-columns: 1fr; }
}
</style>
