<template>
  <div class="lm-root">

    <!-- ── Section header ── -->
    <div class="lm-header">
      <div>
        <div class="lm-label">Locations</div>
        <p class="lm-subtitle">
          {{ locations.length ? `${locations.length} place${locations.length > 1 ? 's' : ''} added to this trip.` : 'Add the places you want to visit on this trip.' }}
        </p>
      </div>
      <button v-if="!showForm" class="btn btn-outline lm-add-btn" @click="openAddForm">
        + Add Location
      </button>
    </div>

    <!-- ── Add / Edit form ── -->
    <Transition name="form-slide">
      <div v-if="showForm" class="lm-form-card">
        <h4 class="lm-form-title">{{ editingId ? 'Edit Location' : 'New Location' }}</h4>

        <!-- Image area -->
        <div class="lm-image-area">
          <!-- Preview -->
          <div
            v-if="form.image_url"
            class="lm-image-preview"
            :style="{ backgroundImage: `url('${form.image_url}')` }"
          >
            <button class="lm-image-remove" @click="clearImage" title="Remove image">✕</button>
          </div>

          <!-- Upload drop zone (shown when no image) -->
          <div
            v-else
            class="lm-drop-zone"
            :class="{ 'lm-drop-zone--over': isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop.prevent="onDrop"
            @click="$refs.fileInput.click()"
          >
            <div class="lm-drop-icon">🖼</div>
            <p class="lm-drop-text">
              <strong>Click to upload</strong> or drag & drop<br />
              <span>JPG, PNG, WebP · max 5 MB</span>
            </p>
            <input
              ref="fileInput"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="lm-file-input"
              @change="onFileChange"
            />
          </div>

          <!-- URL input -->
          <div class="lm-url-row">
            <span class="lm-url-label">Or paste an image URL</span>
            <input
              v-model="urlInput"
              type="url"
              placeholder="https://example.com/photo.jpg"
              class="lm-url-input"
              @blur="applyUrl"
              @keydown.enter.prevent="applyUrl"
            />
          </div>

          <p v-if="imageError" class="lm-image-error">{{ imageError }}</p>
        </div>

        <!-- Fields -->
        <div class="lm-fields">
          <div class="lm-field">
            <label>Location Name <span class="lm-required">*</span></label>
            <input
              v-model="form.name"
              type="text"
              maxlength="120"
              placeholder="e.g. Schönbrunn Palace, Blue Lagoon, Eiffel Tower…"
              autofocus
            />
          </div>
          <div class="lm-field">
            <label>
              Description
              <span class="lm-char-count" :class="{ warn: form.description.length > 450 }">
                {{ form.description.length }}/500
              </span>
            </label>
            <textarea
              v-model="form.description"
              rows="3"
              maxlength="500"
              placeholder="What makes this place special? Opening hours, tips, must-sees…"
            ></textarea>
          </div>
          <div class="lm-field">
            <label>Visit Dates <span class="lm-hint">(optional)</span></label>
            <div class="lm-date-row">
              <input v-model="form.date_from" type="date" />
              <span class="lm-date-sep">→</span>
              <input v-model="form.date_to" type="date" :min="form.date_from || undefined" />
            </div>
          </div>
        </div>

        <p v-if="formError" class="lm-form-error">{{ formError }}</p>

        <div class="lm-form-actions">
          <button class="btn btn-secondary" @click="closeForm">Cancel</button>
          <button class="btn btn-gold" :disabled="saving || !form.name.trim()" @click="submit">
            {{ saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Location' }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- ── Locations grid ── -->
    <div v-if="loading" class="lm-loading">Loading locations…</div>

    <div v-else-if="locations.length" class="lm-grid">
      <div
        v-for="loc in locations"
        :key="loc.id"
        class="lm-card"
      >
        <!-- Image -->
        <div
          class="lm-card-image"
          :style="loc.image_url ? { backgroundImage: `url('${loc.image_url}')` } : {}"
          :class="{ 'lm-card-image--placeholder': !loc.image_url }"
        >
          <span v-if="!loc.image_url" class="lm-card-placeholder-letter">
            {{ loc.name.charAt(0).toUpperCase() }}
          </span>
          <!-- Action buttons overlay -->
          <div class="lm-card-actions">
            <button class="lm-action-btn" @click="startEdit(loc)" title="Edit">✏</button>
            <button class="lm-action-btn lm-action-btn--delete" @click="remove(loc)" title="Delete">🗑</button>
          </div>
        </div>

        <!-- Content -->
        <div class="lm-card-body">
          <h4 class="lm-card-name">{{ loc.name }}</h4>
          <p v-if="loc.description" class="lm-card-desc">{{ loc.description }}</p>
          <p v-else class="lm-card-desc lm-card-desc--empty">No description added.</p>
          <p v-if="loc.date_from || loc.date_to" class="lm-card-dates">
            📅 {{ loc.date_from ? formatDate(loc.date_from) : '—' }}{{ loc.date_to ? ' → ' + formatDate(loc.date_to) : '' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Empty state (no form open) -->
    <div v-else-if="!showForm" class="lm-empty">
      <div class="lm-empty-icon">📍</div>
      <p>No locations added yet.</p>
      <button class="btn btn-gold" @click="openAddForm">Add your first location</button>
    </div>

  </div>
</template>

<script setup>
const props = defineProps({
  tripId: { type: Number, required: true },
})
const { apiFetch } = useApiFetch()
const { uploadImage } = useImageUpload()

// ── State ─────────────────────────────────────────────────────────────────────
const locations  = ref([])
const loading    = ref(true)
const showForm   = ref(false)
const editingId  = ref(null)
const saving     = ref(false)
const formError  = ref('')
const imageError = ref('')
const isDragging = ref(false)
const urlInput   = ref('')
const fileInput  = ref(null)

const form = reactive({ name: '', description: '', image_url: '', date_from: '', date_to: '' })

// ── Load locations ────────────────────────────────────────────────────────────
onMounted(fetchLocations)

async function fetchLocations() {
  loading.value = true
  try {
    locations.value = await apiFetch(`/api/locations/trip/${props.tripId}`)
  } catch {
    locations.value = []
  } finally {
    loading.value = false
  }
}

// ── Form ─────────────────────────────────────────────────────────────────────
function openAddForm() {
  editingId.value     = null
  form.name           = ''
  form.description    = ''
  form.image_url      = ''
  form.date_from      = ''
  form.date_to        = ''
  urlInput.value      = ''
  formError.value     = ''
  imageError.value    = ''
  showForm.value      = true
}

function startEdit(loc) {
  editingId.value     = loc.id
  form.name           = loc.name
  form.description    = loc.description
  form.image_url      = loc.image_url
  form.date_from      = loc.date_from ? loc.date_from.slice(0, 10) : ''
  form.date_to        = loc.date_to   ? loc.date_to.slice(0, 10)   : ''
  urlInput.value      = loc.image_url.startsWith('http') ? loc.image_url : ''
  formError.value     = ''
  imageError.value    = ''
  showForm.value      = true
}

function closeForm() {
  showForm.value  = false
  editingId.value = null
}

// ── Image handling ────────────────────────────────────────────────────────────
async function onFileChange(e) {
  const file = e.target.files?.[0]
  if (file) await processFile(file)
}

async function onDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer.files?.[0]
  if (file) await processFile(file)
}

async function processFile(file) {
  imageError.value = ''
  if (!file.type.startsWith('image/')) {
    imageError.value = 'Only image files are accepted.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    imageError.value = 'Image must be under 5 MB.'
    return
  }
  try {
    const blob = await compressToBlob(file)
    const path = `locations/${props.tripId}/${Date.now()}.jpg`
    form.image_url = await uploadImage(blob, path)
    urlInput.value = ''
  } catch {
    imageError.value = 'Could not upload image. Please try another file.'
  }
}

function applyUrl() {
  const v = urlInput.value.trim()
  if (!v) return
  if (!v.startsWith('http://') && !v.startsWith('https://')) {
    imageError.value = 'Please enter a valid URL starting with http:// or https://'
    return
  }
  imageError.value   = ''
  form.image_url     = v
}

function clearImage() {
  form.image_url = ''
  urlInput.value = ''
  imageError.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function compressToBlob(file, maxWidth = 1400, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const img    = new Image()
    const objUrl = URL.createObjectURL(file)

    img.onload = () => {
      const scale  = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(objUrl)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('compression failed'))
      }, 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(objUrl); reject(new Error('load error')) }
    img.src     = objUrl
  })
}

