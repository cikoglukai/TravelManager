<template>
  <div class="globe-outer">
    <ClientOnly>
      <div ref="container" class="globe-container" />

      <template #fallback>
        <div class="globe-skeleton">
          <div class="globe-skeleton-circle"></div>
          <p class="globe-skeleton-text">Loading globe…</p>
        </div>
      </template>
    </ClientOnly>

    <!-- Legend -->
    <div class="globe-legend">
      <span class="legend-dot legend-dot--idle"></span> Destination
      <span class="legend-dot legend-dot--selected" style="margin-left:16px"></span> Selected
    </div>
  </div>
</template>

<script setup>
// Coordinates for each of the 15 seeded European countries
const COORDS = {
  'Austria':        { lat: 48.21, lng: 16.37 },
  'France':         { lat: 48.86, lng:  2.35 },
  'Italy':          { lat: 41.90, lng: 12.50 },
  'Spain':          { lat: 41.39, lng:  2.17 },
  'Germany':        { lat: 52.52, lng: 13.41 },
  'Netherlands':    { lat: 52.37, lng:  4.90 },
  'Czech Republic': { lat: 50.08, lng: 14.44 },
  'Hungary':        { lat: 47.50, lng: 19.04 },
  'Greece':         { lat: 37.98, lng: 23.73 },
  'Portugal':       { lat: 38.72, lng: -9.14 },
  'Switzerland':    { lat: 47.38, lng:  8.54 },
  'Croatia':        { lat: 43.51, lng: 16.44 },
  'Poland':         { lat: 50.06, lng: 19.94 },
  'Norway':         { lat: 60.39, lng:  5.32 },
  'Iceland':        { lat: 64.13, lng: -21.82 },
}

const ISO = {
  'Austria': 'AT', 'France': 'FR', 'Italy': 'IT', 'Spain': 'ES',
  'Germany': 'DE', 'Netherlands': 'NL', 'Czech Republic': 'CZ',
  'Hungary': 'HU', 'Greece': 'GR', 'Portugal': 'PT',
  'Switzerland': 'CH', 'Croatia': 'HR', 'Poland': 'PL',
  'Norway': 'NO', 'Iceland': 'IS',
}

const props = defineProps({
  destinations: { type: Array,  default: () => [] },
  selectedId:   { type: Number, default: null },
})
const emit = defineEmits(['select'])

const container = ref(null)
let globe           = null
let resumeTimer     = null
let resizeObserver  = null

// Build the point array enriched with lat/lng
function buildPoints() {
  return props.destinations.map(d => ({
    ...d,
    ...(COORDS[d.country] ?? { lat: 50, lng: 10 }),
  }))
}

