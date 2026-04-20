<template>
  <div class="page-wrapper">
    <div class="page-header">
      <NuxtLink :to="isOwner ? '/trips' : '/community'" class="btn-back">
        {{ isOwner ? '← My Trips' : '← Community' }}
      </NuxtLink>
      <div v-if="trip && !editing && isOwner" class="detail-actions">
        <button class="btn btn-outline" @click="editing = true">Edit Trip</button>
        <button class="btn btn-danger" @click="deleteTrip" :disabled="deleting">
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <span class="loading-spinner">✈</span>
      <p>Loading trip…</p>
    </div>

    <div v-else-if="editing && isOwner">
      <TripForm :trip="trip" @saved="onSaved" @cancelled="editing = false" />
    </div>

    <div v-else-if="trip">
      <div class="trip-detail">
        <div class="trip-detail-header">
          <h1>{{ trip.title }}</h1>
          <div class="trip-detail-meta">
            <span class="badge badge-dest">📍 {{ trip.destination }}</span>
            <span class="badge badge-date">📅 {{ formatDate(trip.start_date) }}</span>
          </div>
        </div>

        <div class="trip-divider"></div>

        <div class="trip-section">
          <h3>Summary</h3>
          <p>{{ trip.short_description }}</p>
        </div>

        <div class="trip-section" v-if="trip.detail_description">
          <h3>Details</h3>
          <p>{{ trip.detail_description }}</p>
        </div>
      </div>

      <!-- ── Reviews section ── -->
      <div class="reviews-section">
        <h2 class="reviews-title">Reviews</h2>

        <!-- Write / edit review (only for non-owners) -->
        <div v-if="user && trip.user_id !== user.id" class="review-form-card">
          <h3>{{ myReview ? 'Edit your review' : 'Leave a review' }}</h3>
          <div class="star-picker">
            <button
              v-for="n in 5" :key="n"
              class="star-btn"
              :class="{ active: n <= formStars }"
              @click="formStars = n"
            >★</button>
          </div>
          <textarea
            v-model="formComment"
            class="review-textarea"
            placeholder="Share your thoughts about this trip… (optional)"
            rows="3"
          />
          <div class="review-form-actions">
            <button class="btn btn-gold btn-sm" @click="submitReview" :disabled="!formStars || submitting">
              {{ submitting ? 'Saving…' : myReview ? 'Update' : 'Submit' }}
            </button>
            <button v-if="myReview" class="btn-delete-plan" @click="deleteMyReview" :disabled="submitting">
              Delete review
            </button>
          </div>
        </div>

        <!-- Existing reviews -->
        <div v-if="reviews.length" class="reviews-list">
          <div v-for="r in reviews" :key="r.id" class="review-card">
            <div class="review-header">
              <span class="review-avatar">{{ r.reviewer_name.charAt(0).toUpperCase() }}</span>
              <div>
                <span class="review-name">{{ r.reviewer_name }}</span>
                <span class="review-date">{{ formatDate(r.created_at) }}</span>
              </div>
              <div class="review-stars">
                <span v-for="n in 5" :key="n" :class="n <= r.stars ? 'star-on' : 'star-off'">★</span>
              </div>
            </div>
            <p v-if="r.comment" class="review-comment">{{ r.comment }}</p>
          </div>
        </div>
        <p v-else class="reviews-empty">No reviews yet. Be the first to share your thoughts!</p>
      </div>

      <!-- ── Travel Plan section ── -->
      <div class="plan-section">
        <div class="plan-section-header">
          <div>
            <h2 class="plan-section-title">Travel Plan</h2>
            <p class="plan-section-sub">
              {{ travelPlan ? 'Your selected route, transport and accommodation.' : 'Plan your transport and accommodation for this trip.' }}
            </p>
          </div>
          <div class="plan-header-actions">
            <NuxtLink v-if="travelPlan" :to="`/plan-view/${trip.id}`" class="btn btn-gold">
              View Full Plan →
            </NuxtLink>
            <NuxtLink v-if="isOwner" :to="`/plan/${trip.id}`" class="btn btn-outline">
              {{ travelPlan ? '✏ Edit' : '+ Create Plan' }}
            </NuxtLink>
          </div>
        </div>

        <!-- Plan summary card -->
        <div v-if="travelPlan" class="plan-summary">
          <!-- Status banner -->
          <div class="plan-status-banner">
            <span class="plan-status-dot"></span>
            Plan complete — {{ travelPlan.emoji }} {{ travelPlan.country }} · {{ travelPlan.route_name }} · {{ travelPlan.duration_days }} days
          </div>

          <div class="plan-summary-grid">
            <div class="plan-summary-item">
              <span class="psi-label">Destination</span>
              <span class="psi-value">{{ travelPlan.emoji }} {{ travelPlan.country }}</span>
              <span class="psi-sub">{{ travelPlan.city }}</span>
            </div>
            <div class="plan-summary-item">
              <span class="psi-label">Route</span>
              <span class="psi-value">{{ travelPlan.route_name }}</span>
              <span class="psi-sub">{{ travelPlan.duration_days }} days</span>
            </div>
            <div class="plan-summary-item">
              <span class="psi-label">Transport</span>
              <span class="psi-value">{{ transportIcon(travelPlan.transport_type) }} {{ travelPlan.provider }}</span>
              <span class="psi-sub">{{ travelPlan.transport_duration }} · From €{{ travelPlan.price_from }}</span>
            </div>
            <div class="plan-summary-item">
              <span class="psi-label">Accommodation</span>
              <span class="psi-value">{{ accommodationIcon(travelPlan.accommodation_type) }} {{ travelPlan.accommodation_name }}</span>
              <span class="psi-sub">€{{ travelPlan.price_per_night }}/night · ★ {{ travelPlan.rating }}</span>
            </div>
          </div>

          <div class="plan-summary-actions">
            <NuxtLink :to="`/plan-view/${trip.id}`" class="btn btn-gold btn-sm">
              View Full Overview →
            </NuxtLink>
            <button v-if="isOwner" class="btn-delete-plan" @click="deletePlan" :disabled="deletingPlan">
              {{ deletingPlan ? 'Removing…' : 'Remove Plan' }}
            </button>
          </div>
        </div>

        <!-- No plan yet -->
        <div v-else class="plan-empty">
          <div class="plan-empty-icon">🗺️</div>
          <p v-if="isOwner">No travel plan yet. Choose from 15 European destinations with pre-suggested routes, transport and accommodation options.</p>
          <p v-else>No travel plan has been created for this trip yet.</p>
          <div v-if="isOwner" class="plan-empty-actions">
            <NuxtLink :to="`/plan/${trip.id}`" class="btn btn-gold">Create Travel Plan</NuxtLink>
            <NuxtLink to="/explore" class="btn btn-outline">🌍 Explore on Globe</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const { user } = useAuth()
