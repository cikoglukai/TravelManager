<template>
  <div class="trip-form">
    <h2>{{ editingId ? 'Edit Trip' : 'Add New Trip' }}</h2>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="destination">Destination *</label>
        <input type="text" id="destination" v-model="form.destination" required />
      </div>
      <div class="form-group">
        <label for="start-date">Start Date *</label>
        <input type="date" id="start-date" v-model="form.start_date" required />
      </div>
      <div class="form-group">
        <label for="end-date">End Date *</label>
        <input type="date" id="end-date" v-model="form.end_date" required />
      </div>
      <div class="form-group">
        <label for="notes">Notes</label>
        <textarea id="notes" v-model="form.notes" rows="3"></textarea>
      </div>
      <div class="form-actions">
        <button type="submit">{{ editingId ? 'Update Trip' : 'Add Trip' }}</button>
        <button type="button" class="cancel" @click="resetForm" v-if="editingId">
          Cancel
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { createTrip, updateTrip } from '../api'

const props = defineProps({
  editingTrip: {
    type: Object,
    default: null,
  },
})
const emit = defineEmits(['trip-saved', 'reset-edit'])

const form = reactive({
  destination: '',
  start_date: '',
  end_date: '',
  notes: '',
})
const editingId = ref(null)

watch(
  () => props.editingTrip,
  (trip) => {
    if (trip) {
      editingId.value = trip.id
      form.destination = trip.destination
      form.start_date = trip.start_date
      form.end_date = trip.end_date
      form.notes = trip.notes || ''
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

async function handleSubmit() {
  if (!form.destination || !form.start_date || !form.end_date) {
    alert('Please fill in all required fields.')
    return
  }
  try {
    if (editingId.value) {
      await updateTrip(editingId.value, { ...form })
    } else {
      await createTrip({ ...form })
    }
    emit('trip-saved')
    resetForm()
  } catch (err) {
    console.error(err)
    alert(err.message)
  }
}

function resetForm() {
  editingId.value = null
  form.destination = ''
  form.start_date = ''
  form.end_date = ''
  form.notes = ''
  emit('reset-edit')
}
</script>

<style scoped>
.trip-form {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.form-group {
  margin-bottom: 15px;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 1rem;
}
.form-actions {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}
button {
  background-color: #3498db;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}
button:hover {
  background-color: #2980b9;
}
button.cancel {
  background-color: #95a5a6;
}
button.cancel:hover {
  background-color: #7f8c8d;
}
</style>