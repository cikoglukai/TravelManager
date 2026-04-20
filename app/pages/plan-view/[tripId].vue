<template>
  <div class="page-wrapper pv-page">

    <!-- ── Top action bar (hidden when printing) ── -->
    <div class="pv-topbar no-print">
      <NuxtLink :to="`/trips/${tripId}`" class="btn btn-back">← Back to Trip</NuxtLink>
      <div class="pv-topbar-actions">
        <NuxtLink :to="`/plan/${tripId}`" class="btn btn-outline">✏ Edit Plan</NuxtLink>
        <button class="btn btn-secondary" @click="printPlan">🖨 Print</button>
      </div>
    </div>

    <!-- ── Loading ── -->
    <div v-if="pending" class="loading">Loading travel plan…</div>

    <!-- ── No plan yet ── -->
    <div v-else-if="!plan" class="empty-state">
      <p style="margin-bottom:16px">No travel plan created for this trip yet.</p>
      <NuxtLink :to="`/plan/${tripId}`" class="btn btn-gold">Create Travel Plan</NuxtLink>
    </div>

    <!-- ── Plan document ── -->
    <div v-else class="pv-document">

      <!-- ── Document header ── -->
      <div class="pv-doc-header">
        <div class="pv-doc-header-bg"></div>
        <div class="pv-doc-header-content">
          <div class="pv-doc-label">Travel Plan</div>
          <h1 class="pv-trip-title">{{ trip?.title }}</h1>
          <div class="pv-trip-meta">
            <span class="badge badge-dest">📍 {{ trip?.destination }}</span>
            <span class="badge badge-date">📅 {{ formatDate(trip?.start_date) }}</span>
          </div>
          <div class="pv-complete-badge">✓ Plan Complete</div>
        </div>
        <div class="pv-doc-deco">{{ plan.emoji }}</div>
      </div>

      <!-- ── Destination ── -->
      <div class="pv-section">
        <div class="pv-section-label">Destination</div>
        <div class="pv-dest-card">
          <div class="pv-dest-flag">{{ plan.emoji }}</div>
          <div class="pv-dest-info">
            <div class="pv-dest-country">{{ plan.country }}</div>
            <div class="pv-dest-city">{{ plan.city }}</div>
            <p class="pv-dest-desc">{{ plan.destination_description }}</p>
          </div>
        </div>
      </div>

      <!-- ── Route ── -->
      <div class="pv-section">
        <div class="pv-section-label">Selected Route</div>
        <div class="pv-route-card">
          <div class="pv-route-header">
            <div>
              <div class="pv-route-name">{{ plan.route_name }}</div>
              <p class="pv-route-desc">{{ plan.route_description }}</p>
            </div>
            <div class="pv-route-duration">
              <span class="pv-duration-number">{{ plan.duration_days }}</span>
              <span class="pv-duration-label">days</span>
            </div>
          </div>
          <div class="pv-highlights-label">Highlights</div>
          <div class="pv-highlights">
            <span v-for="h in highlightsList" :key="h" class="pv-highlight">
              <span class="pv-highlight-dot">✦</span> {{ h }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Transport + Accommodation side by side ── -->
      <div class="pv-section pv-two-col">

        <!-- Transport -->
        <div class="pv-info-card pv-transport-card">
          <div class="pv-section-label">Getting There</div>
          <div class="pv-info-icon">{{ transportIcon(plan.transport_type) }}</div>
          <div class="pv-type-pill" :class="`tc-${plan.transport_type}`">
            {{ plan.transport_type }}
          </div>
          <div class="pv-info-name">{{ plan.provider }}</div>
          <div class="pv-info-divider"></div>
          <div class="pv-info-details">
            <div class="pv-info-detail-item">
              <span class="pv-detail-icon">🕐</span>
              <div>
                <div class="pv-detail-label">Duration</div>
                <div class="pv-detail-value">{{ plan.transport_duration }}</div>
              </div>
            </div>
            <div class="pv-info-detail-item">
              <span class="pv-detail-icon">💶</span>
              <div>
                <div class="pv-detail-label">Price from</div>
                <div class="pv-detail-value">€{{ plan.price_from }}</div>
              </div>
            </div>
          </div>
          <div v-if="plan.transport_notes" class="pv-info-divider"></div>
          <p v-if="plan.transport_notes" class="pv-info-notes">{{ plan.transport_notes }}</p>
        </div>

        <!-- Accommodation -->
        <div class="pv-info-card pv-accom-card">
          <div class="pv-section-label">Where to Stay</div>
          <div class="pv-info-icon">{{ accommodationIcon(plan.accommodation_type) }}</div>
          <div class="pv-type-pill" :class="`ac-${plan.accommodation_type}`">
            {{ plan.accommodation_type }}
          </div>
          <div class="pv-info-name">{{ plan.accommodation_name }}</div>
          <div class="pv-info-divider"></div>
          <div class="pv-info-details">
            <div class="pv-info-detail-item">
              <span class="pv-detail-icon">💶</span>
              <div>
                <div class="pv-detail-label">Per night</div>
                <div class="pv-detail-value">€{{ plan.price_per_night }}</div>
              </div>
            </div>
            <div class="pv-info-detail-item">
              <span class="pv-detail-icon">⭐</span>
              <div>
                <div class="pv-detail-label">Rating</div>
                <div class="pv-detail-value">{{ starRating(plan.rating) }} <span class="pv-rating-num">{{ plan.rating }}</span></div>
              </div>
            </div>
          </div>
          <div v-if="plan.accommodation_notes" class="pv-info-divider"></div>
          <p v-if="plan.accommodation_notes" class="pv-info-notes">{{ plan.accommodation_notes }}</p>
        </div>

      </div><!-- /.pv-two-col -->

      <!-- ── Trip description ── -->
      <div v-if="trip?.short_description" class="pv-section">
        <div class="pv-section-label">Trip Summary</div>
        <div class="pv-prose-card">
          <p class="pv-prose">{{ trip.short_description }}</p>
          <p v-if="trip.detail_description" class="pv-prose" style="margin-top:12px">
            {{ trip.detail_description }}
          </p>
        </div>
      </div>

      <!-- ── Personal notes ── -->
      <div v-if="plan.notes" class="pv-section">
        <div class="pv-section-label">My Notes</div>
        <div class="pv-prose-card pv-notes-card">
          <p class="pv-prose">{{ plan.notes }}</p>
        </div>
      </div>

      <!-- ── Cost summary ── -->
      <div class="pv-section">
        <div class="pv-section-label">Cost Summary</div>
        <div class="pv-cost-row">
          <div class="pv-cost-item">
            <span class="pv-cost-label">Transport (from)</span>
            <span class="pv-cost-value">€{{ plan.price_from }}</span>
          </div>
          <div class="pv-cost-sep">+</div>
          <div class="pv-cost-item">
            <span class="pv-cost-label">Accommodation / night</span>
            <span class="pv-cost-value">€{{ plan.price_per_night }}</span>
          </div>
          <div class="pv-cost-sep">×</div>
          <div class="pv-cost-item">
            <span class="pv-cost-label">Duration</span>
            <span class="pv-cost-value">{{ plan.duration_days }} nights</span>
          </div>
          <div class="pv-cost-sep">=</div>
          <div class="pv-cost-item pv-cost-total">
            <span class="pv-cost-label">Estimated total</span>
            <span class="pv-cost-value">€{{ estimatedTotal }}</span>
          </div>
        </div>
        <p class="pv-cost-disclaimer">* Estimate based on base prices. Actual costs may vary.</p>
      </div>

      <!-- ── Locations ── -->
      <div class="pv-section no-print-border">
        <LocationManager :trip-id="tripId" />
      </div>

      <!-- ── Document footer ── -->
      <div class="pv-doc-footer">
        <span>Last updated {{ formatDate(plan.updated_at) }}</span>
        <span class="pv-footer-brand">One Cloud Away</span>
      </div>

    </div><!-- /.pv-document -->
  </div>
</template>

<script setup>
const { user } = useAuth()
const route    = useRoute()
const tripId   = Number(route.params.tripId)

onMounted(() => { if (!user.value) navigateTo('/register') })

// ── Fetch trip + plan in parallel ────────────────────────────────────────────
const [{ data: tripData }, { data: planData, pending }] = await Promise.all([
  useFetch(() => `/api/trips/${tripId}`,          { key: `pv-trip-${tripId}` }),
  useFetch(() => `/api/travel-plans/${tripId}`,   { key: `pv-plan-${tripId}` }),
])

const trip = computed(() => tripData.value)
const plan = computed(() => planData.value?.country ? planData.value : null)

// ── Derived data ─────────────────────────────────────────────────────────────
const highlightsList = computed(() =>
  (plan.value?.highlights ?? '')
    .split('·')
    .map(h => h.trim())
    .filter(Boolean)
)

const estimatedTotal = computed(() => {
  if (!plan.value) return 0
  return (plan.value.price_from + plan.value.price_per_night * plan.value.duration_days)
    .toLocaleString('de-AT')
})

// ── Icons ────────────────────────────────────────────────────────────────────
const TRANSPORT_ICONS    = { flight: '✈️', train: '🚂', bus: '🚌', car: '🚗', ferry: '⛴️' }
const ACCOMMODATION_ICONS = { hotel: '🏨', hostel: '🛏️', apartment: '🏠', guesthouse: '🏡', camping: '⛺' }

function transportIcon(t)     { return TRANSPORT_ICONS[t]     ?? '🚀' }
function accommodationIcon(t) { return ACCOMMODATION_ICONS[t] ?? '🏠' }

function starRating(r) {
  const full  = Math.round(Number(r))
  const empty = 5 - full
  return '★'.repeat(full) + '☆'.repeat(empty)
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function printPlan() {
  window.print()
}
</script>

<style scoped>
/* ── Page wrapper tweak for print ── */
.pv-page { max-width: 860px; }

/* ── Top bar ── */
.pv-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 12px;
}
.pv-topbar-actions { display: flex; gap: 10px; }

/* ── Document container ── */
.pv-document {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

/* ── Document header ── */
.pv-doc-header {
  position: relative;
  background: linear-gradient(135deg, var(--navy) 0%, #1a3260 60%, #0f2a55 100%);
  padding: 48px 48px 44px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}
.pv-doc-header-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 80% 50%, rgba(201,168,76,0.12) 0%, transparent 60%),
    url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23c9a84c' fill-opacity='0.04'%3E%3Cpath d='M20 20.5V18H0v5h5v5h5v-5h5v5h5v-5h5v5h5v-5h5v-4.5h-20z'/%3E%3C/g%3E%3C/svg%3E");
  pointer-events: none;
}
.pv-doc-header-content { position: relative; z-index: 1; }
.pv-doc-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--gold);
  font-weight: 700;
  margin-bottom: 10px;
}
.pv-trip-title {
  font-family: 'Playfair Display', serif;
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--white);
  line-height: 1.15;
  margin-bottom: 14px;
}
.pv-trip-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}
.pv-complete-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(201,168,76,0.15);
  border: 1px solid rgba(201,168,76,0.35);
  color: var(--gold);
  padding: 5px 14px;
  border-radius: 100px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.pv-doc-deco {
  font-size: 6rem;
  line-height: 1;
  opacity: 0.25;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  user-select: none;
}

