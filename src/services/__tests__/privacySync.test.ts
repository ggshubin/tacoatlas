import { syncService } from '../syncService'
import { localStorageService } from '../localStorage'

jest.mock('../localStorage', () => ({
  localStorageService: {
    updateVendor: jest.fn().mockResolvedValue(undefined),
    getVendors: jest.fn(),
    getReviewsForVendor: jest.fn(),
  },
}))
jest.mock('../supabase', () => ({ supabase: {} }))
jest.mock('../vendorRepository', () => ({ vendorRepository: {} }))
jest.mock('../reviewRepository', () => ({ reviewRepository: {} }))

const mockStorage = localStorageService as jest.Mocked<typeof localStorageService>

describe('updateVendorPrivacy', () => {
  beforeEach(() => jest.clearAllMocks())

  it('updates the local vendor and live-syncs each review when signed in', async () => {
    const liveSyncSpy = jest.spyOn(syncService, 'liveSync').mockResolvedValue(undefined)
    mockStorage.getReviewsForVendor.mockResolvedValue([
      { localId: 'r1' } as any,
      { localId: 'r2' } as any,
    ])
    await syncService.updateVendorPrivacy('v1', 'public', 'user-1')
    expect(mockStorage.updateVendor).toHaveBeenCalledWith('v1', { privacy: 'public' })
    expect(liveSyncSpy).toHaveBeenCalledTimes(2)
    expect(liveSyncSpy).toHaveBeenCalledWith('v1', { localId: 'r1' }, 'user-1')
    liveSyncSpy.mockRestore()
  })

  it('updates locally but skips sync when no userId', async () => {
    const liveSyncSpy = jest.spyOn(syncService, 'liveSync').mockResolvedValue(undefined)
    await syncService.updateVendorPrivacy('v1', 'friends')
    expect(mockStorage.updateVendor).toHaveBeenCalledWith('v1', { privacy: 'friends' })
    expect(liveSyncSpy).not.toHaveBeenCalled()
    liveSyncSpy.mockRestore()
  })
})

describe('bulkPublishPrivateSpots', () => {
  beforeEach(() => jest.clearAllMocks())

  it('publishes only explicitly private vendors and returns the count', async () => {
    const updateSpy = jest.spyOn(syncService, 'updateVendorPrivacy').mockResolvedValue(undefined)
    mockStorage.getVendors.mockResolvedValue([
      { localId: 'v1', privacy: 'private' } as any,
      { localId: 'v2', privacy: 'public' } as any,
      { localId: 'v3', privacy: 'friends' } as any,
      { localId: 'v4' } as any, // undefined privacy = public by convention — untouched
      { localId: 'v5', privacy: 'private' } as any,
    ])
    const count = await syncService.bulkPublishPrivateSpots('user-1')
    expect(count).toBe(2)
    expect(updateSpy).toHaveBeenCalledTimes(2)
    expect(updateSpy).toHaveBeenCalledWith('v1', 'public', 'user-1')
    expect(updateSpy).toHaveBeenCalledWith('v5', 'public', 'user-1')
    updateSpy.mockRestore()
  })
})
