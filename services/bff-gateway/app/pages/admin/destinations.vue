<script setup>
import { useApiFetch } from '~/composables/useApiFetch.js'
const { apiFetch } = useApiFetch()

const destinations = ref([])
const selectedId = ref(null)
const products = ref([])
const loading = ref(false)
const form = ref({ name: '', description: '', price_eur: 0, plan_required: 'free' })

async function loadDestinations() {
  destinations.value = await apiFetch('/api/destinations') || []
  if (!selectedId.value && destinations.value.length) {
    selectedId.value = destinations.value[0].id
  }
}

async function loadProducts() {
  if (!selectedId.value) return
  loading.value = true
  try {
    products.value = await apiFetch(`/api/destinations/${selectedId.value}/products`) || []
  } finally {
    loading.value = false
  }
}

async function addProduct() {
  if (!form.value.name?.trim()) return
  await apiFetch(`/api/destinations/${selectedId.value}/products`, {
    method: 'POST',
    body: { ...form.value, price_eur: Number(form.value.price_eur) || 0 },
  })
  form.value = { name: '', description: '', price_eur: 0, plan_required: 'free' }
  await loadProducts()
}

onMounted(loadDestinations)
watch(selectedId, loadProducts)
</script>

<template>
  <div class="dest-admin">
    <h1>Destination products</h1>
    <p class="muted">List services for sale at each destination. Standard plan or higher.</p>

    <div class="layout">
      <aside class="dest-list">
        <h2>Destinations</h2>
        <ul>
          <li v-for="d in destinations" :key="d.id"
              :class="{ active: d.id === selectedId }"
              @click="selectedId = d.id">
            {{ d.emoji }} {{ d.city }} <span class="muted">{{ d.country }}</span>
          </li>
        </ul>
      </aside>

      <main class="dest-detail" v-if="selectedId">
        <h2>Products</h2>
        <div v-if="loading">Loading…</div>
        <ul v-else-if="products.length" class="prod-list">
          <li v-for="p in products" :key="p.id" class="prod">
            <strong>{{ p.name }}</strong>
            <span class="price">€{{ p.price_eur }}</span>
            <p>{{ p.description }}</p>
            <small class="muted">plan: {{ p.plan_required }}</small>
          </li>
        </ul>
        <p v-else class="muted">No products yet.</p>

        <form class="prod-form" @submit.prevent="addProduct">
          <h3>Add a product</h3>
          <input v-model="form.name" placeholder="Product name" required />
          <textarea v-model="form.description" placeholder="Description" rows="2"></textarea>
          <div class="row">
            <input v-model.number="form.price_eur" type="number" min="0" placeholder="Price (EUR)" />
            <select v-model="form.plan_required">
              <option value="free">Free</option>
              <option value="standard">Standard</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <button class="cta" type="submit">Add</button>
        </form>
      </main>
    </div>
  </div>
</template>

<style scoped>
.dest-admin { max-width: 1100px; margin: 2rem auto; padding: 0 1rem; }
.layout { display: grid; grid-template-columns: 260px 1fr; gap: 1.25rem; margin-top: 1.25rem; }
@media (max-width: 720px) { .layout { grid-template-columns: 1fr; } }
.dest-list, .dest-detail { background: white; padding: 1.25rem; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
.dest-list ul { list-style: none; padding: 0; margin: 0; }
.dest-list li { padding: 0.55rem 0.65rem; border-radius: 6px; cursor: pointer; }
.dest-list li:hover { background: #f1f5f9; }
.dest-list li.active { background: var(--navy, #0f172a); color: white; }
.muted { color: #64748b; }
.prod-list { list-style: none; padding: 0; display: grid; gap: 0.75rem; }
.prod { padding: 0.75rem 1rem; background: #f8fafc; border-radius: 8px; position: relative; }
.price { float: right; font-weight: 700; }
.prod-form { margin-top: 1.5rem; display: grid; gap: 0.5rem; }
.prod-form input, .prod-form textarea, .prod-form select {
  padding: 0.55rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.95rem;
}
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.cta { padding: 0.6rem 1.4rem; background: var(--navy, #0f172a); color: white; border: 0; border-radius: 8px; font-weight: 600; cursor: pointer; }
</style>
