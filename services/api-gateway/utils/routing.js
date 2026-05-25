// Path → service routing, public routes, and per-path feature gates.
import { planAllows } from '@travelmanager/shared/tiers'

// Ordered prefix → service-key table. First match wins.
const ROUTES = [
  { prefix: '/api/users',        service: 'user' },
  { prefix: '/api/tenants',      service: 'user' },
  { prefix: '/api/trips',        service: 'trip' },
  { prefix: '/api/locations',    service: 'trip' },
  { prefix: '/api/reviews',      service: 'trip' },
  { prefix: '/api/likes',        service: 'trip' },
  { prefix: '/api/travel-plans', service: 'trip' },
  { prefix: '/api/flights',      service: 'trip' },
  { prefix: '/api/hotels',       service: 'trip' },
  { prefix: '/api/buses',        service: 'trip' },
  { prefix: '/api/destinations', service: 'destination' },
  { prefix: '/api/b2b',          service: 'destination' },
  { prefix: '/api/feed',         service: 'social' },
  { prefix: '/api/alerts',       service: 'travelInfo' },
]

export function resolveService(path) {
  return ROUTES.find(r => path.startsWith(r.prefix))?.service ?? null
}

// Downstream base URLs, read from the environment AT RUNTIME (not via
// useRuntimeConfig, whose process.env defaults are frozen at build time).
export function serviceUrl(key) {
  switch (key) {
    case 'user':        return process.env.USER_SERVICE_URL        || 'http://localhost:3001'
    case 'trip':        return process.env.TRIP_SERVICE_URL        || 'http://localhost:3002'
    case 'destination': return process.env.DESTINATION_SERVICE_URL || 'http://localhost:3003'
    case 'social':      return process.env.SOCIAL_SERVICE_URL      || 'http://localhost:3004'
    case 'travelInfo':  return process.env.TRAVEL_INFO_SERVICE_URL || 'http://localhost:3005'
    default:            return null
  }
}

// Routes reachable without a token.
export function isPublic(path, method) {
  if (path === '/api/trips/all') return true
  if (path.startsWith('/api/destinations')) return true
  if (/^\/api\/tenants\/[^/]+$/.test(path) && method === 'GET') return true // white-label config
  if (/^\/api\/likes\/trip\/[^/]+$/.test(path) && method === 'GET') return true
  return false
}

// Internal endpoints must never be reachable through the public gateway.
export function isBlocked(path) {
  return path.startsWith('/api/internal') || path === '/api/plan-refs'
}

// Feature gating by plan. Returns null if allowed, else a reason string.
// NOTE: only the feed READ (`/api/feed`) is gated — the follow graph
// (`/api/feed/follows...`) is a free social primitive and must stay open.
export function featureGate(path, plan) {
  const bare = path.split('?')[0]
  if (bare === '/api/feed' && !planAllows(plan, 'feed')) {
    return 'The personalized feed requires the Standard plan or higher'
  }
  if (bare.startsWith('/api/b2b') && !planAllows(plan, 'b2bData')) {
    return 'B2B data access requires the Enterprise plan'
  }
  return null
}
