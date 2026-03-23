<template>
  <form class="trip-form" @submit.prevent="handleSubmit">
    <div class="form-group">
      <label for="title">Title *</label>
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
        v-model="form.destination"
        type="text"
        placeholder="e.g. Norway"
        required
      />
    </div>

    <div class="form-group">
      <label for="start_date">Start Date *</label>
      <input id="start_date" v-model="form.start_date" type="date" required />
    </div>

    <div class="form-group">
      <label for="short_description">
        Short Description *
        <!-- Live character counter; turns red when the 80-char limit is reached -->
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
      <!-- Cancel button is only shown in edit mode -->
      <button v-if="isEdit" type="button" class="btn btn-secondary" @click="$emit('cancelled')">
        Cancel
      </button>
    </div>
  </form>
</template>

<script setup>
// Props:
//   trip  — when provided, the form operates in edit mode and is pre-filled
// Emits:
//   saved(trip)   — emitted with the API response after a successful save
//   cancelled     — emitted when the user clicks Cancel in edit mode
const props = defineProps({
  trip: { type: Object, default: null },
})
const emit = defineEmits(['saved', 'cancelled'])

const { user } = useAuth()

// isEdit drives the label text ("Create Trip" vs "Update Trip") and the API method used
const isEdit = computed(() => !!props.trip)
const error = ref('')
const loading = ref(false)

// Pre-fill with the existing trip values in edit mode; empty strings for create mode
const form = reactive({
  title: props.trip?.title ?? '',
  destination: props.trip?.destination ?? '',
  start_date: props.trip?.start_date ?? '',
  short_description: props.trip?.short_description ?? '',
  detail_description: props.trip?.detail_description ?? '',
})

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    let result
    if (isEdit.value) {
      // Update existing trip — user_id is not sent because ownership doesn't change
      result = await $fetch(`/api/trips/${props.trip.id}`, {
        method: 'PUT',
        body: { ...form },
      })
    } else {
      // Create new trip — attach the logged-in user's id
      result = await $fetch('/api/trips', {
        method: 'POST',
        body: { ...form, user_id: user.value.id },
      })
    }
    // Pass the saved trip back to the parent (new.vue navigates; [id].vue updates in-place)
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
  background: #fff;
  padding: 28px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-weight: 600;
  color: #444;
  font-size: 0.9rem;
}
.char-count {
  font-weight: 400;
  color: #95a5a6;
  font-size: 0.85rem;
}
.char-count.exceeded {
  color: #e74c3c;
  font-weight: 600;
}
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.2s;
  resize: vertical;
}
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3498db;
}
.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
</style>