/* ── Section wrapper ── */
.pv-section {
  padding: 36px 48px;
  border-bottom: 1px solid var(--sand-dark);
}
.pv-section:last-child { border-bottom: none; }
.pv-section-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--gold);
  font-weight: 700;
  margin-bottom: 20px;
}

/* ── Destination card ── */
.pv-dest-card {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}
.pv-dest-flag {
  font-size: 3.5rem;
  line-height: 1;
  flex-shrink: 0;
}
.pv-dest-info { flex: 1; }
.pv-dest-country {
  font-family: 'Playfair Display', serif;
  font-size: 1.7rem;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 4px;
  line-height: 1.1;
}
.pv-dest-city {
  color: var(--text-muted);
  font-size: 0.88rem;
  font-style: italic;
  margin-bottom: 12px;
}
.pv-dest-desc {
  color: #555;
  font-size: 0.9rem;
  line-height: 1.75;
}

/* ── Route card ── */
.pv-route-card {
  background: var(--sand);
  border-radius: var(--radius);
  padding: 28px 32px;
  border-left: 4px solid var(--gold);
}
.pv-route-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 16px;
}
.pv-route-name {
  font-family: 'Playfair Display', serif;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 8px;
}
.pv-route-desc {
  color: #555;
  font-size: 0.88rem;
  line-height: 1.7;
}
.pv-route-duration {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--navy);
  color: var(--white);
  border-radius: 10px;
  padding: 10px 18px;
  flex-shrink: 0;
  text-align: center;
}
.pv-duration-number {
  font-family: 'Playfair Display', serif;
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1;
}
.pv-duration-label {
  font-size: 0.72rem;
  opacity: 0.65;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.pv-highlights-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--gold);
  font-weight: 700;
  margin-bottom: 12px;
}
.pv-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pv-highlight {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--white);
  border: 1px solid rgba(201,168,76,0.3);
  color: var(--navy);
  padding: 5px 14px;
  border-radius: 100px;
  font-size: 0.8rem;
  font-weight: 500;
}
.pv-highlight-dot { color: var(--gold); font-size: 0.7rem; }

