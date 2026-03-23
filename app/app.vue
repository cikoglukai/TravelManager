<template>
  <div class="app">
    <nav v-if="user" class="navbar">
      <NuxtLink to="/trips" class="nav-brand">✈️ Trip Manager</NuxtLink>
      <div class="nav-links">
        <NuxtLink to="/trips">My Trips</NuxtLink>
        <NuxtLink to="/trips/new" class="nav-btn-new">+ New Trip</NuxtLink>
        <span class="nav-user">{{ user.name }}</span>
        <button class="nav-btn-logout" @click="handleLogout">Logout</button>
      </div>
    </nav>

    <NuxtPage />

    <footer class="footer">
      <p><strong>Contact:</strong> Group Members: Kai Cikoglu, Nina Karl, Johanna Prinz, Daniel Rill</p>
      <p><small>Leisure Travel App · Nuxt 3 · REST API · PostgreSQL</small></p>
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
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: #f0f4f8;
  color: #333;
  line-height: 1.6;
  min-height: 100vh;
}
a {
  color: inherit;
  text-decoration: none;
}

/* ── App shell ─────────────────────────────────────── */
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ── Navbar ─────────────────────────────────────────── */
.navbar {
  background: #2c3e50;
  color: #fff;
  height: 60px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-brand {
  color: #fff;
  font-size: 1.25rem;
  font-weight: 700;
}
.nav-links {
  display: flex;
  align-items: center;
  gap: 16px;
}
.nav-links a {
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.95rem;
  transition: color 0.2s;
}
.nav-links a:hover {
  color: #fff;
}
.nav-btn-new {
  background: #3498db;
  color: #fff !important;
  padding: 6px 14px;
  border-radius: 6px;
  font-weight: 600;
}
.nav-btn-new:hover {
  background: #2980b9;
}
.nav-user {
  background: rgba(255, 255, 255, 0.14);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
}
.nav-btn-logout {
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 0.82);
  padding: 4px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-family: inherit;
  transition: all 0.2s;
}
.nav-btn-logout:hover {
  border-color: #fff;
  color: #fff;
}

/* ── Page wrapper ────────────────────────────────────── */
.page-wrapper {
  flex: 1;
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
  padding: 36px 20px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 12px;
}
.page-header h2 {
  font-size: 1.65rem;
  color: #2c3e50;
}

/* ── Shared buttons ──────────────────────────────────── */
.btn {
  display: inline-block;
  padding: 8px 18px;
  border-radius: 7px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  border: none;
  transition: background 0.2s, opacity 0.2s;
}
.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.btn-primary {
  background: #3498db;
  color: #fff;
}
.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}
.btn-secondary {
  background: #95a5a6;
  color: #fff;
}
.btn-secondary:hover:not(:disabled) {
  background: #7f8c8d;
}
.btn-danger {
  background: #e74c3c;
  color: #fff;
}
.btn-danger:hover:not(:disabled) {
  background: #c0392b;
}
.btn-outline {
  background: none;
  border: 1.5px solid #3498db;
  color: #3498db;
}
.btn-outline:hover {
  background: #eaf4fb;
}
.btn-back {
  color: #3498db;
  font-size: 0.95rem;
  font-weight: 600;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}
.btn-back:hover {
  text-decoration: underline;
}

/* ── Loading / empty states ──────────────────────────── */
.loading,
.empty-state {
  text-align: center;
  color: #7f8c8d;
  padding: 60px 20px;
  font-size: 1.05rem;
}
.empty-state a {
  color: #3498db;
  font-weight: 600;
}
.empty-state a:hover {
  text-decoration: underline;
}

/* ── Trip grid (list page) ───────────────────────────── */
.trip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.trip-card {
  background: #fff;
  border-radius: 10px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
  border-left: 4px solid #3498db;
  display: block;
  transition: transform 0.15s, box-shadow 0.15s;
}
.trip-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}
.trip-card-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 6px;
}
.trip-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.trip-card-desc {
  color: #666;
  font-size: 0.9rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Badges ──────────────────────────────────────────── */
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.82rem;
  font-weight: 600;
}
.badge-dest {
  background: #eaf4fb;
  color: #2980b9;
}
.badge-date {
  background: #eafaf1;
  color: #27ae60;
}

/* ── Trip detail page ────────────────────────────────── */
.trip-detail {
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.07);
}
.trip-detail h1 {
  font-size: 1.9rem;
  color: #2c3e50;
  margin-bottom: 14px;
}
.trip-detail-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 28px;
}
.trip-section {
  margin-bottom: 24px;
}
.trip-section h3 {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #95a5a6;
  margin-bottom: 8px;
}
.trip-section p {
  color: #444;
  white-space: pre-wrap;
}
.trip-detail-actions {
  display: flex;
  gap: 12px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

/* ── Error message ───────────────────────────────────── */
.form-error {
  color: #e74c3c;
  background: #fef0ef;
  border-radius: 7px;
  padding: 9px 14px;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

/* ── Footer ──────────────────────────────────────────── */
.footer {
  text-align: center;
  padding: 20px;
  border-top: 1px solid #ddd;
  color: #7f8c8d;
  font-size: 0.88rem;
  background: #fff;
  margin-top: auto;
  line-height: 1.8;
}
</style>