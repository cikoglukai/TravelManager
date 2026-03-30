<template>
  <div class="auth-page">
    <div class="auth-bg">
      <div class="auth-bg-circle c1"></div>
      <div class="auth-bg-circle c2"></div>
      <div class="auth-bg-circle c3"></div>
    </div>

    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">✈</div>
        <h1>TripManager</h1>
        <p>Your personal travel companion</p>
      </div>

      <form v-if="step === 1" @submit.prevent="checkEmail" class="auth-form">
        <div class="form-group">
          <label for="email">Email Address</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            placeholder="you@example.com"
            required
            autofocus
          />
        </div>
        <div class="form-error" v-if="error">{{ error }}</div>
        <button type="submit" class="btn btn-auth" :disabled="loading">
          {{ loading ? 'Checking…' : 'Continue →' }}
        </button>
      </form>

      <form v-else @submit.prevent="register" class="auth-form">
        <div class="step-hint">
          <span class="step-hint-icon">👋</span>
          <div>
            <strong>Welcome!</strong><br/>
            No account found for <em>{{ form.email }}</em>. Let's create one.
          </div>
        </div>
        <div class="form-group">
          <label for="name">Your Name</label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="Your full name"
            required
            autofocus
          />
        </div>
        <div class="form-error" v-if="error">{{ error }}</div>
        <div class="auth-actions">
          <button type="button" class="btn btn-back-auth" @click="step = 1; error = ''">← Back</button>
          <button type="submit" class="btn btn-auth" :disabled="loading">
            {{ loading ? 'Creating…' : 'Create Account →' }}
          </button>
        </div>
      </form>

      <div class="auth-footer">
        Plan · Explore · Remember
      </div>
    </div>
  </div>
</template>

<script setup>
const { user, setUser } = useAuth()
onMounted(() => { if (user.value) navigateTo('/trips') })

const step = ref(1)
const form = reactive({ email: '', name: '' })
const error = ref('')
const loading = ref(false)

async function checkEmail() {
  error.value = ''
  loading.value = true
  try {
    const u = await $fetch('/api/users', { method: 'POST', body: { email: form.email } })
    setUser(u)
    navigateTo('/trips')
  } catch (err) {
    if (err.status === 422) {
      step.value = 2
    } else {
      error.value = err.data?.statusMessage || err.message || 'Something went wrong'
    }
  } finally {
    loading.value = false
  }
}

async function register() {
  error.value = ''
  loading.value = true
  try {
    const u = await $fetch('/api/users', { method: 'POST', body: { email: form.email, name: form.name } })
    setUser(u)
    navigateTo('/trips')
  } catch (err) {
    error.value = err.data?.statusMessage || err.message || 'Something went wrong'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--navy);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.auth-bg { position: absolute; inset: 0; pointer-events: none; }
.auth-bg-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.07;
  background: var(--gold);
}
.c1 { width: 600px; height: 600px; top: -200px; right: -150px; }
.c2 { width: 400px; height: 400px; bottom: -100px; left: -100px; }
.c3 { width: 250px; height: 250px; top: 50%; left: 50%; transform: translate(-50%,-50%); opacity: 0.04; }

.auth-card {
  background: var(--white);
  border-radius: 20px;
  padding: 52px 44px 40px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.4);
  position: relative;
  z-index: 1;
  animation: fadeUp 0.5s ease;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

.auth-header {
  text-align: center;
  margin-bottom: 36px;
}
.auth-logo {
  font-size: 2.2rem;
  background: var(--navy);
  color: var(--gold);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}
.auth-header h1 {
  font-family: 'Playfair Display', serif;
  font-size: 1.9rem;
  color: var(--navy);
  margin-bottom: 6px;
}
.auth-header p {
  color: var(--text-muted);
  font-size: 0.92rem;
}

.auth-form { display: flex; flex-direction: column; gap: 0; }

.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 7px;
  font-weight: 600;
  color: var(--navy);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.form-group input {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid var(--sand-dark);
  border-radius: 10px;
  font-size: 1rem;
  font-family: inherit;
  background: var(--sand);
  color: var(--text);
  transition: border-color 0.2s, background 0.2s;
}
.form-group input:focus {
  outline: none;
  border-color: var(--gold);
  background: var(--white);
}

.btn-auth {
  width: 100%;
  padding: 14px;
  background: var(--navy);
  color: var(--white);
  border: none;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  letter-spacing: 0.04em;
}
.btn-auth:hover:not(:disabled) {
  background: var(--gold);
  color: var(--navy);
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(201,168,76,0.35);
}
.btn-auth:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-back-auth {
  padding: 14px 20px;
  background: var(--sand);
  color: var(--text-muted);
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-back-auth:hover { background: var(--sand-dark); }

.auth-actions {
  display: flex;
  gap: 10px;
}
.auth-actions .btn-auth { flex: 1; }

.step-hint {
  background: var(--sand);
  border-radius: 10px;
  padding: 14px 16px;
  font-size: 0.88rem;
  color: var(--text);
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  line-height: 1.5;
}
.step-hint-icon { font-size: 1.2rem; }

.auth-footer {
  text-align: center;
  margin-top: 28px;
  font-size: 0.78rem;
  color: var(--text-muted);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
</style>
