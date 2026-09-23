import AsyncStorage from '@react-native-async-storage/async-storage'

// Read receipts for signed-out (local-first) users. Merged into
// announcement_reads and cleared on sign-in by announcementStore.
const KEY = 'announcements:read_ids'

// First-seen timestamp for a signed-out device, used as the unread cutoff so
// a new user never sees a backlog of older announcements as unread.
const SINCE_KEY = 'announcements:since'

export async function getLocalReadIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch (e: unknown) {
    console.warn('[announcements] local read ids unreadable, resetting:', e)
    await AsyncStorage.removeItem(KEY).catch(() => {})
    return []
  }
}

export async function setLocalReadIds(ids: readonly string[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify([...new Set(ids)]))
}

export async function clearLocalReadIds(): Promise<void> {
  await AsyncStorage.removeItem(KEY)
}

export async function getOrCreateLocalSince(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(SINCE_KEY)
    if (stored !== null && !Number.isNaN(Date.parse(stored))) return stored
    const now = new Date().toISOString()
    await AsyncStorage.setItem(SINCE_KEY, now)
    return now
  } catch (e: unknown) {
    console.warn('[announcements] local since unavailable, using now:', e)
    return new Date().toISOString()
  }
}
