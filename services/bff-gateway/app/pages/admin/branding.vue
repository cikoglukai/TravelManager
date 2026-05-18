<script setup>
import { useApiFetch } from '~/composables/useApiFetch.js'
const { apiFetch } = useApiFetch()
const tenant = useState('tenant', () => ({ tenantId: 'dev', plan: 'free' }))

const form = ref({
  logo_url: '', primary_color: '#0f172a', accent_color: '#0ea5e9',
  custom_domain: '', email_from_name: '',
})
const saving = ref(false)
const saved = ref(false)

async function load() {
  try {
    const t = await apiFetch('/api/tenants/me')
    form.value = {
      logo_url:        t.logo_url || '',
      primary_color:   t.primary_color || '#0f172a',
      accent_color:    t.accent_color || '#0ea5e9',
      custom_domain:   t.custom_domain || '',
      email_from_name: t.email_from_name || '',
    }
  } catch { /* defaults */ }
}
onMounted(load)

async function save() {
  saving.value = true
  saved.value = false
  try {
    await apiFetch(`/api/tenants/${tenant.value.tenantId}/branding`, {
      method: 'PUT',
      body: form.value,
    })
    saved.value = true
    setTimeout(() => { saved.value = false }, 3000)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="branding-page">
    <h1>White-label branding</h1>
    <p class="muted">Customize how your tenant looks. Standard plan or higher.</p>

    <form class="form" @submit.prevent="save">
      <label>
        <span>Logo URL</span>
        <input v-model="form.logo_url" type="url" placeholder="https://…/logo.png" />
      </label>
      <div class="row">
        <label>
          <span>Primary color</span>
          <input v-model="form.primary_color" type="color" />
        </label>
        <label>
          <span>Accent color</span>
          <input v-model="form.accent_color" type="color" />
        </label>
      </div>
      <label>
        <span>Custom domain</span>
        <input v-model="form.custom_domain" type="text" placeholder="travel.acme.com" />
        <small class="muted">CNAME this domain to <code>cname.travelmanager.app</code>.</small>
      </label>
      <label>
        <span>Email "From" name</span>
        <input v-model="form.email_from_name" type="text" placeholder="Acme Travel" />
      </label>

      <div class="preview" :style="{ '--p': form.primary_color, '--a': form.accent_color }">
        <strong>Preview</strong>
        <span class="preview-pill" style="background: var(--p); color: white;">Primary</span>
        <span class="preview-pill" style="background: var(--a); color: white;">Accent</span>
      </div>

      <div class="actions">
        <button class="cta" :disabled="saving" type="submit">{{ saving ? 'Saving…' : 'Save' }}</button>
        <span v-if="saved" class="saved">✓ Saved</span>
      </div>
    </form>
  </div>
</template>

<style scoped>
.branding-page { max-width: 640px; margin: 2rem auto; padding: 0 1rem; }
h1 { margin: 0 0 0.25rem; }
.muted { color: #64748b; }
.form { display: grid; gap: 1rem; background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); margin-top: 1.5rem; }
label { display: grid; gap: 0.35rem; }
label > span { font-weight: 600; font-size: 0.9rem; }
input { padding: 0.55rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; }
input[type=color] { padding: 0; width: 64px; height: 40px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.preview { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; border: 1px dashed #cbd5e1; border-radius: 8px; }
.preview-pill { padding: 0.35rem 0.85rem; border-radius: 999px; font-size: 0.8rem; }
.actions { display: flex; align-items: center; gap: 0.75rem; }
.cta { padding: 0.6rem 1.4rem; background: var(--navy, #0f172a); color: white; border: 0; border-radius: 8px; font-weight: 600; cursor: pointer; }
.cta:disabled { opacity: 0.5; cursor: wait; }
.saved { color: #16a34a; font-weight: 600; }
</style>
