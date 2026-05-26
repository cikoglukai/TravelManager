// Shared follow-graph state. One reactive Set of followee UIDs so every Follow
// button (community cards, discover list, profiles) stays in sync. Backed by the
// social-service follow endpoints, which are an ungated free primitive.
export const useFollows = () => {
  const { user } = useAuth()
  const { apiFetch } = useApiFetch()

  // useState gives us a single shared instance across all components.
  const followingUids = useState('follows', () => new Set())
  const loaded = useState('followsLoaded', () => false)
  const pending = useState('followsPending', () => new Set())

  // Fetch the follow list once per session. Safe to call repeatedly.
  const loadFollows = async () => {
    if (loaded.value || !user.value) return
    try {
      const uids = await apiFetch('/api/feed/follows')
      followingUids.value = new Set(uids)
      loaded.value = true
    } catch { /* leave empty; buttons stay in "Follow" state */ }
  }

  const isFollowing = (uid) => followingUids.value.has(uid)
  const isPending   = (uid) => pending.value.has(uid)

  // Optimistic toggle: mutate the Set immediately, revert if the request fails.
  const _setMutate = (fn) => { followingUids.value = fn(new Set(followingUids.value)) }
  const _pendMutate = (fn) => { pending.value = fn(new Set(pending.value)) }

  const follow = async (uid) => {
    if (!user.value || uid === user.value.firebase_uid || isPending(uid)) return
    _setMutate((s) => s.add(uid) && s)
    _pendMutate((s) => s.add(uid) && s)
    try {
      await apiFetch(`/api/feed/follows/${uid}`, { method: 'POST' })
    } catch (err) {
      _setMutate((s) => { s.delete(uid); return s })
      throw err
    } finally {
      _pendMutate((s) => { s.delete(uid); return s })
    }
  }

  const unfollow = async (uid) => {
    if (!user.value || isPending(uid)) return
    _setMutate((s) => { s.delete(uid); return s })
    _pendMutate((s) => s.add(uid) && s)
    try {
      await apiFetch(`/api/feed/follows/${uid}`, { method: 'DELETE' })
    } catch (err) {
      _setMutate((s) => s.add(uid) && s)
      throw err
    } finally {
      _pendMutate((s) => { s.delete(uid); return s })
    }
  }

  const toggle = (uid) => (isFollowing(uid) ? unfollow(uid) : follow(uid))

  return { followingUids, loadFollows, isFollowing, isPending, follow, unfollow, toggle }
}
