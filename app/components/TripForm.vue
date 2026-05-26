<template>
  <form class="trip-form" @submit.prevent="handleSubmit">
    <div class="form-row">
      <div class="form-group">
        <label for="title">Trip Title *</label>
        <input
          id="title"
          v-model="form.title"
          type="text"
          placeholder='e.g. "Family Trip to Norway"'
          required
        />
      </div>
      <div class="form-group">
        <label for="destination">Destination *</label>
        <input
          id="destination"
          ref="destinationInput"
          v-model="form.destination"
          type="text"
          placeholder="Start typing a city…"
          autocomplete="off"
          required
        />
      </div>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label for="origin">Origin City</label>
        <input
          id="origin"
          ref="originInput"
          v-model="form.origin"
          type="text"
          placeholder="Start typing a city… — used for real flights & buses"
          autocomplete="off"
        />
      </div>
      <div class="form-group">
        <label for="start_date">Start Date *</label>
        <input id="start_date" v-model="form.start_date" type="date" required />
      </div>
    </div>

    <div class="form-group">
      <label for="short_description">
        Short Description *
        <span class="char-count" :class="{ exceeded: form.short_description.length > 80 }">
          {{ form.short_description.length }}/80
        </span>
      </label>
      <input
        id="short_description"
        v-model="form.short_description"
        type="text"
        maxlength="80"
        placeholder='e.g. "Explore the fjords of southern Norway."'
        required
      />
    </div>

    <div class="form-group">
      <label for="detail_description">Detailed Description</label>
      <textarea
        id="detail_description"
        v-model="form.detail_description"
        rows="7"
        placeholder="Full trip details, transport, accommodation, itinerary…"
      ></textarea>
    </div>

    <div class="form-error" v-if="error">{{ error }}</div>

    <div class="form-actions">
      <button type="submit" class="btn btn-primary" :disabled="loading">
        {{ loading ? 'Saving…' : (isEdit ? 'Update Trip' : 'Create Trip') }}
      </button>
      <button v-if="isEdit" type="button" class="btn btn-secondary" @click="$emit('cancelled')">
        Cancel
      </button>
    </div>
  </form>
</template>

<script setup>
const props = defineProps({ trip: { type: Object, default: null } })
const emit = defineEmits(['saved', 'cancelled'])
const { apiFetch } = useApiFetch()

const isEdit = computed(() => !!props.trip)
const error = ref('')
const loading = ref(false)

const form = reactive({
  title: props.trip?.title ?? '',
  destination: props.trip?.destination ?? '',
  origin: props.trip?.origin ?? '',
  start_date: props.trip?.start_date ?? '',
  short_description: props.trip?.short_description ?? '',
  detail_description: props.trip?.detail_description ?? '',
  // Coords captured when a place is picked from the autocomplete. Sent to the
  // API so the server trusts the chosen point instead of re-geocoding text.
  dest_lat: props.trip?.dest_lat ?? null,
  dest_lng: props.trip?.dest_lng ?? null,
})

// City-only autocomplete on destination + origin: only real places selectable.
const destinationInput = ref(null)
const originInput = ref(null)

let pickedDestination = props.trip?.destination ?? ''
usePlacesAutocomplete(destinationInput, {
  types: ['(cities)'],
  onSelect: ({ name, lat, lng }) => {
    form.destination = name
    form.dest_lat = lat
    form.dest_lng = lng
    pickedDestination = name
  },
})
usePlacesAutocomplete(originInput, {
  types: ['(cities)'],
  onSelect: ({ name }) => { form.origin = name },
})

// Typing after a pick invalidates the captured coords — let the server
// re-geocode rather than pin a stale point. Skips the change made by onSelect.
watch(() => form.destination, (val) => {
  if (val !== pickedDestination) { form.dest_lat = null; form.dest_lng = null }
})

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    let result
    if (isEdit.value) {
      result = await apiFetch(`/api/trips/${props.trip.id}`, { method: 'PUT', body: { ...form } })
    } else {
      result = await apiFetch('/api/trips', { method: 'POST', body: { ...form } })
    }
    emit('saved', result)
  } catch (err) {
    error.value = err.data?.statusMessage || err.message || 'An error occurred'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.trip-form {
  background: var(--white);
  padding: 36px;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  animation: formIn 0.32s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
@keyframes formIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .trip-form { animation: none; }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
@media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } }

.form-group {
  margin-bottom: 22px;
}
.form-group.half {
  max-width: 280px;
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
  letter-spacing: 0.07em;
}
.char-count {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 0.8rem;
  text-transform: none;
  letter-spacing: 0;
  margin-left: auto;
}
.char-count.exceeded { color: var(--error); font-weight: 600; }

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid var(--sand-dark);
  border-radius: 10px;
  font-size: 0.95rem;
  font-family: inherit;
  background: var(--sand);
  color: var(--text);
  transition: border-color 0.2s, background 0.2s;
  resize: vertical;
}
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--gold);
  background: var(--white);
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
</style>
