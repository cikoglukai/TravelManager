<template>
  <div class="auth-page">
    <div class="auth-bg">
      <div class="auth-bg-circle c1"></div>
      <div class="auth-bg-circle c2"></div>
      <div class="auth-bg-circle c3"></div>
    </div>

    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">
          <img :src="'/logo_banner.png'" alt="One Cloud Away" class="auth-logo-img" />
        </div>
        <h1>One Cloud Away</h1>
        <p>Your personal travel companion</p>
      </div>

      <!-- Tabs -->
      <div class="auth-tabs">
        <button
          class="auth-tab"
          :class="{ 'auth-tab--active': tab === 'signin' }"
          @click="switchTab('signin')"
        >Sign In</button>
        <button
          class="auth-tab"
          :class="{ 'auth-tab--active': tab === 'signup' }"
          @click="switchTab('signup')"
        >Sign Up</button>
      </div>

      <!-- Sign In -->
      <form v-if="tab === 'signin'" @submit.prevent="handleSignIn" class="auth-form" key="signin">
        <div class="form-group">
          <label for="si-email">Email</label>
          <input
            id="si-email"
            v-model="siForm.email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            required
            autofocus
          />
        </div>
        <div class="form-group">
          <label for="si-password">Password</label>
          <input
            id="si-password"
            v-model="siForm.password"
            type="password"
            placeholder="Your password"
            autocomplete="current-password"
            required
          />
        </div>
        <div class="form-error" v-if="error">{{ error }}</div>
        <button type="submit" class="btn-auth" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign In' }}
        </button>
        <div class="auth-divider"><span>or</span></div>
        <button type="button" class="btn-google" @click="handleGoogle" :disabled="loading">
          <svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </form>

      <!-- Sign Up -->
      <form v-else @submit.prevent="handleSignUp" class="auth-form" key="signup">
        <div class="form-group">
          <label for="su-name">Your Name</label>
          <input
            id="su-name"
            v-model="suForm.name"
            type="text"
            placeholder="Your full name"
            autocomplete="name"
            required
            autofocus
          />
        </div>
        <div class="form-group">
          <label for="su-email">Email</label>
          <input
            id="su-email"
            v-model="suForm.email"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            required
          />
        </div>
        <div class="form-group">
          <label for="su-password">Password</label>
          <input
            id="su-password"
            v-model="suForm.password"
            type="password"
            placeholder="At least 6 characters"
            autocomplete="new-password"
            required
            minlength="6"
          />
        </div>
        <div class="form-error" v-if="error">{{ error }}</div>
        <button type="submit" class="btn-auth" :disabled="loading">
          {{ loading ? 'Creating account…' : 'Create Account' }}
        </button>
        <div class="auth-divider"><span>or</span></div>
        <button type="button" class="btn-google" @click="handleGoogle" :disabled="loading">
          <svg class="google-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
      </form>

      <div class="auth-footer">Plan · Explore · Remember</div>
    </div>
  </div>
</template>

<script setup>
const { user, signInEmail, signUpEmail, signInGoogle } = useAuth()

onMounted(() => { if (user.value) navigateTo('/trips') })

const tab = ref('signin')
const error = ref('')
const loading = ref(false)

const siForm = reactive({ email: '', password: '' })
const suForm = reactive({ name: '', email: '', password: '' })

function switchTab(t) {
  tab.value = t
  error.value = ''
}

const FIREBASE_ERRORS = {
  'auth/user-not-found':        'No account with that email.',
  'auth/wrong-password':        'Incorrect password.',
  'auth/invalid-credential':    'Invalid email or password.',
  'auth/email-already-in-use':  'That email is already registered. Sign in instead.',
  'auth/weak-password':         'Password must be at least 6 characters.',
  'auth/invalid-email':         'Please enter a valid email address.',
  'auth/popup-closed-by-user':  '',
  'auth/cancelled-popup-request': '',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/too-many-requests':     'Too many attempts. Try again later.',
}

function firebaseError(err) {
  const msg = FIREBASE_ERRORS[err?.code]
  if (msg === '') return ''
  return msg ?? err?.data?.statusMessage ?? err?.message ?? 'Something went wrong.'
}

async function handleSignIn() {
  error.value = ''
  loading.value = true
  try {
    await signInEmail(siForm.email, siForm.password)
    navigateTo('/trips')
  } catch (err) {
    error.value = firebaseError(err)
  } finally {
    loading.value = false
  }
}

async function handleSignUp() {
  error.value = ''
  loading.value = true
  try {
    await signUpEmail(suForm.email, suForm.password, suForm.name.trim())
    navigateTo('/trips')
  } catch (err) {
    error.value = firebaseError(err)
  } finally {
    loading.value = false
  }
}

async function handleGoogle() {
  error.value = ''
  loading.value = true
  try {
    await signInGoogle()
    const { user } = useAuth()
    if (!user.value?.name?.trim()) {
      navigateTo('/profile?setup=1')
    } else {
      navigateTo('/trips')
    }
  } catch (err) {
    const msg = firebaseError(err)
    if (msg) error.value = msg
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
  padding: 48px 44px 40px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.4);
  position: relative;
  z-index: 1;
  animation: fadeUp 0.45s ease;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.auth-header {
  text-align: center;
  margin-bottom: 28px;
}
.auth-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
}
.auth-logo-img {
  height: 56px;
  width: auto;
  max-width: 220px;
  object-fit: contain;
}
.auth-header h1 {
  font-family: 'Playfair Display', serif;
  font-size: 1.75rem;
  color: var(--navy);
  margin-bottom: 4px;
}
.auth-header p {
  color: var(--text-muted);
  font-size: 0.88rem;
}

/* Tabs */
.auth-tabs {
  display: flex;
  border-bottom: 2px solid var(--sand-dark);
  margin-bottom: 28px;
}
.auth-tab {
  flex: 1;
  padding: 10px 0;
  background: none;
  border: none;
  font-size: 0.88rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--text-muted);
  cursor: pointer;
  letter-spacing: 0.04em;
  position: relative;
  transition: color 0.2s;
}
.auth-tab--active {
  color: var(--navy);
}
.auth-tab--active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--gold);
}

/* Form */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.form-group {
  margin-bottom: 18px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: var(--navy);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.form-group input {
  width: 100%;
  padding: 13px 16px;
  border: 2px solid var(--sand-dark);
  border-radius: 10px;
  font-size: 0.97rem;
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

.form-error {
  color: var(--error);
  background: var(--error-bg);
  border-radius: 8px;
  padding: 9px 14px;
  font-size: 0.85rem;
  margin-bottom: 14px;
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
  margin-bottom: 18px;
}
.btn-auth:hover:not(:disabled) {
  background: var(--gold);
  color: var(--navy);
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(201,168,76,0.35);
}
.btn-auth:disabled { opacity: 0.5; cursor: not-allowed; }

.auth-divider {
  text-align: center;
  position: relative;
  margin-bottom: 16px;
  color: var(--text-muted);
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.auth-divider::before,
.auth-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 38%;
  height: 1px;
  background: var(--sand-dark);
}
.auth-divider::before { left: 0; }
.auth-divider::after  { right: 0; }

.btn-google {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--white);
  border: 2px solid var(--sand-dark);
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--text);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.btn-google:hover:not(:disabled) {
  border-color: rgba(15,31,61,0.35);
  box-shadow: 0 2px 8px rgba(15,31,61,0.1);
}
.btn-google:disabled { opacity: 0.5; cursor: not-allowed; }

.google-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.auth-footer {
  text-align: center;
  margin-top: 28px;
  font-size: 0.75rem;
  color: var(--text-muted);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
</style>
