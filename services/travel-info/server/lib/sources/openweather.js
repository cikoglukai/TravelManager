// OpenWeather One Call API -> 5-day forecast snapshots.
// Requires OPENWEATHER_API_KEY (free tier: 60 req/min).

const ONECALL = 'https://api.openweathermap.org/data/2.5/forecast'

export async function fetchWeatherForCity({ city, country }) {
  const key = process.env.OPENWEATHER_API_KEY
  if (!key) return null
  const u = new URL(ONECALL)
  u.searchParams.set('q', `${city},${country}`)
  u.searchParams.set('appid', key)
  u.searchParams.set('units', 'metric')
  const r = await fetch(u.toString())
  if (!r.ok) return null
  const json = await r.json()
  const list = (json?.list ?? []).slice(0, 8 * 5)  // 5 days x 8 points/day

  // Group by date.
  const byDay = {}
  for (const e of list) {
    const day = e.dt_txt.slice(0, 10)
    if (!byDay[day]) byDay[day] = { tempMin: Infinity, tempMax: -Infinity, precipitationMm: 0, summary: e.weather?.[0]?.description ?? '' }
    byDay[day].tempMin = Math.min(byDay[day].tempMin, e.main.temp_min)
    byDay[day].tempMax = Math.max(byDay[day].tempMax, e.main.temp_max)
    byDay[day].precipitationMm += (e.rain?.['3h'] ?? 0) + (e.snow?.['3h'] ?? 0)
  }
  return {
    city,
    country: country.toUpperCase(),
    snapshotAt: new Date().toISOString(),
    forecast: Object.entries(byDay).map(([date, v]) => ({ date, ...v })),
  }
}
