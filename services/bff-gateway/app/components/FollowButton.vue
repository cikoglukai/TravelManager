<script setup>
import { useFollow } from '~/composables/useFollow.js'
import { useAuth } from '~/composables/useAuth.js'

const props = defineProps({
  userUid: { type: String, required: true },
})

const { user } = useAuth()
const { load, isFollowing, toggle } = useFollow()
const busy = ref(false)

onMounted(load)

const isSelf = computed(() => user.value?.firebase_uid === props.userUid)
const following = computed(() => isFollowing(props.userUid))

async function onClick() {
  if (busy.value || isSelf.value) return
  busy.value = true
  try { await toggle(props.userUid) } finally { busy.value = false }
}
</script>

<template>
  <button
    v-if="!isSelf && user"
    class="follow-btn"
    :class="{ 'is-following': following }"
    :disabled="busy"
    @click="onClick"
  >
    <span v-if="following">✓ Following</span>
    <span v-else>+ Follow</span>
  </button>
</template>

<style scoped>
.follow-btn {
  padding: 0.4rem 1rem;
  border-radius: 999px;
  border: 1.5px solid var(--navy, #0f172a);
  background: var(--navy, #0f172a);
  color: white;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.18s;
}
.follow-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.follow-btn.is-following {
  background: transparent;
  color: var(--navy, #0f172a);
}
.follow-btn:disabled { opacity: 0.5; cursor: wait; }
</style>
