// Shared Firebase Admin initialisation. Used by the API Gateway (JWT verify) and
// by services that talk to Firestore (Trip service: likes/reviews comments).
// Credentials resolve from FIREBASE_SERVICE_ACCOUNT (JSON) or Application
// Default Credentials (gcloud / Workload Identity on GKE).
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export function ensureFirebase() {
  if (getApps().length > 0) return getApps()[0]

  const sa = process.env.FIREBASE_SERVICE_ACCOUNT
  if (sa && sa !== '{}' && sa !== '') {
    return initializeApp({ credential: cert(JSON.parse(sa)) })
  }
  return initializeApp({
    credential: applicationDefault(),
    projectId:
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
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
