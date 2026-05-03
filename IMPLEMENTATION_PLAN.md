# TravelManager: Feature Implementation Plan

## Context
Implement 5 user stories on top of existing Nuxt 3 + PostgreSQL + Firebase stack:
1. **Location date range** — add `date_from`/`date_to` to trip waypoints
2. **Firebase Storage for images** — replace base64-in-DB for profile avatars + location images
3. **Likes & Comments (Firestore)** — one-like-per-user, optional comment, shown on trip detail
4. **Identity management** — route guards, profile setup flow, register UI polish
5. **Search trips** — public `?q=` search on title/destination/description

Tech decisions: Firebase Storage (images), Firebase Firestore (likes), existing Firebase Auth (identity).

---

## Implementation Order

### Phase 1 — DB Schema + Location Date Range

**`server/utils/db.js`** — Add two columns to `plan_locations` CREATE TABLE:
```sql
CREATE TABLE plan_locations (
  id          SERIAL      PRIMARY KEY,
  trip_id     INTEGER     NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  image_url   TEXT        NOT NULL DEFAULT '',
  date_from   DATE,
  date_to     DATE,
  position    INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

**`server/api/locations/trip/[tripId].get.js`** — Add `date_from, date_to` to SELECT:
```sql
SELECT id, trip_id, name, description, image_url, date_from, date_to, position, created_at
```

**`server/api/locations/trip/[tripId].post.js`** — Accept `date_from, date_to` from body; add to INSERT and RETURNING.

**`server/api/locations/[id].put.js`** — Accept `date_from, date_to`; add to UPDATE SET and RETURNING.

**`app/components/LocationManager.vue`** — Date range UI:
- Add `date_from: ''` and `date_to: ''` to reactive `form` object
- Populate in `startEdit(loc)`, reset in `openAddForm()`
- Client-side validate: if both set, `date_to >= date_from`
- Add to POST/PUT body
- Add date input fields in form (after description):
```html
<div class="lm-date-row">
  <input v-model="form.date_from" type="date" />
  <span>→</span>
  <input v-model="form.date_to" type="date" :min="form.date_from || undefined" />
</div>
```
- Display in card: `{{ formatDate(loc.date_from) }} → {{ formatDate(loc.date_to) }}`

---

### Phase 2 — Firebase Storage for Images

**`nuxt.config.js`** — Add `storageBucket` to `runtimeConfig.public.firebase`:
```js
storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
```

**`.env.example`** — Add:
```
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

**`app/plugins/0.firebase.client.js`** — No change needed; `storageBucket` auto-picked up from config object passed to `initializeApp`.

**Create `app/composables/useStorage.js`**:
```js
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

export function useStorage() {
  async function uploadImage(blob, path) {
    const storage = getStorage()
    const fileRef = storageRef(storage, path)
    const snap = await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' })
    return getDownloadURL(snap.ref)
  }
  return { uploadImage }
}
```

**`app/pages/profile.vue`** — Replace base64 avatar upload:
- Import `useStorage`
- Change `compressAvatar` to return `Blob` via `canvas.toBlob` (wrapped in Promise)
- In `onAvatarFileChange`: compress → upload to `avatars/${user.value.firebase_uid}/${Date.now()}.jpg` → get URL → PATCH
- `removeAvatar`: delete old file from Storage via `deleteObject` before patching with `''`

**`server/api/users/[id].patch.js`** — Replace 800KB base64 check with URL validation:
```js
// Remove: if (avatar_url.length > 800_000) throw ...
// Add:
if (avatar_url && !avatar_url.startsWith('https://')) {
  throw createError({ statusCode: 400, statusMessage: 'avatar_url must be an HTTPS URL' })
}
```

**`app/components/LocationManager.vue`** — Replace `compressToDataUrl` with Storage upload:
- Import `useStorage`
- Change `compressToDataUrl(file)` → `compressToBlob(file)` (same canvas logic, `canvas.toBlob` → Promise)
- In `processFile`: compress → upload to `locations/${props.tripId}/${Date.now()}.jpg` → set `form.image_url` to HTTPS URL
- External URL paste (`applyUrl`) stays unchanged

