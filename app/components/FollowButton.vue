<!-- Follow/unfollow toggle. Safe inside card links (stops click propagation).
     Hidden when logged out or when the target is the current user. -->
<template>
  <button
    v-if="show"
    class="btn follow-btn"
    :class="following ? 'btn-outline' : 'btn-gold'"
    :disabled="busy"
    @click.stop.prevent="onClick"
  >
    {{ following ? 'Following' : 'Follow' }}
  </button>
</template>

<script setup>
const props = defineProps({
  uid: { type: String, required: true },
})

const { user } = useAuth()
const { isFollowing, isPending, toggle } = useFollows()

const show      = computed(() => Boolean(user.value) && props.uid !== user.value?.firebase_uid)
const following = computed(() => isFollowing(props.uid))
const busy      = computed(() => isPending(props.uid))

async function onClick() {
  try {
    await toggle(props.uid)
  } catch { /* optimistic state already reverted in composable */ }
}
</script>

<style scoped>
.follow-btn {
  padding: 6px 18px;
  font-size: 0.82rem;
}
</style>
