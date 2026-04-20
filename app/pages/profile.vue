<template>
  <div class="page-wrapper">
    <div class="page-header">
      <NuxtLink to="/trips" class="btn btn-back">← My Trips</NuxtLink>
    </div>

    <div v-if="pending" class="loading">Loading profile…</div>

    <template v-else-if="profile">
      <!-- ── Profile card ── -->
      <div class="profile-card">

        <!-- Hero -->
        <div class="profile-hero">
          <div class="profile-hero-bg"></div>
          <div class="profile-hero-content">

            <!-- Avatar with upload overlay -->
            <div class="avatar-wrapper" @click="triggerAvatarPick" :title="'Change profile photo'">
              <img
                v-if="profile.avatar_url"
                :src="profile.avatar_url"
                class="profile-avatar profile-avatar-img"
                alt="Profile photo"
              />
              <div
                v-else
                class="profile-avatar"
                :style="{ background: avatarGradient }"
              >
                {{ profile.name.charAt(0).toUpperCase() }}
              </div>
              <div class="avatar-overlay">
                <span v-if="avatarUploading" class="avatar-overlay-spinner">⏳</span>
                <span v-else class="avatar-overlay-icon">📷</span>
              </div>
            </div>
            <input
              ref="avatarInput"
              type="file"
              accept="image/*"
              style="display:none"
              @change="onAvatarFileChange"
            />

            <div class="profile-meta" v-if="!editing">
              <h1 class="profile-name">{{ profile.name }}</h1>
              <p class="profile-email">{{ profile.email }}</p>
              <p class="profile-location" v-if="profile.home_city">
                <span class="location-icon">📍</span> {{ profile.home_city }}
              </p>
              <p class="profile-since">Member since {{ memberSince }}</p>
            </div>

            <div class="profile-hero-actions" v-if="!editing">
              <div v-if="avatarError" class="avatar-error">{{ avatarError }}</div>
              <button class="btn btn-edit-profile" @click="startEdit">
                Edit Profile
              </button>
              <button
                v-if="profile.avatar_url"
                class="btn btn-remove-avatar"
                @click.stop="removeAvatar"
                :disabled="avatarUploading"
                title="Remove profile photo"
              >
                ✕ Remove Photo
              </button>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="profile-stats">
          <div class="stat-item">
            <span class="stat-value">{{ trips.length }}</span>
            <span class="stat-label">{{ trips.length === 1 ? 'Trip' : 'Trips' }}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ uniqueDestinations }}</span>
            <span class="stat-label">{{ uniqueDestinations === 1 ? 'Destination' : 'Destinations' }}</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ memberYear }}</span>
            <span class="stat-label">Member Since</span>
          </div>
        </div>

        <!-- View mode: bio -->
        <div class="profile-body" v-if="!editing">
          <div class="profile-section">
            <h3 class="section-label">About Me</h3>
            <p v-if="profile.bio" class="profile-bio">{{ profile.bio }}</p>
            <p v-else class="profile-bio-empty">
              No bio yet —
              <button class="inline-link" @click="startEdit">add one to your profile.</button>
            </p>
          </div>
        </div>

        <!-- Edit mode -->
        <form v-else @submit.prevent="saveProfile" class="profile-edit-form">
          <div class="edit-form-grid">
            <div class="form-group">
              <label for="pf-name">Name <span class="required">*</span></label>
              <input
                id="pf-name"
                v-model="form.name"
                type="text"
                maxlength="100"
                required
                autofocus
                placeholder="Your full name"
              />
            </div>

            <div class="form-group">
              <label for="pf-city">Home City</label>
              <input
                id="pf-city"
                v-model="form.home_city"
                type="text"
                maxlength="100"
                placeholder="e.g. Vienna, Austria"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="pf-bio">
              About Me
              <span class="char-count" :class="{ warn: form.bio.length > 450 }">
                {{ form.bio.length }}/500
              </span>
            </label>
            <textarea
              id="pf-bio"
              v-model="form.bio"
              rows="5"
              maxlength="500"
              placeholder="Tell us about yourself and your passion for travel…"
            ></textarea>
          </div>

          <div class="form-error" v-if="saveError">{{ saveError }}</div>

          <div class="edit-actions">
            <button type="button" class="btn btn-secondary" @click="cancelEdit">
              Cancel
            </button>
            <button type="submit" class="btn btn-gold" :disabled="saving">
              {{ saving ? 'Saving…' : 'Save Changes' }}
            </button>
          </div>
        </form>

      </div><!-- /.profile-card -->
    </template>
  </div>
</template>

<script setup>
const { user, setUser } = useAuth()

