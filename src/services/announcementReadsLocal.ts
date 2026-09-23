import AsyncStorage from '@react-native-async-storage/async-storage'

// Read receipts for signed-out (local-first) users. Merged into
// announcement_reads and cleared on sign-in by announcementStore.
const KEY = 'announcements:read_ids'

export async function getLocalReadIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch (e: unknown) {
    console.warn('[announcements] local read ids unreadable, resetting:', e)
    return []
  }
}

export async function setLocalReadIds(ids: readonly string[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify([...new Set(ids)]))
}

export async function clearLocalReadIds(): Promise<void> {
  await AsyncStorage.removeItem(KEY)
}