// ── Submit ────────────────────────────────────────────────────────────────────
async function submit() {
  formError.value = ''
  if (!form.name.trim()) { formError.value = 'Name is required.'; return }

  if (form.date_from && form.date_to && form.date_to < form.date_from) {
    formError.value = '"To" date must be on or after "From" date.'
    return
  }

  saving.value = true
  try {
    const datePayload = {
      date_from: form.date_from || null,
      date_to:   form.date_to   || null,
    }
    if (editingId.value) {
      const updated = await apiFetch(`/api/locations/${editingId.value}`, {
        method: 'PUT',
        body: { name: form.name, description: form.description, image_url: form.image_url, ...datePayload },
      })
      const idx = locations.value.findIndex(l => l.id === editingId.value)
      if (idx !== -1) locations.value[idx] = updated
    } else {
      const created = await apiFetch(`/api/locations/trip/${props.tripId}`, {
        method: 'POST',
        body: { name: form.name, description: form.description, image_url: form.image_url, ...datePayload },
      })
      locations.value.push(created)
    }
    closeForm()
  } catch (err) {
    formError.value = err.data?.statusMessage || err.message || 'Something went wrong.'
  } finally {
    saving.value = false
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function remove(loc) {
  if (!confirm(`Remove "${loc.name}" from this trip?`)) return
  try {
    await apiFetch(`/api/locations/${loc.id}`, { method: 'DELETE' })
    locations.value = locations.value.filter(l => l.id !== loc.id)
    if (editingId.value === loc.id) closeForm()
  } catch (err) {
    alert(err.data?.statusMessage || 'Could not delete location.')
  }
}
</script>

<style scoped>
/* ── Root ── */
.lm-root { width: 100%; }

/* ── Header ── */
.lm-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.lm-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--gold);
  font-weight: 700;
  margin-bottom: 4px;
}
.lm-subtitle {
  color: var(--text-muted);
  font-size: 0.85rem;
}
.lm-add-btn { flex-shrink: 0; }