const route = useRoute()
const router = useRouter()

const trip         = ref(null)
const loading      = ref(true)
const editing      = ref(false)
const deleting     = ref(false)
const travelPlan   = ref(null)
const deletingPlan = ref(false)

const reviews    = ref([])
const formStars  = ref(0)
const formComment = ref('')
const submitting = ref(false)

const isOwner  = computed(() => !!user.value && trip.value?.user_id === user.value.id)
const myReview = computed(() => reviews.value.find(r => r.reviewer_id === user.value?.id) ?? null)

onMounted(async () => {
  if (!user.value) return navigateTo('/register')
  await fetchTrip()
  await Promise.all([fetchPlan(), fetchReviews()])
})

async function fetchTrip() {
  loading.value = true
  try {
    trip.value = await $fetch(`/api/trips/${route.params.id}`)
  } catch {
    router.push('/trips')
  } finally {
    loading.value = false
  }
}

async function fetchPlan() {
  try {
    travelPlan.value = await $fetch(`/api/travel-plans/${route.params.id}`)
  } catch {
    travelPlan.value = null
  }
}

async function fetchReviews() {
  try {
    reviews.value = await $fetch(`/api/reviews/trip/${route.params.id}`)
    if (myReview.value) {
      formStars.value   = myReview.value.stars
      formComment.value = myReview.value.comment
    }
  } catch {
    reviews.value = []
  }
}

