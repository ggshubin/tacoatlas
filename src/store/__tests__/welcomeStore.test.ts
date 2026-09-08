import AsyncStorage from '@react-native-async-storage/async-storage'
import { useWelcomeStore } from '../welcomeStore'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}))

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>

beforeEach(() => {
  jest.clearAllMocks()
  useWelcomeStore.setState({ showOnLaunch: true, hydrated: false })
})

describe('welcomeStore.hydrate', () => {
  it('shows the guide when the preference was never set', async () => {
    mockStorage.getItem.mockResolvedValue(null)
    await useWelcomeStore.getState().hydrate()
    expect(useWelcomeStore.getState().showOnLaunch).toBe(true)
    expect(useWelcomeStore.getState().hydrated).toBe(true)
  })

  it('respects an explicit opt-out', async () => {
    mockStorage.getItem.mockResolvedValue('false')
    await useWelcomeStore.getState().hydrate()
    expect(useWelcomeStore.getState().showOnLaunch).toBe(false)
  })

  it('still marks hydrated when storage throws, so routing never hangs', async () => {
    mockStorage.getItem.mockRejectedValue(new Error('storage unavailable'))
    await useWelcomeStore.getState().hydrate()
    expect(useWelcomeStore.getState().hydrated).toBe(true)
    expect(useWelcomeStore.getState().showOnLaunch).toBe(true)
  })
})

describe('welcomeStore.setShowOnLaunch', () => {
  it('persists the opt-out', async () => {
    await useWelcomeStore.getState().setShowOnLaunch(false)
    expect(mockStorage.setItem).toHaveBeenCalledWith('showWelcomeOnLaunch', 'false')
    expect(useWelcomeStore.getState().showOnLaunch).toBe(false)
  })

  it('persists turning it back on', async () => {
    await useWelcomeStore.getState().setShowOnLaunch(true)
    expect(mockStorage.setItem).toHaveBeenCalledWith('showWelcomeOnLaunch', 'true')
    expect(useWelcomeStore.getState().showOnLaunch).toBe(true)
  })

  it('keeps the in-memory choice even if the write fails', async () => {
    mockStorage.setItem.mockRejectedValue(new Error('disk full'))
    await useWelcomeStore.getState().setShowOnLaunch(false)
    expect(useWelcomeStore.getState().showOnLaunch).toBe(false)
  })
})
