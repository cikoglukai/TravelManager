// POST /api/tasks/seed-warnings — bulk-insert warning rows for load/scalability
// tests, so the diff engine has deterministic data to match against (instead of
// depending on the live Auswärtiges Amt feed). Body: array of
// { country_code, country_name, severity, title }. Internal; not gateway-routed.
import { createHash } from 'node:crypto'
import { getDb } from '@travelmanager/shared/db'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const rows = Array.isArray(body) ? body : (body?.warnings ?? [])
  const db = getDb()

  let inserted = 0
  for (const w of rows) {
    const severity = w.severity || 'warning'
    const title = w.title || w.country_name
    const ch = createHash('sha1').update(`${severity}|${title}`).digest('hex').slice(0, 16)
    await db.query(
      `INSERT INTO warnings_cache (country_code, country_name, warning, partial, severity, title, content_hash, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
       ON CONFLICT (country_code) DO UPDATE SET
         country_name=EXCLUDED.country_name, severity=EXCLUDED.severity,
         title=EXCLUDED.title, content_hash=EXCLUDED.content_hash, updated_at=NOW()`,
      [w.country_code, w.country_name, severity === 'warning', severity === 'partial', severity, title, ch]
    )
    inserted++
  }
  return { ok: true, inserted }
})
