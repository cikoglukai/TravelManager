import { useApiFetch } from './useApiFetch.js'

// Shared reactive set of UIDs the current user follows. Hydrated once on first call, then
// kept in sync via toggle().
const _following = useState('following', () => new Set())
const _loaded = useState('followingLoaded', () => false)

export const useFollow = () => {
  const { apiFetch } = useApiFetch()

  async function load() {
    if (_loaded.value) return
    try {
      const list = await apiFetch('/api/follows/me')
      _following.value = new Set(list)
      _loaded.value = true
    } catch {
      _loaded.value = true   // soft fail — unfollowed-state assumed
    }
  }

  function isFollowing(uid) {
    return _following.value.has(uid)
  }

  async function toggle(uid) {
    if (_following.value.has(uid)) {
      await apiFetch(`/api/follows/${uid}`, { method: 'DELETE' })
      _following.value.delete(uid)
    } else {
      await apiFetch(`/api/follows/${uid}`, { method: 'POST' })
      _following.value.add(uid)
    }
    // Trigger reactivity on Set mutation.
    _following.value = new Set(_following.value)
  }

  return { load, isFollowing, toggle, following: _following }
}