/* ── Two-column: transport + accommodation ── */
.pv-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}
.pv-info-card {
  background: var(--sand);
  border-radius: var(--radius);
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.pv-info-icon {
  font-size: 2.8rem;
  margin-bottom: 12px;
  line-height: 1;
}
.pv-type-pill {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 100px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
  align-self: flex-start;
}
.tc-flight   { background: #e8f4fd; color: #1a6fa0; }
.tc-train    { background: #e8f7e8; color: #1a7a3a; }
.tc-bus      { background: #fdf3e8; color: #8a5a1a; }
.tc-car      { background: #f0e8fd; color: #5a1a8a; }
.tc-ferry    { background: #e8f7fd; color: #1a6a7a; }
.ac-hotel    { background: #fdf3e8; color: #8a5a1a; }
.ac-hostel   { background: #e8f4fd; color: #1a6fa0; }
.ac-apartment { background: #e8fdf3; color: #1a7a4a; }
.ac-guesthouse { background: #f7e8fd; color: #6a1a8a; }
.ac-camping  { background: #f0fde8; color: #3a7a1a; }

.pv-info-name {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 4px;
  line-height: 1.2;
}
.pv-info-divider {
  height: 1px;
  background: rgba(15,31,61,0.08);
  margin: 16px 0;
}
.pv-info-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pv-info-detail-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.pv-detail-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 1px; }
.pv-detail-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  font-weight: 600;
  margin-bottom: 2px;
}
.pv-detail-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--navy);
}
.pv-rating-num {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 400;
}
.pv-info-notes {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.65;
}

/* ── Prose cards ── */
.pv-prose-card {
  background: var(--sand);
  border-radius: var(--radius);
  padding: 24px 28px;
}
.pv-notes-card {
  border-left: 4px solid var(--gold);
}
.pv-prose {
  color: #444;
  font-size: 0.93rem;
  line-height: 1.8;
  white-space: pre-wrap;
}

/* ── Cost summary ── */
.pv-cost-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  background: var(--sand);
  border-radius: var(--radius);
  padding: 24px 28px;
}
.pv-cost-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pv-cost-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  font-weight: 600;
}
.pv-cost-value {
  font-family: 'Playfair Display', serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--navy);
}
.pv-cost-sep {
  color: var(--text-muted);
  font-size: 1.2rem;
  font-weight: 300;
  flex-shrink: 0;
}
.pv-cost-total {
  margin-left: auto;
  padding-left: 20px;
  border-left: 2px solid var(--gold);
}
.pv-cost-total .pv-cost-value {
  color: var(--gold);
  font-size: 1.5rem;
}
.pv-cost-disclaimer {
  margin-top: 10px;
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* ── Document footer ── */
.pv-doc-footer {
  padding: 18px 48px;
  background: var(--navy);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.78rem;
  color: rgba(255,255,255,0.35);
}
.pv-footer-brand {
  font-family: 'Playfair Display', serif;
  color: var(--gold);
  opacity: 0.7;
  font-size: 0.82rem;
}

/* ── Print styles ── */
@media print {
  .no-print { display: none !important; }

  body { background: white !important; }

  .page-wrapper { padding: 0 !important; max-width: none !important; }

  .pv-document {
    box-shadow: none !important;
    border-radius: 0 !important;
  }
  .pv-doc-header { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  .pv-doc-header-bg { print-color-adjust: exact; -webkit-print-color-adjust: exact; }

  .pv-section { break-inside: avoid; }
  .pv-two-col { break-inside: avoid; }
}

/* ── Responsive ── */
@media (max-width: 700px) {
  .pv-doc-header { padding: 32px 24px; }
  .pv-doc-deco   { display: none; }
  .pv-trip-title { font-size: 1.6rem; }
  .pv-section    { padding: 28px 20px; }
  .pv-two-col    { grid-template-columns: 1fr; }
  .pv-cost-row   { flex-direction: column; align-items: flex-start; gap: 12px; }
  .pv-cost-total { margin-left: 0; padding-left: 0; border-left: none; padding-top: 12px; border-top: 2px solid var(--gold); }
  .pv-doc-footer { padding: 16px 20px; flex-direction: column; gap: 6px; text-align: center; }
  .pv-route-header { flex-direction: column-reverse; }
  .pv-route-duration { align-self: flex-start; flex-direction: row; gap: 8px; padding: 7px 16px; }
}
</style>