async function submitReview() {
  if (!formStars.value) return
  submitting.value = true
  try {
    await $fetch(`/api/reviews/trip/${route.params.id}`, {
      method: 'POST',
      body: { reviewer_id: user.value.id, stars: formStars.value, comment: formComment.value },
    })
    await fetchReviews()
  } catch (err) {
    alert(err.data?.statusMessage || 'Could not save review')
  } finally {
    submitting.value = false
  }
}

async function deleteMyReview() {
  if (!confirm('Delete your review?')) return
  submitting.value = true
  try {
    await $fetch(`/api/reviews/${myReview.value.id}`, {
      method: 'DELETE',
      body: { reviewer_id: user.value.id },
    })
    formStars.value   = 0
    formComment.value = ''
    await fetchReviews()
  } catch (err) {
    alert(err.data?.statusMessage || 'Could not delete review')
  } finally {
    submitting.value = false
  }
}

function onSaved(savedTrip) {
  trip.value = savedTrip
  editing.value = false
}

async function deleteTrip() {
  if (!confirm(`Delete "${trip.value.title}"? This cannot be undone.`)) return
  deleting.value = true
  try {
    await $fetch(`/api/trips/${trip.value.id}`, { method: 'DELETE' })
    router.push('/trips')
  } catch (err) {
    alert(err.data?.statusMessage || 'Delete failed')
    deleting.value = false
  }
}

async function deletePlan() {
  if (!confirm('Remove the travel plan for this trip?')) return
  deletingPlan.value = true
  try {
    await $fetch(`/api/travel-plans/${trip.value.id}`, { method: 'DELETE' })
    travelPlan.value = null
  } catch (err) {
    alert(err.data?.statusMessage || 'Could not remove plan')
  } finally {
    deletingPlan.value = false
  }
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const TRANSPORT_ICONS    = { flight: '✈️', train: '🚂', bus: '🚌', car: '🚗', ferry: '⛴️' }
const ACCOMMODATION_ICONS = { hotel: '🏨', hostel: '🛏️', apartment: '🏠', guesthouse: '🏡', camping: '⛺' }
function transportIcon(t)     { return TRANSPORT_ICONS[t]     ?? '🚀' }
function accommodationIcon(t) { return ACCOMMODATION_ICONS[t] ?? '🏠' }
</script>

<style scoped>
.detail-actions {
  display: flex;
  gap: 12px;
}

/* ── Travel Plan section ── */
.plan-section {
  background: var(--white);
  border-radius: var(--radius);
  padding: 36px 44px;
  box-shadow: var(--shadow);
  margin-top: 24px;
}
.plan-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.plan-header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.plan-section-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  color: var(--navy);
  font-weight: 700;
  margin-bottom: 4px;
}
.plan-section-sub {
  color: var(--text-muted);
  font-size: 0.88rem;
}

/* Plan summary */
.plan-summary {}
.plan-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}
.plan-summary-item {
  background: var(--sand);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.psi-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--gold);
  font-weight: 700;
}
.psi-value {
  font-weight: 700;
  color: var(--navy);
  font-size: 0.95rem;
  line-height: 1.3;
}
.psi-sub {
  color: var(--text-muted);
  font-size: 0.78rem;
}
.plan-summary-highlights {
  background: var(--sand);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}
.highlights-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.highlight-tag {
  background: rgba(15,31,61,0.07);
  color: var(--navy);
  padding: 3px 10px;
  border-radius: 100px;
  font-size: 0.75rem;
  font-weight: 500;
}
.plan-summary-notes {
  background: var(--sand);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 16px;
}
.plan-summary-notes p {
  color: #444;
  font-size: 0.88rem;
  line-height: 1.7;
  white-space: pre-wrap;
  margin-top: 6px;
}
/* Status banner */
.plan-status-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(201,168,76,0.08);
  border: 1px solid rgba(201,168,76,0.2);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.82rem;
  color: var(--navy);
  font-weight: 500;
  margin-bottom: 20px;
}
.plan-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gold);
  flex-shrink: 0;
}

