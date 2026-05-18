<script setup>
const tenant = useState('tenant', () => ({ plan: 'free' }))
const plan = computed(() => tenant.value?.plan || 'free')
</script>

<template>
  <span class="plan-badge" :class="`plan-${plan}`">{{ plan }}</span>
</template>

<style scoped>
.plan-badge {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.plan-free       { background: #e2e8f0; color: #475569; }
.plan-standard   { background: #dbeafe; color: #1e3a8a; }
.plan-enterprise { background: #fef3c7; color: #92400e; }
</style>
