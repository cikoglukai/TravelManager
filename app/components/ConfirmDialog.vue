<!-- Global confirm dialog (useConfirm). Mounted once in app.vue. Replaces
     window.confirm() with an on-brand, non-blocking modal. -->
<template>
  <Transition name="confirm">
    <div v-if="state.open" class="confirm-overlay" @click.self="answer(false)">
      <div class="confirm-box" role="dialog" aria-modal="true">
        <h3 class="confirm-title">{{ state.title }}</h3>
        <p v-if="state.message" class="confirm-message">{{ state.message }}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" @click="answer(false)">{{ state.cancelText }}</button>
          <button class="btn" :class="state.danger ? 'btn-danger' : 'btn-gold'" @click="answer(true)">
            {{ state.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const { state, answer } = useConfirm()

// Esc cancels, Enter confirms while the dialog is open.
function onKey(e) {
  if (!state.open) return
  if (e.key === 'Escape') answer(false)
  if (e.key === 'Enter') answer(true)
}
onMounted(() => { if (import.meta.client) window.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { if (import.meta.client) window.removeEventListener('keydown', onKey) })
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(15, 31, 61, 0.45);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.confirm-box {
  background: var(--white);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  padding: 28px 28px 22px;
  max-width: 400px;
  width: 100%;
}
.confirm-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.3rem;
  color: var(--navy);
  margin-bottom: 8px;
}
.confirm-message {
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 22px;
}
.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.confirm-enter-active, .confirm-leave-active { transition: opacity 0.2s; }
.confirm-enter-active .confirm-box, .confirm-leave-active .confirm-box { transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1); }
.confirm-enter-from, .confirm-leave-to { opacity: 0; }
.confirm-enter-from .confirm-box, .confirm-leave-to .confirm-box { transform: scale(0.94) translateY(10px); }
@media (prefers-reduced-motion: reduce) {
  .confirm-enter-active .confirm-box, .confirm-leave-active .confirm-box { transition: none; }
}
</style>
