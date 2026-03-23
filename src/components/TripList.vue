<template>
  <div class="trip-list">
    <h2>Your Trips</h2>
    <div v-if="loading">Loading trips...</div>
    <div v-else-if="trips.length === 0">
      <p>No trips yet. Add your first trip!</p>
    </div>
    <div v-else>
      <div v-for="trip in trips" :key="trip.id" class="trip-item">
        <div class="trip-info">
          <h3>{{ trip.destination }}</h3>
          <div class="trip-dates">
            📅 {{ formatDate(trip.start_date) }} → {{ formatDate(trip.end_date) }}
          </div>
          <div v-if="trip.notes" class="trip-notes">📝 {{ trip.notes }}</div>
        </div>
        <div class="trip-actions">
          <button class="edit" @click="$emit('edit-trip', trip)">Edit</button>
          <button class="delete" @click="confirmDelete(trip.id)">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getTrips, deleteTrip } from '../api'

const props = defineProps({
  refreshTrigger: Number, // used to reload list after changes
})
const emit = defineEmits(['edit-trip'])

const trips = ref([])
const loading = ref(true)

async function fetchTrips() {
  loading.value = true
  try {
    trips.value = await getTrips()
  } catch (err) {
    console.error(err)
    trips.value = []
  } finally {
    loading.value = false
  }
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString()
}

async function confirmDelete(id) {
  if (!confirm('Are you sure you want to delete this trip?')) return
  try {
    await deleteTrip(id)
    fetchTrips()
  } catch (err) {
    console.error(err)
    alert(err.message)
  }
}

onMounted(fetchTrips)

// Reload when refreshTrigger changes (e.g., after save)
import { watch } from 'vue'
watch(() => props.refreshTrigger, fetchTrips)
</script>

<style scoped>
.trip-list {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}
.trip-item {
  background-color: #f9f9f9;
  border-left: 4px solid #3498db;
  margin-bottom: 15px;
  padding: 15px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
}
.trip-info {
  flex: 1;
}
.trip-info h3 {
  margin-bottom: 8px;
  color: #2c3e50;
}
.trip-dates {
  color: #7f8c8d;
  font-size: 0.9rem;
  margin-bottom: 5px;
}
.trip-notes {
  color: #555;
  font-style: italic;
  margin-top: 5px;
}
.trip-actions {
  display: flex;
  gap: 5px;
}
button.edit {
  background-color: #f39c12;
  margin-right: 5px;
}
button.edit:hover {
  background-color: #e67e22;
}
button.delete {
  background-color: #e74c3c;
}
button.delete:hover {
  background-color: #c0392b;
}
@media (max-width: 768px) {
  .trip-item {
    flex-direction: column;
  }
  .trip-actions {
    margin-top: 10px;
  }
}
</style>