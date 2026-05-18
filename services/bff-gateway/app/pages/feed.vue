<script setup>
import { useApiFetch } from '~/composables/useApiFetch.js'
import { useAuth } from '~/composables/useAuth.js'

definePageMeta({ middleware: [] })
const { user, authReady } = useAuth()
const { apiFetch } = useApiFetch()

const items = ref([])
const loading = ref(false)
const empty = ref(false)

async function loadFeed() {
  if (!user.value) return
  loading.value = true
  try {
    const data = await apiFetch('/api/feed')
    items.value = data || []
    empty.value = items.value.length === 0
  } catch (e) {
    console.warn('[feed] load failed:', e?.message || e)
  } finally {
    loading.value = false
  }
}

watch(() => authReady.value && user.value, () => loadFeed(), { immediate: true })

function timeAgo(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function verbLabel(verb) {
  return {
    trip_published: 'published a trip',
    liked:          'liked',
    commented:      'commented on',
    followed:       'started following',
  }[verb] || verb
}
</script>

<template>
  <div class="feed-page">
    <header class="feed-header">
      <h1>Your feed</h1>
      <p class="muted">Recent activity from people you follow.</p>
    </header>

    <div v-if="!user && authReady" class="signin-prompt">
      <p>Sign in to see a personalized feed.</p>
      <NuxtLink to="/register" class="cta">Sign in</NuxtLink>
    </div>

    <div v-else-if="loading" class="loading">Loading...</div>

    <div v-else-if="empty" class="empty">
      <h2>Quiet here</h2>
      <p>Follow other travellers to see their trips appear.</p>
      <NuxtLink to="/community" class="cta">Browse community</NuxtLink>
    </div>

    <ul v-else class="feed-list">
      <li v-for="item in items" :key="item.id" class="feed-item">
        <div class="feed-line">
          <NuxtLink :to="`/users/${item.author}`" class="author">{{ item.author }}</NuxtLink>
          <span class="verb">{{ verbLabel(item.verb) }}</span>
          <NuxtLink v-if="item.objectId" :to="`/trips/${item.objectId}`" class="object">
            {{ item.destination || `trip #${item.objectId}` }}
          </NuxtLink>
          <span class="time">{{ timeAgo(item.occurredAt) }}</span>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.feed-page { max-width: 720px; margin: 2rem auto; padding: 0 1rem; }
.feed-header h1 { font-size: 2rem; margin: 0 0 0.25rem; }
.muted { color: #64748b; }
.signin-prompt, .empty, .loading {
  margin-top: 3rem;
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.05);
}
.cta {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.6rem 1.4rem;
  background: var(--navy, #0f172a);
  color: white;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
}
.feed-list { list-style: none; padding: 0; margin: 2rem 0 0; display: grid; gap: 0.75rem; }
.feed-item {
  padding: 1rem 1.25rem;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.feed-line { display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: baseline; }
.author { font-weight: 700; color: var(--navy, #0f172a); text-decoration: none; }
.author:hover { text-decoration: underline; }
.verb { color: #475569; }
.object { color: var(--navy, #0f172a); font-weight: 600; text-decoration: none; }
.object:hover { text-decoration: underline; }
.time { margin-left: auto; color: #94a3b8; font-size: 0.85rem; }
</style>
