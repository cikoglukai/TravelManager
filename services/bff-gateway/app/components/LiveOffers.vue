<template>
  <div class="live-offers">
    <div class="lo-header">
      <h4 class="lo-title">Live Offers</h4>
      <p v-if="contextHint" class="lo-context">{{ contextHint }}</p>
    </div>

    <!-- Tab bar -->
    <div class="lo-tabs">
      <button
        v-for="t in visibleTabs"
        :key="t"
        class="lo-tab"
        :class="{ 'lo-tab--active': activeTab === t }"
        @click="activate(t)"
      >
        {{ TAB_LABELS[t] }}
      </button>
    </div>

    <!-- Inline search controls — user can override origin/dates per tab -->
    <div v-if="activeTab" class="lo-controls">
      <label v-if="needsOrigin(activeTab)" class="lo-field">
        <span>Origin city</span>
        <input v-model="form.origin" type="text" placeholder="e.g. Stuttgart" />
      </label>
      <label class="lo-field">
        <span>Destination</span>
        <input v-model="form.destination" type="text" placeholder="e.g. Oslo" />
      </label>
      <label class="lo-field">
        <span>{{ activeTab === 'hotels' ? 'Check-in' : 'Departure' }}</span>
        <input v-model="form.dateFrom" type="date" />
      </label>
      <label v-if="activeTab === 'hotels'" class="lo-field">
        <span>Check-out</span>
        <input v-model="form.dateTo" type="date" />
      </label>
      <button class="btn btn-gold btn-sm lo-search-btn" :disabled="!canSearch" @click="manualSearch">
        🔍 Search
      </button>
    </div>

    <!-- Active tab body -->
    <div class="lo-body">
      <template v-if="!activeTab">
        <p class="lo-empty">No tabs configured.</p>
      </template>

      <template v-else>
        <div v-if="state(activeTab).pending.value" class="lo-loading">
          Loading {{ TAB_LABELS[activeTab].toLowerCase() }}…
        </div>

        <div v-else-if="state(activeTab).error.value" class="lo-error">
          {{ state(activeTab).error.value }}
        </div>

        <div v-else-if="state(activeTab).results.value.length === 0 && state(activeTab).hasRun.value" class="lo-empty">
          No live {{ TAB_LABELS[activeTab].toLowerCase() }} matched. Try adjusting the cities or date.
        </div>

        <div v-else class="lo-list">
          <!-- Flights / Buses (same shape) -->
          <template v-if="activeTab === 'flights' || activeTab === 'buses'">
            <div v-for="o in state(activeTab).results.value" :key="o.id" class="lo-card">
              <div class="lo-card-icon">{{ activeTab === 'flights' ? '✈️' : '🚌' }}</div>
              <div class="lo-card-body">
                <div class="lo-card-title">{{ o.airline || o.provider }}</div>
                <div class="lo-card-meta">
                  <span v-if="o.departure">🕐 {{ formatTimeOrIso(o.departure) }} → {{ formatTimeOrIso(o.arrival) }}</span>
                  <span v-if="o.duration">· {{ o.duration }}</span>
                </div>
                <div class="lo-card-price">{{ o.price }}</div>
              </div>
              <div class="lo-card-actions">
                <a v-if="o.bookingLink" :href="o.bookingLink" target="_blank" rel="noopener" class="lo-link">Book ↗</a>
                <button v-if="selectable" class="btn btn-gold btn-sm" @click="$emit('select', { kind: activeTab, offer: o })">
                  Use this
                </button>
              </div>
            </div>
          </template>

          <!-- Hotels -->
          <template v-else-if="activeTab === 'hotels'">
            <div v-for="o in state(activeTab).results.value" :key="o.id" class="lo-card">
              <div class="lo-card-icon lo-card-icon--photo">
                <img v-if="o.photo" :src="o.photo" :alt="o.name" />
                <span v-else>🏨</span>
              </div>
              <div class="lo-card-body">
                <div class="lo-card-title">{{ o.name }}</div>
                <div class="lo-card-meta">
                  <span v-if="o.rating">★ {{ Number(o.rating).toFixed(1) }}</span>
                  <span v-if="o.address">· {{ o.address }}</span>
                </div>
                <div class="lo-card-price">
                  <template v-if="o.price">{{ o.currency || '€' }} {{ Math.round(o.price) }}</template>
                  <template v-else>Price on request</template>
                </div>
              </div>
              <div class="lo-card-actions">
                <a v-if="o.bookingLink" :href="o.bookingLink" target="_blank" rel="noopener" class="lo-link">Book ↗</a>
                <button v-if="selectable" class="btn btn-gold btn-sm" @click="$emit('select', { kind: 'hotels', offer: o })">
                  Use this
                </button>
              </div>
            </div>
          </template>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  destination: { type: String, default: '' },
  origin:      { type: String, default: '' },
  dateFrom:    { type: String, default: '' },
  dateTo:      { type: String, default: '' },
  tabs:        { type: Array,  default: () => ['flights', 'buses', 'hotels'] },
  defaultTab:  { type: String, default: '' },
  selectable:  { type: Boolean, default: false },
})
defineEmits(['select'])

