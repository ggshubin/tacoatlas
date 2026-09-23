import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  getLocalReadIds, setLocalReadIds, clearLocalReadIds, getOrCreateLocalSince,
} from '../announcementReadsLocal'

beforeEach(async () => {
  await AsyncStorage.clear()
})

it('returns [] when nothing is stored', async () => {
  await expect(getLocalReadIds()).resolves.toEqual([])
})

it('round-trips ids and de-duplicates', async () => {
  await setLocalReadIds(['a', 'b', 'a'])
  await expect(getLocalReadIds()).resolves.toEqual(['a', 'b'])
})

it('returns [] and resets storage for corrupt JSON instead of throwing', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
  await AsyncStorage.setItem('announcements:read_ids', '{not json')
  await expect(getLocalReadIds()).resolves.toEqual([])
  expect(warn).toHaveBeenCalled()
  await expect(AsyncStorage.getItem('announcements:read_ids')).resolves.toBeNull()
  warn.mockRestore()
})

it('drops non-string entries', async () => {
  await AsyncStorage.setItem('announcements:read_ids', JSON.stringify(['a', 3, null]))
  await expect(getLocalReadIds()).resolves.toEqual(['a'])
})

it('clears', async () => {
  await setLocalReadIds(['a'])
  await clearLocalReadIds()
  await expect(getLocalReadIds()).resolves.toEqual([])
})

describe('getOrCreateLocalSince', () => {
  it('creates and stores a since timestamp when none exists', async () => {
    const since = await getOrCreateLocalSince()
    expect(new Date(since).toISOString()).toBe(since)
    await expect(AsyncStorage.getItem('announcements:since')).resolves.toBe(since)
  })

  it('reuses a previously stored since timestamp', async () => {
    const first = await getOrCreateLocalSince()
    const second = await getOrCreateLocalSince()
    expect(second).toBe(first)
  })

  it('replaces an invalid stored value with a fresh timestamp', async () => {
    await AsyncStorage.setItem('announcements:since', 'not-a-date')
    const since = await getOrCreateLocalSince()
    expect(new Date(since).toISOString()).toBe(since)
    await expect(AsyncStorage.getItem('announcements:since')).resolves.toBe(since)
  })

  it('warns and returns now without throwing on storage errors', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('boom'))
    const since = await getOrCreateLocalSince()
    expect(new Date(since).toISOString()).toBe(since)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
