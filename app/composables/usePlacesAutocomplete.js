// Attaches Google Places Autocomplete to an existing <input> element so users
// pick real, existing places (cities, landmarks, hotels) instead of free text.
// Keeps the element's own styling — it only wires behaviour, renders nothing.
//
// Usage:
//   const cityInput = ref(null)
//   usePlacesAutocomplete(cityInput, {
//     types: ['(cities)'],
//     onSelect: ({ name, address, lat, lng }) => { form.destination = name; ... },
//   })
//   <input ref="cityInput" v-model="form.destination" />
//
// No-op (plain text input) when the Maps key is missing, so the form still works.
export function usePlacesAutocomplete(inputRef, { types = [], onSelect } = {}) {
  const { load, hasKey } = useGoogleMaps()
  let ac = null

  // Change the place-type filter at runtime (e.g. when the user switches the
  // location category Hotel → Airport). Google's Autocomplete exposes setTypes.
  function setTypes(next) {
    if (ac) ac.setTypes(next && next.length ? next : ['establishment'])
  }

  onMounted(async () => {
    if (!hasKey || !import.meta.client) return
    try {
      const maps = await load()
      const el = inputRef.value
      if (!el) return

      ac = new maps.places.Autocomplete(el, {
        fields: ['geometry', 'name', 'formatted_address'],
        ...(types.length ? { types } : {}),
      })

      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (!place?.geometry) return // user typed free text, didn't pick a suggestion
        const loc = place.geometry.location
        onSelect?.({
          name: place.name || place.formatted_address || el.value,
          address: place.formatted_address || '',
          lat: loc.lat(),
          lng: loc.lng(),
        })
      })
    } catch (e) {
      console.error('[usePlacesAutocomplete]', e)
    }
  })

  onBeforeUnmount(() => {
    // Detach Google's listeners + remove the .pac-container it appended.
    if (ac && window.google?.maps?.event) {
      window.google.maps.event.clearInstanceListeners(ac)
    }
    document.querySelectorAll('.pac-container').forEach(n => n.remove())
  })

  return { hasKey, setTypes }
}
