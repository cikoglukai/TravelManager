// @travelmanager/shared-config
// 12-Factor config loader — env vars only, validated against a schema, fail-fast on misconfiguration.
//
// Usage:
//   import { loadConfig } from '@travelmanager/shared-config'
//   export const config = loadConfig({
//     port:        { env: 'PORT', type: 'number', default: 8080 },
//     databaseUrl: { env: 'DATABASE_URL_TRIP', type: 'string', required: true },
//     pubsubProj:  { env: 'GOOGLE_CLOUD_PROJECT', type: 'string', required: true },
//   })

const COERCERS = {
  string: (v) => v,
  number: (v) => {
    const n = Number(v)
    if (Number.isNaN(n)) throw new Error(`not a number: ${v}`)
    return n
  },
  boolean: (v) => {
    if (v === '1' || v === 'true' || v === 'yes') return true
    if (v === '0' || v === 'false' || v === 'no' || v === '') return false
    throw new Error(`not a boolean: ${v}`)
  },
  json: (v) => JSON.parse(v),
  list: (v) => v.split(',').map((s) => s.trim()).filter(Boolean),
}

export function loadConfig(schema) {
  const out = {}
  const errors = []

  for (const [key, spec] of Object.entries(schema)) {
    const raw = process.env[spec.env]
    if (raw === undefined || raw === '') {
      if (spec.required) {
        errors.push(`Missing required env ${spec.env} (config key: ${key})`)
        continue
      }
      out[key] = spec.default
      continue
    }
    try {
      out[key] = COERCERS[spec.type ?? 'string'](raw)
    } catch (e) {
      errors.push(`Invalid env ${spec.env} (${key}): ${e.message}`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`[shared-config] Configuration errors:\n  - ${errors.join('\n  - ')}`)
  }
  return Object.freeze(out)
}

// Helpful for tests: clear pool+other singletons that read env at startup.
export function snapshotEnv() {
  return Object.freeze({ ...process.env })
}
