<template>
  <div></div>
</template>

<script setup>
const { user } = useAuth()

onMounted(() => {
  navigateTo(user.value ? '/trips' : '/register')
})
</script>