// Shared Firebase Admin initialisation. Used by the API Gateway (JWT verify) and
// by services that talk to Firestore (Trip service: likes/reviews comments).
// Credentials resolve from FIREBASE_SERVICE_ACCOUNT (JSON) or Application
// Default Credentials (gcloud / Workload Identity on GKE).
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export function ensureFirebase() {
  if (getApps().length > 0) return getApps()[0]

  // Local dev: the Firestore emulator (FIRESTORE_EMULATOR_HOST) needs no real
  // credentials. applicationDefault() would throw on kind, so init with just a
  // projectId — the admin SDK auto-routes Firestore to the emulator.
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({
      projectId:
        process.env.FIREBASE_PROJECT_ID ||
        process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT ||
        'demo-travelmanager',
    })
  }

  const sa = process.env.FIREBASE_SERVICE_ACCOUNT
  if (sa && sa !== '{}' && sa !== '') {
    return initializeApp({ credential: cert(JSON.parse(sa)) })
  }
  // Prefer the explicit Firebase project id: GOOGLE_CLOUD_PROJECT may be a
  // cluster placeholder (e.g. "local" on kind), which would make verifyIdToken
  // reject tokens on an audience mismatch.
  return initializeApp({
    credential: applicationDefault(),
    projectId:
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT,
  })
}

export function getAuthClient() {
  return getAuth(ensureFirebase())
}

// Named Firestore database used for likes/reviews comments.
const FIRESTORE_DB_ID = process.env.FIRESTORE_DATABASE_ID || 'onecloudaway-db'

export function getFirestoreDb() {
  return getFirestore(ensureFirebase(), FIRESTORE_DB_ID)
}
