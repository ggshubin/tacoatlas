// Mock dependencies
jest.mock('../vendorRepository', () => ({
  vendorRepository: {
    createVendor: jest.fn().mockResolvedValue({ id: 'server-vendor-id', name: 'El Gordo' }),
  },
}))

jest.mock('../reviewRepository', () => ({
  reviewRepository: {
    createReview: jest.fn().mockResolvedValue({ id: 'server-review-id' }),
  },
}))

const mockStorageStore: Record<string, string> = {}
jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn(() => ({
    getString: (key: string) => mockStorageStore[key],
    set: (key: string, value: string) => { mockStorageStore[key] = value },
    remove: (key: string) => { delete mockStorageStore[key] },
  })),
}))

jest.mock('nanoid/non-secure', () => ({
  nanoid: jest.fn(() => 'test-' + Math.random().toString(36).slice(2, 6)),
}))

import { syncService } from '../syncService'
import { localStorageService } from '../localStorage'
import { vendorRepository } from '../vendorRepository'
import { reviewRepository } from '../reviewRepository'

beforeEach(() => {
  localStorageService.clearAll()
  Object.keys(mockStorageStore).forEach(k => delete mockStorageStore[k])
  jest.clearAllMocks()
})

describe('syncService', () => {
  it('returns synced: 0 when no local vendors', async () => {
    const result = await syncService.syncGuestDataToSupabase('user-1')
    expect(result.synced).toBe(0)
  })

  it('creates vendors and reviews in Supabase', async () => {
    const vendor = localStorageService.addVendor({
      name: 'El Gordo', lat: 33.4, lng: -112.0,
      address: null, cityName: 'Phoenix', hours: null, photoUri: null,
    })
    localStorageService.addReview({
      vendorLocalId: vendor.localId,
      overallRating: 5, returnIntent: 'yes',
      notes: 'Amazing', photoUris: [],
      tacoEntries: [{ tacoType: 'Al Pastor', rating: 5, notes: null }],
      salsaEntries: [], condiments: ['cilantro'],
    })

    const result = await syncService.syncGuestDataToSupabase('user-1')

    expect(vendorRepository.createVendor).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'El Gordo', submitted_by: 'user-1' })
    )
    expect(reviewRepository.createReview).toHaveBeenCalledTimes(1)
    expect(result.synced).toBe(1)
  })

  it('clears local storage after sync', async () => {
    localStorageService.addVendor({
      name: 'Test', lat: 0, lng: 0,
      address: null, cityName: null, hours: null, photoUri: null,
    })

    await syncService.syncGuestDataToSupabase('user-1')
    expect(localStorageService.getVendors()).toHaveLength(0)
  })
})