const TAB_LABELS = { flights: 'Flights', buses: 'Buses', hotels: 'Hotels' }

const visibleTabs = computed(() => props.tabs.filter(t => t in TAB_LABELS))
const activeTab   = ref(props.defaultTab && visibleTabs.value.includes(props.defaultTab)
  ? props.defaultTab
  : visibleTabs.value[0] ?? '')

const flights = useLiveSearch('flights')
const buses   = useLiveSearch('buses')
const hotels  = useLiveSearch('hotels')

function state(t) {
  if (t === 'flights') return flights
  if (t === 'buses')   return buses
  return hotels
}

function needsOrigin(t) {
  return t === 'flights' || t === 'buses'
}

// Local form state — seeded from props so trip pages get sane defaults, but
// user-editable so /explore (no trip context) and any out-of-date trip can
// still produce a useful search.
const today      = new Date().toISOString().slice(0, 10)
const todayPlus5 = (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10) })()

const form = reactive({
  origin:      props.origin      || '',
  destination: props.destination || '',
  dateFrom:    dateToISO(props.dateFrom) || today,
  dateTo:      dateToISO(props.dateTo)   || todayPlus5,
})

// Re-seed form when props change (e.g. trip data loads after mount).
watch(
  () => [props.origin, props.destination, props.dateFrom, props.dateTo],
  ([o, d, f, t]) => {
    if (o) form.origin = o
    if (d) form.destination = d
    if (f) form.dateFrom = dateToISO(f) || form.dateFrom
    if (t) form.dateTo   = dateToISO(t) || form.dateTo
  }
)

const canSearch = computed(() => {
  if (!form.destination) return false
  if (needsOrigin(activeTab.value) && !form.origin) return false
  if (!form.dateFrom) return false
  if (activeTab.value === 'hotels' && !form.dateTo) return false
  return true
})

const contextHint = computed(() => {
  const parts = []
  if (form.origin)      parts.push(`from ${form.origin}`)
  if (form.destination) parts.push(`to ${form.destination}`)
  if (form.dateFrom)    parts.push(`on ${form.dateFrom}`)
  return parts.join(' · ')
})

