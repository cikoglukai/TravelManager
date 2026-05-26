<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h2>New Trip</h2>
      <NuxtLink to="/trips" class="btn-back">← My Trips</NuxtLink>
    </div>

    <!-- Chooser: pick a creation path -->
    <div v-if="mode === null" class="chooser-grid">
      <button class="chooser-card" @click="mode = 'own'">
        <div class="chooser-icon">✍️</div>
        <h3>Create my own trip</h3>
        <p>
          Plan a trip from scratch — fill in your destination, transport and
          accommodation manually. Perfect for trips off the beaten path.
        </p>
        <span class="chooser-cta">Start blank →</span>
      </button>

      <button class="chooser-card" @click="goToGlobe">
        <div class="chooser-icon">🌍</div>
        <h3>Pick from the globe</h3>
        <p>
          Choose one of our curated European destinations with suggested
          routes, transport and accommodation already prepared.
        </p>
        <span class="chooser-cta">Open globe →</span>
      </button>
    </div>

    <!-- Own-trip form -->
    <div v-else>
      <button class="btn-back chooser-back" @click="mode = null">← Choose different option</button>
      <TripForm @saved="onSaved" />
    </div>
  </div>
</template>

<script setup>
const { user, waitAuthReady } = useAuth()
const router = useRouter()

const mode = ref(null)   // null | 'own'

onMounted(async () => {
  await waitAuthReady()
  if (!user.value) navigateTo('/register')
})

function goToGlobe() {
  router.push('/explore')
}

function onSaved(trip) {
  navigateTo(`/plan/${trip.id}?mode=custom`)
}
</script>

<style scoped>
.chooser-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
  margin-top: 8px;
}

.chooser-card {
  background: var(--white);
  border: 2px solid transparent;
  border-radius: var(--radius);
  padding: 36px 32px;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  box-shadow: var(--shadow);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chooser-card {
  animation: cardIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.chooser-card:nth-child(1) { animation-delay: 0.04s; }
.chooser-card:nth-child(2) { animation-delay: 0.12s; }
@keyframes cardIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: none; }
}

.chooser-card:hover {
  transform: translateY(-3px);
  border-color: var(--gold);
  box-shadow: var(--shadow-lg);
}
.chooser-card:active { transform: translateY(-1px) scale(0.99); }
@media (prefers-reduced-motion: reduce) {
  .chooser-card { animation: none; }
  .chooser-card:hover, .chooser-card:active { transform: none; }
}

.chooser-icon {
  font-size: 2.6rem;
}

.chooser-card h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.4rem;
  color: var(--navy);
  font-weight: 700;
  line-height: 1.2;
}

.chooser-card p {
  color: var(--text-muted);
  font-size: 0.92rem;
  line-height: 1.6;
  flex: 1;
}

.chooser-cta {
  color: var(--gold);
  font-weight: 700;
  font-size: 0.9rem;
  margin-top: 6px;
}

.chooser-back {
  margin-bottom: 18px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
}
</style>
