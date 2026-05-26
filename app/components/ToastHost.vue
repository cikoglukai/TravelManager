<!-- Renders the shared toast queue (useToast). Mounted once in app.vue.
     Fixed bottom-right, auto-dismiss handled by the composable; click to close. -->
<template>
  <div class="toast-host" aria-live="polite">
    <TransitionGroup name="toast">
      <button
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.type}`"
        @click="dismiss(t.id)"
      >
        <span class="toast-icon">{{ icon(t.type) }}</span>
        <span class="toast-msg">{{ t.message }}</span>
      </button>
    </TransitionGroup>
  </div>
</template>

<script setup>
const { toasts, dismiss } = useToast()
function icon(type) {
  return type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ'
}
</script>

<style scoped>
.toast-host {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: min(360px, calc(100vw - 40px));
}
.toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  background: var(--white);
  box-shadow: var(--shadow-lg);
  border-left: 4px solid var(--text-muted);
  font-family: inherit;
  font-size: 0.88rem;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  width: 100%;
}
.toast--success { border-left-color: var(--success); }
.toast--error   { border-left-color: var(--error); }
.toast--info    { border-left-color: var(--gold); }
.toast-icon { font-weight: 700; line-height: 1.5; }
.toast--success .toast-icon { color: var(--success); }
.toast--error   .toast-icon { color: var(--error); }
.toast--info    .toast-icon { color: var(--gold); }
.toast-msg { flex: 1; }

.toast-enter-active, .toast-leave-active { transition: all 0.28s cubic-bezier(0.2, 0.8, 0.2, 1); }
.toast-enter-from { opacity: 0; transform: translateX(24px); }
.toast-leave-to   { opacity: 0; transform: translateX(24px); }
.toast-leave-active { position: absolute; }

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active, .toast-leave-active { transition: opacity 0.2s; }
  .toast-enter-from, .toast-leave-to { transform: none; }
}
</style>