function dateToISO(d) {
  if (!d) return ''
  // Accept either a Date, a YYYY-MM-DD string, or anything Date() can parse.
  const date = d instanceof Date ? d : new Date(d)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

function plusDays(iso, days) {
  if (!iso) return ''
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// Forced search — used by the explicit "Search" button and the first auto-run.
async function doSearch(t) {
  const s = state(t)
  if (s.pending.value) return
  if (!form.destination) return
  if (needsOrigin(t) && !form.origin) return
  if (!form.dateFrom) return

  if (t === 'flights') {
    await s.search({ origin: form.origin, destination: form.destination, departureDate: form.dateFrom })
  } else if (t === 'buses') {
    await s.search({ origin: form.origin, destination: form.destination, departureDate: form.dateFrom })
  } else if (t === 'hotels') {
    if (!form.dateTo) return
    await s.search({ city: form.destination, checkin: form.dateFrom, checkout: form.dateTo })
  }
}

// Auto-run on tab open only if we haven't already.
async function runTabIfNew(t) {
  const s = state(t)
  if (s.pending.value || s.hasRun.value) return
  await doSearch(t)
}

function manualSearch() {
  if (!activeTab.value) return
  doSearch(activeTab.value)
}

function activate(t) {
  activeTab.value = t
  runTabIfNew(t)
}

// Kick off the default tab once mounted (if all required fields are present).
onMounted(() => {
  if (activeTab.value) runTabIfNew(activeTab.value)
})

function formatTimeOrIso(s) {
  if (!s) return ''
  // Accept either ISO timestamp or HH:mm
  if (/^\d{2}:\d{2}/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.live-offers {
  background: var(--sand);
  border-radius: var(--radius);
  padding: 22px 24px;
  margin-top: 20px;
}
.lo-header { margin-bottom: 14px; }
.lo-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem;
  color: var(--navy);
  font-weight: 700;
  margin-bottom: 2px;
}
.lo-context {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.lo-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  border-bottom: 1px solid var(--sand-dark);
}
.lo-tab {
  background: none;
  border: none;
  padding: 8px 14px;
  font-family: inherit;
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.2s, border-color 0.2s;
}
.lo-tab:hover { color: var(--navy); }
.lo-tab--active {
  color: var(--navy);
  border-bottom-color: var(--gold);
}

.lo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
  margin-bottom: 16px;
}
.lo-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1 1 140px;
  min-width: 0;
}
.lo-field span {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  font-weight: 600;
}
.lo-field input {
  padding: 8px 10px;
  border: 1.5px solid var(--sand-dark);
  border-radius: 8px;
  background: var(--white);
  font-size: 0.86rem;
  font-family: inherit;
  color: var(--text);
  width: 100%;
  transition: border-color 0.2s;
}
.lo-field input:focus {
  outline: none;
  border-color: var(--gold);
}
.lo-search-btn {
  align-self: flex-end;
  flex-shrink: 0;
  white-space: nowrap;
}

.lo-body { min-height: 120px; }
.lo-loading, .lo-empty, .lo-error {
  padding: 16px 0;
  font-size: 0.88rem;
  color: var(--text-muted);
}
.lo-error { color: var(--error); }

.lo-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.lo-card {
  background: var(--white);
  border: 1px solid var(--sand-dark);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.lo-card:hover {
  border-color: var(--gold);
  box-shadow: var(--shadow);
}
.lo-card-icon {
  font-size: 1.6rem;
  flex-shrink: 0;
  width: 40px;
  text-align: center;
}
.lo-card-icon--photo {
  width: 64px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--sand);
  display: flex;
  align-items: center;
  justify-content: center;
}
.lo-card-icon--photo img {
  width: 100%; height: 100%; object-fit: cover;
}
.lo-card-body { flex: 1; min-width: 0; }
.lo-card-title {
  font-weight: 700;
  color: var(--navy);
  font-size: 0.95rem;
}
.lo-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--text-muted);
  font-size: 0.8rem;
  margin: 4px 0 2px;
}
.lo-card-price {
  font-weight: 700;
  color: var(--gold);
  font-size: 0.95rem;
}
.lo-card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.lo-link {
  color: var(--navy);
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: underline;
}
.lo-link:hover { color: var(--gold); }

.btn-sm { padding: 6px 14px; font-size: 0.82rem; }

@media (max-width: 600px) {
  .lo-card { flex-wrap: wrap; }
  .lo-card-actions { width: 100%; justify-content: flex-end; }
}
</style>
