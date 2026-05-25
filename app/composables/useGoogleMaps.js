// Lazily loads the Google Maps JS API (Places library) exactly once.
// Key comes from runtimeConfig.public.googleMapsKey (NUXT_PUBLIC_GOOGLE_MAPS_KEY).
let loaderPromise = null

export function useGoogleMaps() {
  const key = useRuntimeConfig().public.googleMapsKey

  function load() {
    if (!import.meta.client) return Promise.resolve(null)
    if (!key) return Promise.reject(new Error('Google Maps key not configured'))
    if (window.google?.maps) return Promise.resolve(window.google.maps)
    if (loaderPromise) return loaderPromise

    loaderPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
      s.async = true
      s.defer = true
      s.onload = () => resolve(window.google.maps)
      s.onerror = () => reject(new Error('Failed to load Google Maps'))
      document.head.appendChild(s)
    })
    return loaderPromise
  }

  return { load, hasKey: Boolean(key) }
}
