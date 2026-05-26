<!-- Multi-marker Google Map. Renders any mix of trip / hotel / warning pins
     passed via :markers and fits the viewport to them. Read-only display layer
     over data fetched elsewhere (trips, hotels, /api/alerts). Complements the
     single-place LocationMap picker. -->
<template>
  <div class="trip-map">
    <div ref="mapEl" class="map-canvas" :class="{ disabled: !hasKey }">
      <p v-if="!hasKey" class="map-fallback">
        Set <code>NUXT_PUBLIC_GOOGLE_MAPS_KEY</code> to enable the map.
      </p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  // [{ lat, lng, title, kind: 'trip'|'hotel'|'warning', severity?, photo?, link? }]
  markers: { type: Array, default: () => [] },
  zoom: { type: Number, default: 4 },
})

const { load, hasKey } = useGoogleMaps()
const mapEl = ref(null)
let map = null
let maps = null
let drawn = []
let info = null

// Pin colour by kind/severity. Warnings override colour by severity.
function pinColor(m) {
  if (m.kind === 'warning' || m.severity) {
    return m.severity === 'warning' ? '#c0392b' : '#e6a23c'
  }
  if (m.kind === 'hotel') return '#2d8a6d'
  return '#1f6feb' // trip
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

function infoHtml(m) {
  const title = escapeHtml(m.title || '')
  const photo = m.photo ? `<img src="${escapeHtml(m.photo)}" alt="" style="width:100%;max-width:200px;border-radius:6px;margin-top:6px"/>` : ''
  const sev = m.severity ? `<div style="color:${pinColor(m)};font-weight:600">⚠️ ${escapeHtml(m.severity)}</div>` : ''
  const link = m.link ? `<div style="margin-top:6px"><a href="${escapeHtml(m.link)}" target="_blank" rel="noopener">View →</a></div>` : ''
  return `<div style="font-family:inherit;max-width:220px"><strong>${title}</strong>${sev}${photo}${link}</div>`
}

function render() {
  if (!map || !maps) return
  drawn.forEach(mk => mk.setMap(null))
  drawn = []

  const valid = props.markers.filter(m => m && m.lat != null && m.lng != null)
  if (!valid.length) return

  const bounds = new maps.LatLngBounds()
  for (const m of valid) {
    const position = { lat: Number(m.lat), lng: Number(m.lng) }
    const marker = new maps.Marker({
      map,
      position,
      title: m.title || '',
      icon: {
        path: maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: pinColor(m),
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    })
    marker.addListener('click', () => {
      info.setContent(infoHtml(m))
      info.open({ map, anchor: marker })
    })
    drawn.push(marker)
    bounds.extend(position)
  }

  if (valid.length === 1) {
    map.setCenter(bounds.getCenter())
    map.setZoom(9)
  } else {
    map.fitBounds(bounds, 48)
  }
}

onMounted(async () => {
  if (!hasKey) return
  try {
    maps = await load()
    map = new maps.Map(mapEl.value, {
      center: { lat: 20, lng: 0 },
      zoom: props.zoom,
      mapTypeControl: false,
      streetViewControl: false,
    })
    info = new maps.InfoWindow()
    render()
  } catch (e) {
    console.error('[TripMap]', e)
  }
})

watch(() => props.markers, render, { deep: true })
</script>

<style scoped>
.trip-map { width: 100%; }
.map-canvas {
  width: 100%; height: 360px; border-radius: var(--radius);
  overflow: hidden; box-shadow: var(--shadow); background: var(--sand-dark);
}
.map-canvas.disabled { display: flex; align-items: center; justify-content: center; }
.map-fallback { color: var(--text-muted); font-size: 0.85rem; }
</style>
