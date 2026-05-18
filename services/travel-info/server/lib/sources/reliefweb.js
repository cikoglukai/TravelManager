// ReliefWeb API -> warnings. https://reliefweb.int/help/api
// Free, no key. Returns disasters from past 24h.

const API = 'https://api.reliefweb.int/v1/disasters'

export async function fetchReliefweb() {
  const r = await fetch(`${API}?appname=travelmanager&limit=50&filter[field]=status&filter[value]=ongoing`, {
    headers: { 'user-agent': 'TravelManager/1.0' },
  })
  if (!r.ok) throw new Error(`reliefweb fetch ${r.status}`)
  const json = await r.json()
  const items = json?.data ?? []

  return items.map((it) => {
    const f = it.fields || {}
    const country = (f.country?.[0]?.iso3 ?? '').slice(0, 2).toUpperCase() || (f.primary_country?.iso3 ?? '').slice(0, 2).toUpperCase()
    return {
      source:        'reliefweb',
      source_id:     String(it.id),
      country_iso2:  country,
      region:        f.country?.[0]?.name ?? '',
      severity:      severityFromStatus(f.status),
      summary:       f.name ?? '',
      valid_from:    f.date?.created ?? new Date().toISOString(),
      valid_to:      f.date?.changed ?? addDays(f.date?.created ?? new Date().toISOString(), 30),
      raw_json:      f,
    }
  }).filter((w) => w.country_iso2)
}

function severityFromStatus(s) {
  if (s === 'alert') return 'warning'
  if (s === 'past') return 'info'
  return 'advisory'
}

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}