// Guard: redirect to register if not logged in
onMounted(() => {
  if (!user.value) navigateTo('/register')
})

// ── Data fetching ────────────────────────────────────────────────────────────

const [{ data: profile, pending }, { data: trips }] = await Promise.all([
  useFetch(() => `/api/users/${user.value?.id}`, { key: 'profile' }),
  useFetch(() => `/api/trips?userId=${user.value?.id}`, { key: 'profile-trips' }),
])

// Ensure arrays / objects even while loading
const safeTrips = computed(() => trips.value ?? [])

// ── Computed display values ──────────────────────────────────────────────────

const uniqueDestinations = computed(() => {
  const dests = safeTrips.value.map(t => t.destination.toLowerCase().trim())
  return new Set(dests).size
})

const memberSince = computed(() => {
  if (!profile.value?.created_at) return ''
  return new Date(profile.value.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
})

const memberYear = computed(() => {
  if (!profile.value?.created_at) return ''
  return new Date(profile.value.created_at).getFullYear()
})

// Deterministic gradient from name — keeps avatars consistent across sessions
const avatarGradient = computed(() => {
  const palettes = [
    ['#1a3260', '#c9a84c'],
    ['#2d6a4f', '#b7e4c7'],
    ['#6a1a4f', '#f4accd'],
    ['#1a4a6a', '#a8d8ea'],
    ['#4a3728', '#d4a26a'],
    ['#2d3561', '#a8d8ea'],
  ]
  const name = profile.value?.name ?? 'A'
  const idx = name.charCodeAt(0) % palettes.length
  const [from, to] = palettes[idx]
  return `linear-gradient(135deg, ${from}, ${to})`
})

// ── Avatar upload ────────────────────────────────────────────────────────────

const avatarInput    = ref(null)
const avatarUploading = ref(false)
const avatarError    = ref('')

function triggerAvatarPick() {
  if (avatarUploading.value) return
  avatarError.value = ''
  avatarInput.value?.click()
}

async function onAvatarFileChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''          // reset so same file can be re-picked
  if (!file) return
  if (!file.type.startsWith('image/')) {
    avatarError.value = 'Please select an image file.'
    return
  }
  avatarUploading.value = true
  avatarError.value = ''
  try {
    const dataUrl = await compressAvatar(file)
    await uploadAvatar(dataUrl)
  } catch (err) {
    avatarError.value = err.data?.statusMessage || err.message || 'Upload failed.'
  } finally {
    avatarUploading.value = false
  }
}

async function removeAvatar() {
  avatarUploading.value = true
  avatarError.value = ''
  try {
    await uploadAvatar('')
  } catch (err) {
    avatarError.value = err.data?.statusMessage || err.message || 'Could not remove photo.'
  } finally {
    avatarUploading.value = false
  }
}

async function uploadAvatar(dataUrl) {
  const updated = await $fetch(`/api/users/${user.value.id}`, {
    method: 'PATCH',
    body: { avatar_url: dataUrl },
  })
  setUser(updated)
  Object.assign(profile.value, updated)
}

// Compress image to square-ish JPEG, max 320 px side, quality 0.82
function compressAvatar(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 320
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image.')) }
    img.src = url
  })
}

// ── Edit mode ────────────────────────────────────────────────────────────────

const editing = ref(false)
const saving  = ref(false)
const saveError = ref('')

const form = reactive({ name: '', bio: '', home_city: '' })

function startEdit() {
  form.name      = profile.value.name
  form.bio       = profile.value.bio ?? ''
  form.home_city = profile.value.home_city ?? ''
  saveError.value = ''
  editing.value  = true
}

function cancelEdit() {
  editing.value  = false
  saveError.value = ''
}

