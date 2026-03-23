<script setup>
import { ref } from 'vue'
import TripForm from './components/TripForm.vue'
import TripList from './components/TripList.vue'

const refreshTrigger = ref(0)
const editingTrip = ref(null)

function onTripSaved() {
  refreshTrigger.value++
  editingTrip.value = null
}

function onEditTrip(trip) {
  editingTrip.value = trip
}

function onResetEdit() {
  editingTrip.value = null
}
</script>

<template>
  <header>
    <h1>Travel Manager</h1>
  </header>

  <main>
    <TripForm
      :editingTrip="editingTrip"
      @trip-saved="onTripSaved"
      @reset-edit="onResetEdit"
    />
    <TripList
      :refreshTrigger="refreshTrigger"
      @edit-trip="onEditTrip"
    />
  </main>
</template>

<style scoped>
header {
  background-color: #3498db;
  color: white;
  padding: 16px 24px;
  margin-bottom: 24px;
}

header h1 {
  margin: 0;
  font-size: 1.5rem;
}

main {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
</style>