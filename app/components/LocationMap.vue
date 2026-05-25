<!-- Google Maps location picker. Shows a map + a Places Autocomplete search box;
     emits the chosen place (name + lat/lng) so plan/explore pages can pin
     destinations. Complements the globe.gl globe. -->
<template>
  <div class="location-map">
    <input
      v-if="hasKey"
      ref="searchEl"
      class="map-search"
      type="text"
      placeholder="Search a place…"
    />
    <div ref="mapEl" class="map-canvas" :class="{ disabled: !hasKey }">
      <p v-if="!hasKey" class="map-fallback">
        Set <code>NUXT_PUBLIC_GOOGLE_MAPS_KEY</code> to enable the map.
      </p>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  lat: { type: Number, default: 48.2082 }, // Vienna default
  lng: { type: Number, default: 16.3738 },
  zoom: { type: Number, default: 5 },
})
const emit = defineEmits(['select'])

const { load, hasKey } = useGoogleMaps()
const mapEl = ref(null)
const searchEl = ref(null)

onMounted(async () => {
  if (!hasKey) return
  try {
    const maps = await load()
    const map = new maps.Map(mapEl.value, {
      center: { lat: props.lat, lng: props.lng },
      zoom: props.zoom,
    })
    const marker = new maps.Marker({ map, position: { lat: props.lat, lng: props.lng } })

    const ac = new maps.places.Autocomplete(searchEl.value, { fields: ['geometry', 'name', 'formatted_address'] })
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place.geometry) return
      const loc = place.geometry.location
      map.setCenter(loc)
      map.setZoom(11)
      marker.setPosition(loc)
      emit('select', {
        name: place.name,
        address: place.formatted_address,
        lat: loc.lat(),
        lng: loc.lng(),
      })
    })
  } catch (e) {
    console.error('[LocationMap]', e)
  }
})
</script>

<style scoped>
.location-map { display: flex; flex-direction: column; gap: 10px; }
.map-search {
  padding: 10px 14px; border: 1px solid var(--sand-dark); border-radius: 8px;
  font-family: inherit; font-size: 0.9rem;
}
.map-canvas {
  width: 100%; height: 320px; border-radius: var(--radius);
  overflow: hidden; box-shadow: var(--shadow); background: var(--sand-dark);
}
.map-canvas.disabled { display: flex; align-items: center; justify-content: center; }
.map-fallback { color: var(--text-muted); font-size: 0.85rem; }
</style>
