// App-wide toast notifications. Module-scoped state = a single shared queue
// across every caller (Nuxt auto-imports this). Rendered once by <ToastHost/>
// in app.vue. Replaces blocking window.alert() for non-critical feedback.
import { ref } from 'vue'

const toasts = ref([])
let seq = 0

function push(message, type, timeout) {
  const id = ++seq
  toasts.value.push({ id, message, type })
  if (timeout) setTimeout(() => dismiss(id), timeout)
  return id
}

function dismiss(id) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

export function useToast() {
  return {
    toasts,
    dismiss,
    toast:        (msg, timeout = 4000) => push(msg, 'info', timeout),
    toastSuccess: (msg, timeout = 3500) => push(msg, 'success', timeout),
    toastError:   (msg, timeout = 5000) => push(msg, 'error', timeout),
  }
}
