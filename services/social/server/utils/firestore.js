// Firestore client for feed items + likes + reviews. Uses Application Default Credentials in prod;
// SKIP_FIRESTORE=1 disables for local dev without Firebase creds.

import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

let _db = null
const _stub = {
  collection: () => _stub,
  doc: () => _stub,
  set: async () => {},
  get: async () => ({ docs: [], forEach: () => {}, size: 0 }),
  delete: async () => {},
  add: async () => ({ id: 'stub' }),
  orderBy: () => _stub,
  limit: () => _stub,
  where: () => _stub,
}

export function fs() {
  if (process.env.SKIP_FIRESTORE === '1') return _stub
  if (_db) return _db
  if (getApps().length === 0) {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT
    if (sa && sa !== '{}') initializeApp({ credential: cert(JSON.parse(sa)) })
    else initializeApp({ credential: applicationDefault(), projectId: process.env.GOOGLE_CLOUD_PROJECT })
  }
  _db = getFirestore()
  return _db
}
