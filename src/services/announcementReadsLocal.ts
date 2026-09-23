import AsyncStorage from '@react-native-async-storage/async-storage'

// Read receipts for signed-out (local-first) users. Merged into
// announcement_reads and cleared on sign-in by announcementStore.
const KEY = 'announcements:read_ids'

// Clock-free seeding flag for a signed-out device: on first refresh, every
// currently-fetched announcement is marked read so a new (or freshly
// signed-out) device never sees a backlog of older items as unread, without
// relying on the device clock.
const SEEDED_KEY = 'announcements:seeded'

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

export async function isLocalSeeded(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SEEDED_KEY)) === '1'
  } catch (e: unknown) {
    // Fail quiet: treat an unreadable flag as already seeded so a storage
    // error never dumps a backlog of older announcements as unread.
    console.warn('[announcements] local seeded flag unreadable, treating as seeded:', e)
    return true
  }
}

export async function markLocalSeeded(): Promise<void> {
  await AsyncStorage.setItem(SEEDED_KEY, '1')
}

export async function clearLocalSeeded(): Promise<void> {
  await AsyncStorage.removeItem(SEEDED_KEY)
}
