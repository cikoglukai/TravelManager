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
          v-model="form.destination"
          type="text"
          placeholder="e.g. Norway"
          required
        />
      </div>
    </div>

    <div class="form-group half">
      <label for="start_date">Start Date *</label>
      <input id="start_date" v-model="form.start_date" type="date" required />
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
const { user } = useAuth()

const isEdit = computed(() => !!props.trip)
const error = ref('')
const loading = ref(false)

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
      result = await $fetch(`/api/trips/${props.trip.id}`, { method: 'PUT', body: { ...form } })
    } else {
      result = await $fetch('/api/trips', { method: 'POST', body: { ...form, user_id: user.value.id } })
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
