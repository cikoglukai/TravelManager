// Nitro server plugin: start database setup without blocking the HTTP listener.
// Cloud Run requires the container to listen quickly on PORT/NITRO_PORT.
import { initializeApp, cert, getApps, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { initDb } from '~~/server/utils/db.js'
import { seedDb } from '~~/server/utils/seed.js'

let setupStarted = false

function ensureFirebase() {
  if (getApps().length > 0) return getApps()[0]
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT
  if (sa && sa !== '{}' && sa !== '') {
    return initializeApp({ credential: cert(JSON.parse(sa)) })
  }
  return initializeApp({
    credential: applicationDefault(),
    projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
  })
}

// initDb() drops the Postgres trips table, so the SERIAL counter resets to 1.
// Firestore likes/reviews are keyed by tripId — without this wipe, the next
// trip that takes id=1 would inherit stale likes/comments from a prior run.
async function wipeFirestoreTripData() {
  let app
  try { app = ensureFirebase() } catch (e) {
    console.warn('[db] firebase init skipped, leaving Firestore untouched:', e?.message ?? e)
    return
  }
  const fs = getFirestore(app, 'onecloudaway-db')
  for (const collName of ['likes', 'reviews']) {
    const tripDocs = await fs.collection(collName).listDocuments()
    for (const tripDoc of tripDocs) {
      const userDocs = await tripDoc.collection('users').listDocuments()
      if (userDocs.length) {
        const batch = fs.batch()
        userDocs.forEach(d => batch.delete(d))
        await batch.commit()
      }
      await tripDoc.delete().catch(() => {})
    }
  }
}

export default defineNitroPlugin(() => {
  if (setupStarted) return
  setupStarted = true

  initDb()
    .then(() => seedDb())
    .then(() => wipeFirestoreTripData().catch(e => {
      console.error('[db] firestore wipe failed', e)
    }))
    .then(() => {
      console.log('[db] setup completed')
    })
    .catch((error) => {
      console.error('[db] setup failed', error)
    })
})
