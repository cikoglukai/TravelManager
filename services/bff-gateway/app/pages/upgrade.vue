<script setup>
const route = useRoute()
const need = computed(() => route.query.need || 'standard')
</script>

<template>
  <div class="upgrade-page">
    <h1>Upgrade your plan</h1>
    <p v-if="need === 'enterprise'">This feature is available on the <strong>Enterprise</strong> plan.</p>
    <p v-else>This feature is available on the <strong>Standard</strong> or <strong>Enterprise</strong> plan.</p>

    <div class="plans">
      <div class="plan">
        <h2>Free</h2>
        <p class="price">€0</p>
        <ul>
          <li>Trip CRUD</li>
          <li>Read social feed</li>
          <li>Best-effort SLA</li>
        </ul>
      </div>
      <div class="plan plan-feature">
        <h2>Standard</h2>
        <p class="price">€19 / mo</p>
        <ul>
          <li>Everything in Free</li>
          <li>White-label branding</li>
          <li>Destination products marketplace</li>
          <li>Weekly newsletter to followers</li>
          <li>99.5 % SLA</li>
        </ul>
      </div>
      <div class="plan plan-feature">
        <h2>Enterprise</h2>
        <p class="price">Contact us</p>
        <ul>
          <li>Everything in Standard</li>
          <li>B2B traveller-insights dashboard</li>
          <li>Dedicated database</li>
          <li>SSO (SAML/OIDC)</li>
          <li>99.9 % SLA</li>
        </ul>
      </div>
    </div>

    <p class="contact">Need help? <a href="mailto:sales@travelmanager.app">sales@travelmanager.app</a></p>
  </div>
</template>

<style scoped>
.upgrade-page { max-width: 980px; margin: 2rem auto; padding: 0 1rem; }
h1 { margin: 0 0 0.5rem; }
.plans { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 2rem 0; }
@media (max-width: 720px) { .plans { grid-template-columns: 1fr; } }
.plan { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
.plan-feature { outline: 2px solid var(--navy, #0f172a); }
.plan h2 { margin: 0 0 0.5rem; }
.price { font-size: 1.6rem; font-weight: 700; margin: 0 0 1rem; }
.plan ul { padding-left: 1.25rem; }
.contact { text-align: center; color: #64748b; }
</style>
