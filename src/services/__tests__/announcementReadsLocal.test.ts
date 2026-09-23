import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocalReadIds, setLocalReadIds, clearLocalReadIds } from '../announcementReadsLocal'

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