> **Firebase Console action required**: Set Storage security rules:
> ```
> rules_version = '2';
> service firebase.storage {
>   match /b/{bucket}/o {
>     match /{allPaths=**} {
>       allow read: if true;
>       allow write: if request.auth != null;
>     }
>   }
> }
> ```

---

### Phase 3 — Route Guards + Profile Setup

**Create `app/middleware/auth.global.js`** (Nuxt global middleware — runs on every navigation):
```js
export default defineNuxtRouteMiddleware(async (to) => {
  if (!import.meta.client) return

  const { user, authReady } = useAuth()
  if (!authReady.value) return  // auth not yet resolved; onMounted guards handle initial load

  const PROTECTED = ['/trips', '/profile', '/plan']
  const isProtected = PROTECTED.some(p => to.path === p || to.path.startsWith(p + '/'))

  if (!isProtected) return

  if (!user.value) return navigateTo('/register')

  if ((!user.value.name || user.value.name.trim() === '') && to.path !== '/profile') {
    return navigateTo('/profile?setup=1')
  }
})
```

**`app/composables/useAuth.js`** — Add `authReady` state:
```js
const authReady = useState('authReady', () => false)
// Inside initAuth(), after setting user.value in onAuthStateChanged callback:
authReady.value = true
// Return authReady from the composable
```

**`app/pages/community.vue`** — Remove auth gate (guests can now access community + search):
```js
// Delete:
onMounted(() => {
  if (!user.value) navigateTo('/register')
})
```

**`app/pages/register.vue`** — Redirect to profile setup after Google sign-in when name is missing:
```js
await signInGoogle()
const { user } = useAuth()
if (!user.value?.name?.trim()) {
  navigateTo('/profile?setup=1')
} else {
  navigateTo('/trips')
}
```

**`app/pages/profile.vue`** — Add setup banner when `?setup=1`:
```html
<div v-if="$route.query.setup" class="setup-banner">
  Welcome! Complete your profile to get started.
</div>
```

---

### Phase 4 — Search Trips

**`server/api/trips/all.get.js`** — Add `?q=` ILIKE search (endpoint already in `PUBLIC_PATTERNS`):
```js
const { q } = getQuery(event)
// If q present:
WHERE (t.title ILIKE $1 OR t.destination ILIKE $1 OR t.short_description ILIKE $1)
// params: [`%${q.trim()}%`]
```

**`app/pages/community.vue`** — Add search bar with 350ms debounce + reactive `useFetch`:
```js
const searchQuery = ref('')
const debouncedSearch = ref('')
let timer = null
function onSearchInput() {
  clearTimeout(timer)
  timer = setTimeout(() => { debouncedSearch.value = searchQuery.value }, 350)
}
const { data, pending } = await useFetch('/api/trips/all', {
  key: 'community-trips',
  query: computed(() => debouncedSearch.value ? { q: debouncedSearch.value } : {}),
  watch: [debouncedSearch],
})
const trips = computed(() => data.value ?? [])
```
- Replace `filtered` with `trips` in template
- Add search input above trip grid
- Update empty state: show `"No trips match '{{ debouncedSearch }}'"` when searching

---

### Phase 5 — Likes and Comments (Firestore)

> No new npm packages needed — `firebase-admin` v11 includes Firestore; `firebase` v12 already installed.

**`server/middleware/auth.ts`** — Whitelist GET likes for guests. Add to `PUBLIC_PATTERNS`:
```ts
/^\/api\/likes\/trip\/[^/]+$/,
```

**Create `server/api/likes/trip/[tripId].get.js`**:
```js
import { getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export default defineEventHandler(async (event) => {
  const tripId = getRouterParam(event, 'tripId')
  const db = getFirestore(getApp())
  const snap = await db.collection('likes').doc(tripId).collection('users').get()

  const comments = []
  const likedUserIds = []
  snap.forEach(doc => {
    likedUserIds.push(doc.id)
    const d = doc.data()
    if (d.comment) comments.push({ userId: doc.id, userName: d.userName, comment: d.comment, createdAt: d.createdAt })
  })
  return { count: snap.size, comments, likedUserIds }
})
```

