<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1>✈️ Trip Manager</h1>
        <p>Plan and manage your leisure travels</p>
      </div>

      <!-- Step 1: enter email to check whether the account exists -->
      <form v-if="step === 1" @submit.prevent="checkEmail">
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
        <button type="submit" class="btn btn-primary" style="width:100%" :disabled="loading">
          {{ loading ? 'Checking…' : 'Continue' }}
        </button>
      </form>

      <!-- Step 2: shown only when the email was not found — collect name to register -->
      <form v-else @submit.prevent="register">
        <p class="step-hint">
          No account found for <strong>{{ form.email }}</strong>.<br />Enter your name to create one.
        </p>
        <div class="form-group">
          <label for="name">Full Name</label>
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
        <div style="display:flex;gap:10px">
          <button type="button" class="btn btn-secondary" @click="step = 1; error = ''">← Back</button>
          <button type="submit" class="btn btn-primary" style="flex:1" :disabled="loading">
            {{ loading ? 'Creating…' : 'Create Account' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
const { user, setUser } = useAuth()

// Redirect already-authenticated users straight to their trips
onMounted(() => { if (user.value) navigateTo('/trips') })

// step 1 = email input, step 2 = name input (new users only)
const step = ref(1)
const form = reactive({ email: '', name: '' })
const error = ref('')
const loading = ref(false)

// Step 1 handler — posts only the email.
// The server returns the existing user (login) or throws 422 (new user, needs name).
async function checkEmail() {
  error.value = ''
  loading.value = true
  try {
    const u = await $fetch('/api/users', { method: 'POST', body: { email: form.email } })
    setUser(u)
    navigateTo('/trips')
  } catch (err) {
    if (err.status === 422) {
      step.value = 2  // email not found — show name field
    } else {
      error.value = err.data?.statusMessage || err.message || 'Something went wrong'
    }
  } finally {
    loading.value = false
  }
}

// Step 2 handler — posts email + name to create a new account, then logs in
async function register() {
  error.value = ''
  loading.value = true
  try {
    const u = await $fetch('/api/users', {
      method: 'POST',
      body: { email: form.email, name: form.name },
    })
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}
.auth-card {
  background: #fff;
  border-radius: 14px;
  padding: 42px 40px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22);
}
.auth-header {
  text-align: center;
  margin-bottom: 32px;
}
.auth-header h1 {
  font-size: 2rem;
  color: #2c3e50;
  margin-bottom: 6px;
}
.auth-header p {
  color: #7f8c8d;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #444;
  font-size: 0.9rem;
}
.form-group input {
  width: 100%;
  padding: 11px 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.2s;
}
.form-group input:focus {
  outline: none;
  border-color: #3498db;
}
.step-hint {
  background: #f0f4f8;
  border-radius: 7px;
  padding: 12px 14px;
  font-size: 0.9rem;
  color: #555;
  margin-bottom: 20px;
  line-height: 1.6;
}
</style>