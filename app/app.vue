<template>
  <div class="app">
    <nav v-if="user" class="navbar">
      <NuxtLink to="/trips" class="nav-brand">
        <span class="brand-icon">✈</span>
        <span class="brand-text">TripManager</span>
      </NuxtLink>
      <div class="nav-links">
        <NuxtLink to="/trips" class="nav-link">My Trips</NuxtLink>
        <NuxtLink to="/trips/new" class="nav-btn-new">
          <span>+</span> New Trip
        </NuxtLink>
        <span class="nav-user">
          <span class="user-avatar">{{ user.name.charAt(0).toUpperCase() }}</span>
          {{ user.name }}
        </span>
        <button class="nav-btn-logout" @click="handleLogout">Logout</button>
      </div>
    </nav>

    <NuxtPage />

    <footer class="footer">
      <div class="footer-inner">
        <span class="footer-brand">✈ TripManager</span>
        <span class="footer-divider">·</span>
        <span>Kai Cikoglu · Nina Karl · Johanna Prinz · Daniel Rill</span>
        <span class="footer-divider">·</span>
        <span class="footer-tech">Nuxt 3 · REST API · PostgreSQL</span>
      </div>
    </footer>
  </div>
</template>

<script setup>
const { user, logout } = useAuth()
const router = useRouter()

function handleLogout() {
  logout()
  router.push('/register')
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

:root {
  --navy: #0f1f3d;
  --navy-light: #1a3260;
  --gold: #c9a84c;
  --gold-light: #f0d080;
  --sand: #f5f0e8;
  --sand-dark: #ede5d8;
  --white: #ffffff;
  --text: #2a2a2a;
  --text-muted: #7a7a7a;
  --error: #c0392b;
  --error-bg: #fdf0ef;
  --success: #1a7a4a;
  --radius: 12px;
  --shadow: 0 4px 24px rgba(15,31,61,0.10);
  --shadow-lg: 0 12px 48px rgba(15,31,61,0.16);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'DM Sans', sans-serif;
  background: var(--sand);
  color: var(--text);
  line-height: 1.6;
  min-height: 100vh;
}

a { color: inherit; text-decoration: none; }

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ── Navbar ── */
.navbar {
  background: var(--navy);
  height: 64px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 20px rgba(15,31,61,0.3);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--white);
}
.brand-icon {
  font-size: 1.3rem;
  color: var(--gold);
}
.brand-text {
  font-family: 'Playfair Display', serif;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
}
.nav-link {
  color: rgba(255,255,255,0.72);
  font-size: 0.9rem;
  font-weight: 500;
  letter-spacing: 0.03em;
  transition: color 0.2s;
}
.nav-link:hover { color: var(--white); }

.nav-btn-new {
  background: var(--gold);
  color: var(--navy) !important;
  padding: 7px 18px;
  border-radius: 100px;
  font-weight: 600;
  font-size: 0.88rem;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background 0.2s, transform 0.15s;
}
.nav-btn-new:hover {
  background: var(--gold-light);
  transform: translateY(-1px);
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255,255,255,0.82);
  font-size: 0.88rem;
}
.user-avatar {
  width: 30px;
  height: 30px;
  background: var(--gold);
  color: var(--navy);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.82rem;
}

.nav-btn-logout {
  background: none;
  border: 1px solid rgba(255,255,255,0.25);
  color: rgba(255,255,255,0.65);
  padding: 6px 14px;
  border-radius: 100px;
  cursor: pointer;
  font-size: 0.85rem;
  font-family: inherit;
  transition: all 0.2s;
}
.nav-btn-logout:hover {
  border-color: rgba(255,255,255,0.6);
  color: var(--white);
}