/* ── Form card ── */
.lm-form-card {
  background: var(--sand);
  border-radius: var(--radius);
  padding: 28px 28px 24px;
  margin-bottom: 28px;
  border: 1.5px solid rgba(201,168,76,0.3);
}
.lm-form-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 20px;
}

/* ── Image area ── */
.lm-image-area { margin-bottom: 20px; }

.lm-image-preview {
  width: 100%;
  height: 220px;
  background-size: cover;
  background-position: center;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
  margin-bottom: 10px;
}
.lm-image-remove {
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(15,31,61,0.75);
  border: none;
  color: #fff;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.lm-image-remove:hover { background: var(--error); }

.lm-drop-zone {
  width: 100%;
  border: 2px dashed rgba(15,31,61,0.2);
  border-radius: 10px;
  padding: 32px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  margin-bottom: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.lm-drop-zone:hover,
.lm-drop-zone--over {
  border-color: var(--gold);
  background: rgba(201,168,76,0.05);
}
.lm-drop-icon { font-size: 2rem; }
.lm-drop-text {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}
.lm-drop-text strong { color: var(--navy); }
.lm-drop-text span { font-size: 0.75rem; }
.lm-file-input { display: none; }

.lm-url-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.lm-url-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
}
.lm-url-input {
  flex: 1;
  min-width: 200px;
  padding: 8px 12px;
  border: 1.5px solid var(--sand-dark);
  border-radius: 8px;
  font-size: 0.85rem;
  font-family: inherit;
  background: var(--white);
  color: var(--text);
  transition: border-color 0.2s;
}
.lm-url-input:focus { outline: none; border-color: var(--gold); }

.lm-image-error {
  color: var(--error);
  font-size: 0.8rem;
  margin-top: 6px;
}

.lm-hint {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text-muted);
  font-size: 0.78rem;
}
.lm-date-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lm-date-row input {
  flex: 1;
}
.lm-date-sep {
  color: var(--text-muted);
  font-size: 0.85rem;
  flex-shrink: 0;
}