.btn-sm { padding: 7px 16px; font-size: 0.82rem; }

.plan-summary-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 16px;
  border-top: 1px solid var(--sand-dark);
}
.btn-delete-plan {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.82rem;
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  transition: color 0.2s;
}
.btn-delete-plan:hover { color: var(--error); }

/* Plan empty state */
.plan-empty {
  text-align: center;
  padding: 48px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.plan-empty-icon {
  font-size: 2.5rem;
  margin-bottom: 4px;
}
.plan-empty p {
  color: var(--text-muted);
  font-size: 0.9rem;
  max-width: 420px;
  line-height: 1.6;
  margin-bottom: 8px;
}
.plan-empty-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

/* ── Reviews ── */
.reviews-section {
  background: var(--white);
  border-radius: var(--radius);
  padding: 36px 44px;
  box-shadow: var(--shadow);
  margin-top: 24px;
}
.reviews-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  color: var(--navy);
  font-weight: 700;
  margin-bottom: 24px;
}
.review-form-card {
  background: var(--sand);
  border-radius: 10px;
  padding: 20px 24px;
  margin-bottom: 28px;
}
.review-form-card h3 {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--gold);
  font-weight: 700;
  margin-bottom: 12px;
}
.star-picker {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}
.star-btn {
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  color: var(--sand-dark);
  line-height: 1;
  padding: 0;
  transition: color 0.15s, transform 0.1s;
}
.star-btn.active { color: var(--gold); }
.star-btn:hover  { transform: scale(1.2); color: var(--gold-light); }
.review-textarea {
  width: 100%;
  border: 1.5px solid var(--sand-dark);
  border-radius: 8px;
  padding: 10px 14px;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  background: var(--white);
  color: var(--text);
  margin-bottom: 12px;
  transition: border-color 0.2s;
}
.review-textarea:focus {
  outline: none;
  border-color: var(--gold);
}
.review-form-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}
.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.review-card {
  background: var(--sand);
  border-radius: 10px;
  padding: 18px 20px;
}
.review-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.review-avatar {
  width: 36px;
  height: 36px;
  background: var(--navy);
  color: var(--white);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.review-name {
  font-weight: 600;
  color: var(--navy);
  font-size: 0.9rem;
  display: block;
}
.review-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}
.review-stars {
  margin-left: auto;
  font-size: 1.1rem;
}
.star-on  { color: var(--gold); }
.star-off { color: var(--sand-dark); }
.review-comment {
  color: #444;
  font-size: 0.9rem;
  line-height: 1.7;
  white-space: pre-wrap;
}
.reviews-empty {
  color: var(--text-muted);
  font-size: 0.9rem;
  text-align: center;
  padding: 24px 0;
}

.loading {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-muted);
}
.loading-spinner {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 12px;
  animation: fly 2s ease-in-out infinite;
}
@keyframes fly {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  50% { transform: translateX(10px) rotate(5deg); }
}

.trip-detail {
  background: var(--white);
  border-radius: var(--radius);
  padding: 44px;
  box-shadow: var(--shadow);
}
.trip-detail-header {
  margin-bottom: 28px;
}
.trip-detail h1 {
  font-family: 'Playfair Display', serif;
  font-size: 2.4rem;
  color: var(--navy);
  margin-bottom: 16px;
  line-height: 1.2;
}
.trip-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.trip-divider {
  height: 1px;
  background: linear-gradient(90deg, var(--gold), transparent);
  margin-bottom: 32px;
}
.trip-section {
  margin-bottom: 32px;
}
.trip-section h3 {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--gold);
  font-weight: 700;
  margin-bottom: 12px;
}
.trip-section p {
  color: #444;
  white-space: pre-wrap;
  line-height: 1.8;
  font-size: 0.97rem;
}
</style>