// ── Mount ────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await nextTick()
  if (!container.value) return

  const { default: Globe } = await import('globe.gl')

  const points = buildPoints()

  globe = Globe()
    .width(container.value.clientWidth  || 700)
    .height(container.value.clientHeight || 520)
    .backgroundColor('#0a1628')       // slightly darker than --navy

    // Earth
    .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-night.jpg')
    .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')

    // Atmosphere — gold glow matching the brand
    .showAtmosphere(true)
    .atmosphereColor('#c9a84c')
    .atmosphereAltitude(0.18)

    // ── Destination points ──────────────────────────────────────────────────
    .pointsData(points)
    .pointLat('lat')
    .pointLng('lng')
    .pointAltitude(0.02)
    .pointRadius(d => d.id === props.selectedId ? 0.9 : 0.55)
    .pointColor(d =>
      d.id === props.selectedId
        ? '#c9a84c'                    // gold  — selected
        : 'rgba(255,255,255,0.82)'    // white — unselected
    )
    .pointLabel(d => `
      <div style="
        background: rgba(10,22,40,0.95);
        border: 1.5px solid #c9a84c;
        border-radius: 10px;
        padding: 10px 14px;
        font-family: 'DM Sans', sans-serif;
        color: #fff;
        text-align: center;
        pointer-events: none;
        min-width: 120px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      ">
        <div style="font-size:1.6rem;line-height:1.2">${d.emoji}</div>
        <div style="font-weight:700;font-size:0.9rem;margin-top:4px">${d.country}</div>
        <div style="font-size:0.72rem;opacity:0.65;margin-top:2px">${d.city}</div>
        <div style="
          margin-top:8px;
          font-size:0.7rem;
          background:#c9a84c;
          color:#0f1f3d;
          border-radius:100px;
          padding:2px 8px;
          font-weight:700;
          display:inline-block;
        ">Click to select</div>
      </div>
    `)
    .onPointClick(d => {
      emit('select', d)
      globe.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.6 }, 900)
      globe.controls().autoRotate = false
      clearTimeout(resumeTimer)
      resumeTimer = setTimeout(() => { globe.controls().autoRotate = true }, 8000)
    })
    .onPointHover(d => {
      if (container.value) {
        container.value.style.cursor = d ? 'pointer' : 'grab'
      }
    })

    // ── Pulsing ring on selected destination ────────────────────────────────
    .ringsData(points.filter(p => p.id === props.selectedId))
    .ringLat('lat')
    .ringLng('lng')
    .ringColor(() => t => `rgba(201,168,76,${(1 - t) * 0.9})`)
    .ringMaxRadius(3.5)
    .ringPropagationSpeed(1.8)
    .ringRepeatPeriod(900)

    // ── Country emoji labels always visible ─────────────────────────────────
    .labelsData(points)
    .labelLat('lat')
    .labelLng('lng')
    .labelText(d => ISO[d.country] ?? d.country)
    .labelColor(() => 'rgba(255,255,255,0.95)')
    .labelSize(1.6)
    .labelAltitude(0.025)
    .labelDotRadius(0)
    .labelResolution(3)

    (container.value)

  // Initial view — centred on Europe
  globe.pointOfView({ lat: 54, lng: 14, altitude: 2.1 })

  // Auto-rotate
  globe.controls().autoRotate      = true
  globe.controls().autoRotateSpeed = 0.35
  globe.controls().enableDamping   = true
  globe.controls().dampingFactor   = 0.08

  // Pause on interaction, resume after 8 s
  container.value.addEventListener('mousedown',  handleInteract)
  container.value.addEventListener('touchstart', handleInteract, { passive: true })

  // Responsive resize
  resizeObserver = new ResizeObserver(() => {
    if (globe && container.value) {
      globe.width(container.value.clientWidth)
    }
  })
  resizeObserver.observe(container.value)
})

function handleInteract() {
  if (!globe) return
  globe.controls().autoRotate = false
  clearTimeout(resumeTimer)
  resumeTimer = setTimeout(() => {
    if (globe) globe.controls().autoRotate = true
  }, 8000)
}

// ── Re-render when selection changes ─────────────────────────────────────────
watch(() => props.selectedId, () => {
  if (!globe) return
  const points = buildPoints()
  globe
    .pointsData(points)
    .pointRadius(d => d.id === props.selectedId ? 0.9 : 0.55)
    .pointColor(d => d.id === props.selectedId ? '#c9a84c' : 'rgba(255,255,255,0.82)')
    .ringsData(points.filter(p => p.id === props.selectedId))
  // Fly to selected
  const sel = points.find(p => p.id === props.selectedId)
  if (sel) globe.pointOfView({ lat: sel.lat, lng: sel.lng, altitude: 1.6 }, 900)
})

onUnmounted(() => {
  clearTimeout(resumeTimer)
  resizeObserver?.disconnect()
  if (container.value) {
    container.value.removeEventListener('mousedown',  handleInteract)
    container.value.removeEventListener('touchstart', handleInteract)
  }
})
</script>

<style scoped>
.globe-outer {
  position: relative;
  width: 100%;
  user-select: none;
}

.globe-container {
  width: 100%;
  height: 520px;
  border-radius: 16px;
  overflow: hidden;
  /* Transparent bg so page gradient shows — container sets background */
  background: #0a1628;
}

/* Loading skeleton */
.globe-skeleton {
  width: 100%;
  height: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0a1628;
  border-radius: 16px;
  gap: 20px;
}
.globe-skeleton-circle {
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: rgba(201,168,76,0.06);
  border: 2px solid rgba(201,168,76,0.15);
  animation: pulse 2s ease-in-out infinite;
}
.globe-skeleton-text {
  color: rgba(255,255,255,0.4);
  font-size: 0.88rem;
  letter-spacing: 0.08em;
}
@keyframes pulse {
  0%, 100% { transform: scale(1);    opacity: 0.6; }
  50%       { transform: scale(1.04); opacity: 1;   }
}

/* Legend */
.globe-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0 0;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.45);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.legend-dot--idle     { background: rgba(255,255,255,0.75); }
.legend-dot--selected { background: #c9a84c; }

@media (max-width: 768px) {
  .globe-container { height: 350px; }
  .globe-skeleton  { height: 350px; }
}
</style>
