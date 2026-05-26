<!-- Shared sub-navigation across the three social pages so they read as one
     section instead of three disconnected destinations. Active tab via
     router-link-active. -->
<template>
  <nav class="social-tabs">
    <NuxtLink to="/community" class="social-tab">🌐 Community</NuxtLink>
    <NuxtLink to="/discover" class="social-tab">🧭 Travellers</NuxtLink>
    <NuxtLink to="/feed" class="social-tab">📰 My Feed</NuxtLink>
  </nav>
</template>

<style scoped>
.social-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.social-tab {
  padding: 8px 18px;
  border-radius: 100px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--white);
  border: 2px solid var(--sand-dark);
  transition: all 0.2s;
}
.social-tab:hover {
  border-color: var(--gold);
  color: var(--navy);
}
.social-tab.router-link-active {
  background: var(--navy);
  border-color: var(--navy);
  color: var(--white);
}
</style>