/* ── Fields ── */
.lm-fields { display: flex; flex-direction: column; gap: 16px; }
.lm-field {}
.lm-field label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.09em;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 7px;
}
.lm-required { color: var(--gold); font-size: 0.85rem; }
.lm-char-count {
  margin-left: auto;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--text-muted);
}
.lm-char-count.warn { color: var(--error); }
.lm-field input,
.lm-field textarea {
  width: 100%;
  padding: 11px 14px;
  border: 1.5px solid var(--sand-dark);
  border-radius: 9px;
  font-size: 0.92rem;
  font-family: inherit;
  background: var(--white);
  color: var(--text);
  resize: vertical;
  transition: border-color 0.2s;
}
.lm-field input:focus,
.lm-field textarea:focus { outline: none; border-color: var(--gold); }

.lm-form-error {
  color: var(--error);
  font-size: 0.82rem;
  background: var(--error-bg);
  border-left: 3px solid var(--error);
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 12px;
}
.lm-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--sand-dark);
}

/* ── Cards grid ── */
.lm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}
.lm-card {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  display: flex;
  flex-direction: column;
}
.lm-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

/* Card image */
.lm-card-image {
  width: 100%;
  height: 200px;
  background-size: cover;
  background-position: center;
  position: relative;
  flex-shrink: 0;
}
.lm-card-image--placeholder {
  background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.lm-card-placeholder-letter {
  font-family: 'Playfair Display', serif;
  font-size: 4rem;
  font-weight: 700;
  color: rgba(201,168,76,0.5);
  user-select: none;
}

/* Action buttons — visible on hover */
.lm-card-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}
.lm-card:hover .lm-card-actions { opacity: 1; }
.lm-action-btn {
  background: rgba(15,31,61,0.78);
  backdrop-filter: blur(4px);
  border: none;
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.lm-action-btn:hover { background: rgba(201,168,76,0.9); color: var(--navy); }
.lm-action-btn--delete:hover { background: var(--error); color: #fff; }

/* Card body */
.lm-card-body {
  padding: 18px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lm-card-name {
  font-family: 'Playfair Display', serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--navy);
  line-height: 1.2;
}
.lm-card-desc {
  color: var(--text-muted);
  font-size: 0.82rem;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.lm-card-desc--empty { font-style: italic; }
.lm-card-dates {
  color: var(--text-muted);
  font-size: 0.76rem;
  margin-top: 2px;
}

/* ── Empty state ── */
.lm-loading,
.lm-empty {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
  font-size: 0.9rem;
}
.lm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.lm-empty-icon { font-size: 2.2rem; }

/* ── Form slide transition ── */
.form-slide-enter-active,
.form-slide-leave-active {
  transition: all 0.28s ease;
  overflow: hidden;
}
.form-slide-enter-from,
.form-slide-leave-to {
  opacity: 0;
  transform: translateY(-12px);
  max-height: 0;
}
.form-slide-enter-to,
.form-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 1000px;
}

@media (max-width: 600px) {
  .lm-grid { grid-template-columns: 1fr; }
  .lm-form-card { padding: 20px 16px; }
}
</style>
