// GDACS RSS feed -> normalized warning records.
// https://www.gdacs.org/xml/rss.xml — public, no key required.

import { XMLParser } from 'fast-xml-parser'

const FEED_URL = 'https://www.gdacs.org/xml/rss.xml'

const SEVERITY_MAP = { Green: 'info', Orange: 'advisory', Red: 'warning' }

export async function fetchGdacs() {
  const r = await fetch(FEED_URL, { headers: { 'user-agent': 'TravelManager/1.0' } })
  if (!r.ok) throw new Error(`gdacs fetch ${r.status}`)
  const xml = await r.text()
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const json = parser.parse(xml)
  const items = json?.rss?.channel?.item ?? []

  return items.map((it) => {
    const country = it['gdacs:country'] ?? it['gdacs:iso3'] ?? ''
    const country_iso2 = country.length === 2 ? country.toUpperCase() : countryNameToIso2(country)
    return {
      source:        'gdacs',
      source_id:     String(it.guid?.['#text'] ?? it.guid ?? it.link ?? Math.random()),
      country_iso2,
      region:        it['gdacs:country'] ?? '',
      severity:      SEVERITY_MAP[it['gdacs:alertlevel']] ?? 'info',
      summary:       it.description ?? it.title ?? '',
      valid_from:    it.pubDate ?? new Date().toISOString(),
      valid_to:      addDays(it.pubDate ?? new Date().toISOString(), 7),
      raw_json:      it,
    }
  }).filter((w) => w.country_iso2)
}

function countryNameToIso2(name) {
  // Tiny lookup — extend as needed. v2: use a real `i18n-iso-countries` package.
  const m = { 'United States': 'US', 'United Kingdom': 'GB', 'France': 'FR', 'Germany': 'DE', 'Italy': 'IT', 'Spain': 'ES', 'Japan': 'JP', 'China': 'CN', 'Brazil': 'BR', 'India': 'IN', 'Mexico': 'MX', 'Indonesia': 'ID', 'Philippines': 'PH', 'Turkey': 'TR', 'Greece': 'GR', 'Australia': 'AU' }
  return m[name] ?? null
}

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}