async function saveProfile() {
  saveError.value = ''
  saving.value    = true
  try {
    const updated = await $fetch(`/api/users/${user.value.id}`, {
      method: 'PUT',
      body: { name: form.name, bio: form.bio, home_city: form.home_city },
    })
    // Reflect changes in global auth state + localStorage
    setUser(updated)
    // Update the local reactive profile without a full re-fetch
    Object.assign(profile.value, updated)
    editing.value = false
  } catch (err) {
    saveError.value = err.data?.statusMessage || err.message || 'Something went wrong'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* ── Card ── */
.profile-card {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

/* ── Hero ── */
.profile-hero {
  position: relative;
  padding: 0;
}
.profile-hero-bg {
  height: 120px;
  background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%);
  position: relative;
  overflow: hidden;
}
.profile-hero-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a84c' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}
.profile-hero-content {
  display: flex;
  align-items: flex-end;
  gap: 24px;
  padding: 0 40px 32px;
  position: relative;
  margin-top: -48px;
  flex-wrap: wrap;
}

/* ── Avatar upload ── */
.avatar-wrapper {
  position: relative;
  width: 96px;
  height: 96px;
  flex-shrink: 0;
  cursor: pointer;
  border-radius: 50%;
}
.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

.profile-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 4px solid var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Playfair Display', serif;
  font-size: 2.6rem;
  font-weight: 700;
  color: var(--white);
  flex-shrink: 0;
  box-shadow: 0 4px 16px rgba(15,31,61,0.2);
}
.profile-avatar-img {
  object-fit: cover;
  display: block;
}

.avatar-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(15,31,61,0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  border: 4px solid var(--white);
}
.avatar-overlay-icon {
  font-size: 1.6rem;
  filter: drop-shadow(0 1px 3px rgba(0,0,0,0.5));
}
.avatar-overlay-spinner {
  font-size: 1.4rem;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.profile-hero-actions {
  margin-left: auto;
  margin-top: 52px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.avatar-error {
  font-size: 0.78rem;
  color: var(--error);
  text-align: right;
  max-width: 180px;
}
.btn-remove-avatar {
  padding: 6px 14px;
  background: none;
  border: 1.5px solid rgba(200,50,50,0.4);
  color: #c83232;
  border-radius: 100px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
}
.btn-remove-avatar:hover {
  background: #c83232;
  color: var(--white);
  border-color: #c83232;
}

.profile-meta {
  flex: 1;
  min-width: 0;
  padding-top: 52px;
}
.profile-name {
  font-family: 'Playfair Display', serif;
  font-size: 1.8rem;
  color: var(--navy);
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 4px;
}
.profile-email {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 4px;
}
.profile-location {
  color: var(--navy);
  font-size: 0.88rem;
  font-weight: 500;
  margin-bottom: 4px;
}
.location-icon { margin-right: 2px; }

.profile-since {
  color: var(--text-muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.btn-edit-profile {
  padding: 9px 22px;
  background: none;
  border: 1.5px solid var(--navy);
  color: var(--navy);
  border-radius: 100px;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
}
.btn-edit-profile:hover {
  background: var(--navy);
  color: var(--white);
}

/* ── Stats ── */
.profile-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  border-top: 1px solid var(--sand-dark);
  border-bottom: 1px solid var(--sand-dark);
  padding: 24px 40px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}
.stat-value {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--navy);
  line-height: 1;
}
.stat-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  font-weight: 500;
}
.stat-divider {
  width: 1px;
  height: 48px;
  background: var(--sand-dark);
  flex-shrink: 0;
}

/* ── Body / bio ── */
.profile-body {
  padding: 36px 40px;
}
.profile-section {
  margin-bottom: 0;
}
.section-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--gold);
  font-weight: 600;
  margin-bottom: 12px;
}
.profile-bio {
  color: var(--text);
  line-height: 1.8;
  white-space: pre-wrap;
  font-size: 0.95rem;
}
.profile-bio-empty {
  color: var(--text-muted);
  font-size: 0.9rem;
  font-style: italic;
}
.inline-link {
  background: none;
  border: none;
  padding: 0;
  color: var(--gold);
  font-weight: 600;
  font-size: inherit;
  font-family: inherit;
  cursor: pointer;
  text-decoration: underline;
  font-style: normal;
}
.inline-link:hover { color: var(--navy); }

/* ── Edit form ── */
.profile-edit-form {
  padding: 36px 40px;
  border-top: 1px solid var(--sand-dark);
}
.edit-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 24px;
}

.form-group {
  margin-bottom: 22px;
}
.form-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--navy);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.required { color: var(--gold); }

.char-count {
  margin-left: auto;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  font-size: 0.78rem;
  color: var(--text-muted);
}
.char-count.warn { color: var(--error); }

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 13px 16px;
  border: 2px solid var(--sand-dark);
  border-radius: 10px;
  font-size: 0.95rem;
  font-family: inherit;
  background: var(--sand);
  color: var(--text);
  transition: border-color 0.2s, background 0.2s;
  resize: none;
}
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--gold);
  background: var(--white);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--sand-dark);
  margin-top: 4px;
}

@media (max-width: 600px) {
  .profile-hero-content { padding: 0 20px 28px; gap: 16px; }
  .profile-body,
  .profile-edit-form { padding: 28px 20px; }
  .profile-stats { padding: 20px; }
  .edit-form-grid { grid-template-columns: 1fr; gap: 0; }
  .profile-hero-actions { margin-top: 0; align-items: flex-start; }
  .btn-edit-profile { width: 100%; justify-content: center; }
  .profile-meta { padding-top: 8px; }
}
</style>
