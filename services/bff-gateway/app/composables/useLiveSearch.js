// Thin wrapper around /api/flights, /api/buses and /api/hotels.
// Each instance tracks its own results / pending / error refs so a tabbed UI
// can render the three searches independently.
//
// Usage:
//   const flights = useLiveSearch('flights')
//   await flights.search({ origin: 'Stuttgart', destination: 'Oslo', departureDate: '2026-06-01' })
//   // flights.results.value, flights.pending.value, flights.error.value

export function useLiveSearch(kind) {
  const results = ref([])
  const pending = ref(false)
  const error   = ref('')
  const hasRun  = ref(false)

  const { apiFetch } = useApiFetch()

  async function search(params) {
    pending.value = true
    error.value   = ''
    try {
      const url = `/api/${kind}`
      results.value = await apiFetch(url, { query: params })
    } catch (err) {
      error.value = err?.data?.statusMessage || err?.message || 'Search failed'
      results.value = []
    } finally {
      pending.value = false
      hasRun.value  = true
    }
  }

  return { results, pending, error, hasRun, search }
}
