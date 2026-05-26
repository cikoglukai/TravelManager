// Promise-based confirm dialog, replacing blocking window.confirm(). Shared
// module state, rendered once by <ConfirmDialog/> in app.vue.
//
//   const { confirm } = useConfirm()
//   if (!(await confirm({ title: 'Delete trip?', message: '…', danger: true }))) return
import { reactive } from 'vue'

const state = reactive({
  open: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  danger: false,
  _resolve: null,
})

function answer(value) {
  state.open = false
  state._resolve?.(value)
  state._resolve = null
}

export function useConfirm() {
  function confirm({ title, message = '', confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
    state.title = title
    state.message = message
    state.confirmText = confirmText
    state.cancelText = cancelText
    state.danger = danger
    state.open = true
    return new Promise((resolve) => { state._resolve = resolve })
  }
  return { state, confirm, answer }
}