**Create `server/api/likes/trip/[tripId].post.js`**:
```js
import { getApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export default defineEventHandler(async (event) => {
  const ctx = event.context.user
  if (!ctx?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const tripId = getRouterParam(event, 'tripId')
  const { comment } = await readBody(event)
  const db = getFirestore(getApp())

  await db.collection('likes').doc(tripId).collection('users').doc(ctx.uid).set({
    comment: comment?.trim() ?? '',
    userName: ctx.name ?? ctx.email ?? ctx.uid,
    createdAt: FieldValue.serverTimestamp(),
  })
  return { success: true }
})
```

**Create `server/api/likes/trip/[tripId].delete.js`**:
```js
import { getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export default defineEventHandler(async (event) => {
  const ctx = event.context.user
  if (!ctx?.uid) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const tripId = getRouterParam(event, 'tripId')
  await getFirestore(getApp()).collection('likes').doc(tripId).collection('users').doc(ctx.uid).delete()
  return { success: true }
})
```

**`app/pages/trips/[id].vue`** — Add likes section:
- State: `likes = ref({ count: 0, comments: [], likedUserIds: [] })`, `likeLoading`, `showComments`, `myLikeComment`
- `fetchLikes()`: `$fetch('/api/likes/trip/${id}')` — public, no token needed; call in `onMounted`
- `hasLiked` computed: `likes.value.likedUserIds.includes(user.value?.firebase_uid)`
- `toggleLike()`: guest → `/register`; else POST/DELETE via `apiFetch`, then `fetchLikes()`
- Template between trip header and reviews:
  - Like button (♡/♥ + count), comment input (when logged in + not owner + not yet liked), expandable comments list
  - Styling uses existing design vars (`--navy`, `--gold`, `--sand`, `--shadow`)

> **Firestore init note**: `getFirestore(getApp())` works because `auth.ts` middleware initializes the Firebase Admin app before any handler runs. No separate init file needed.

---

## Files Modified/Created

| File | Action |
|------|--------|
| `server/utils/db.js` | Add `date_from`, `date_to` to `plan_locations` CREATE TABLE |
| `server/api/locations/trip/[tripId].get.js` | Add date columns to SELECT |
| `server/api/locations/trip/[tripId].post.js` | Accept + insert `date_from`, `date_to` |
| `server/api/locations/[id].put.js` | Accept + update `date_from`, `date_to` |
| `app/components/LocationManager.vue` | Date inputs + Firebase Storage upload (replaces base64) |
| `nuxt.config.js` | Add `storageBucket` to Firebase public config |
| `.env.example` | Add `NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `app/composables/useStorage.js` | **CREATE** — Firebase Storage upload helper |
| `app/pages/profile.vue` | Switch avatar to Firebase Storage; add setup banner |
| `server/api/users/[id].patch.js` | Replace base64 size check with HTTPS URL validation |
| `app/composables/useAuth.js` | Add `authReady` ref; expose from composable |
| `app/middleware/auth.global.js` | **CREATE** — Nuxt global route guard |
| `app/pages/community.vue` | Remove auth gate; add debounced search bar |
| `app/pages/register.vue` | Profile setup redirect after Google sign-in |
| `server/api/trips/all.get.js` | Add `?q=` ILIKE search |
| `server/middleware/auth.ts` | Whitelist `GET /api/likes/trip/:tripId` |
| `server/api/likes/trip/[tripId].get.js` | **CREATE** — Firestore likes count + comments |
| `server/api/likes/trip/[tripId].post.js` | **CREATE** — Add like |
| `server/api/likes/trip/[tripId].delete.js` | **CREATE** — Remove like |
| `app/pages/trips/[id].vue` | Add likes section (button, count, comments) |

---

## Verification

1. **Location date range**: Create trip → add location with date range → verify dates saved and displayed in card
2. **Firebase Storage**: Upload avatar → verify `avatar_url` in DB is `https://firebasestorage...` not `data:`; repeat for location image
3. **Likes**: Go to another user's trip → like with comment → refresh → count = 1, comment shows; unlike → count = 0
4. **Route guards**: Log out → navigate to `/trips` → redirected to `/register`; sign in with Google (no name) → redirected to `/profile?setup=1`
5. **Search**: Open community page while logged out (should be accessible) → type "Paris" → results filter; clear → all trips return