/* ── Page wrapper ── */
.page-wrapper {
  flex: 1;
  max-width: 1020px;
  width: 100%;
  margin: 0 auto;
  padding: 44px 24px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 36px;
  flex-wrap: wrap;
  gap: 12px;
}
.page-header h2 {
  font-family: 'Playfair Display', serif;
  font-size: 2rem;
  color: var(--navy);
  font-weight: 700;
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: 100px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  border: none;
  transition: all 0.2s;
  letter-spacing: 0.02em;
}
.btn:disabled { opacity: 0.55; cursor: not-allowed; }

.btn-primary {
  background: var(--navy);
  color: var(--white);
}
.btn-primary:hover:not(:disabled) {
  background: var(--navy-light);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(15,31,61,0.25);
}

.btn-secondary {
  background: var(--sand-dark);
  color: var(--text);
}
.btn-secondary:hover:not(:disabled) { background: #ddd5c5; }

.btn-danger {
  background: var(--error);
  color: var(--white);
}
.btn-danger:hover:not(:disabled) { background: #a93226; }

.btn-outline {
  background: none;
  border: 1.5px solid var(--navy);
  color: var(--navy);
}
.btn-outline:hover { background: var(--navy); color: var(--white); }

.btn-gold {
  background: var(--gold);
  color: var(--navy);
}
.btn-gold:hover:not(:disabled) {
  background: var(--gold-light);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(201,168,76,0.35);
}

.btn-back {
  color: var(--navy);
  font-size: 0.9rem;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  opacity: 0.7;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  gap: 5px;
}
.btn-back:hover { opacity: 1; }

/* ── Loading / empty ── */
.loading, .empty-state {
  text-align: center;
  color: var(--text-muted);
  padding: 80px 20px;
  font-size: 1rem;
}
.empty-state a { color: var(--gold); font-weight: 600; }

/* ── Trip grid ── */
.trip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.trip-card {
  background: var(--white);
  border-radius: var(--radius);
  padding: 26px;
  box-shadow: var(--shadow);
  display: block;
  transition: transform 0.2s, box-shadow 0.2s;
  border-top: 3px solid var(--gold);
  position: relative;
  overflow: hidden;
}
.trip-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--gold), var(--gold-light));
}
.trip-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.trip-card-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--navy);
  margin-bottom: 10px;
  line-height: 1.3;
}
.trip-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.trip-card-desc {
  color: var(--text-muted);
  font-size: 0.88rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

/* ── Badges ── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 0.8rem;
  font-weight: 500;
}
.badge-dest {
  background: rgba(15,31,61,0.07);
  color: var(--navy);
}
.badge-date {
  background: rgba(201,168,76,0.15);
  color: #8a6d20;
}

/* ── Trip detail ── */
.trip-detail {
  background: var(--white);
  border-radius: var(--radius);
  padding: 40px;
  box-shadow: var(--shadow);
}
.trip-detail h1 {
  font-family: 'Playfair Display', serif;
  font-size: 2.2rem;
  color: var(--navy);
  margin-bottom: 16px;
  line-height: 1.2;
}
.trip-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 32px;
}
.trip-section {
  margin-bottom: 28px;
}
.trip-section h3 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--gold);
  font-weight: 600;
  margin-bottom: 10px;
}
.trip-section p {
  color: #444;
  white-space: pre-wrap;
  line-height: 1.75;
}
.trip-detail-actions {
  display: flex;
  gap: 12px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--sand-dark);
}

/* ── Form error ── */
.form-error {
  color: var(--error);
  background: var(--error-bg);
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.88rem;
  margin-bottom: 16px;
  border-left: 3px solid var(--error);
}

/* ── Footer ── */
.footer {
  background: var(--navy);
  padding: 18px 24px;
  margin-top: auto;
}
.footer-inner {
  max-width: 1020px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  color: rgba(255,255,255,0.45);
  font-size: 0.82rem;
}
.footer-brand {
  color: var(--gold);
  font-weight: 600;
  font-family: 'Playfair Display', serif;
}
.footer-divider { color: rgba(255,255,255,0.2); }
.footer-tech { color: rgba(255,255,255,0.3); }
</style>
