/**
 * @jest-environment node
 */

jest.mock('nanoid/non-secure', () => ({
  nanoid: jest.fn(() => 'test-' + Math.random().toString(36).slice(2, 6)),
}))

import { localStorageService } from '../localStorage'
import AsyncStorage from '@react-native-async-storage/async-storage'

beforeEach(async () => {
  await localStorageService.clearAll()
})

describe('localStorageService', () => {
  it('adds and retrieves a vendor', async () => {
    const vendor = await localStorageService.addVendor({
      name: 'El Gordo',
      spotType: null,
      lat: 33.4,
      lng: -112.0,
      address: null,
      cityName: 'Phoenix',
      hours: null,
      photoUri: null,
    })

    expect(vendor.localId).toBeDefined()
    const vendors = await localStorageService.getVendors()
    expect(vendors).toHaveLength(1)
    expect(vendors[0].name).toBe('El Gordo')
  })

  it('adds a review and retrieves it by vendor', async () => {
    const vendor = await localStorageService.addVendor({
      name: 'El Gordo', spotType: null, lat: 33.4, lng: -112.0,
      address: null, cityName: null, hours: null, photoUri: null,
    })

    await localStorageService.addReview({
      vendorLocalId: vendor.localId,
      overallRating: 4,
      returnIntent: 'yes',
      notes: 'Incredible al pastor',
      photoUris: [],
      tacoEntries: [{ tacoType: 'Al Pastor', rating: 5, notes: null }],
      salsaEntries: [],
      condiments: ['cilantro', 'onions'],
    })

    const reviews = await localStorageService.getReviewsForVendor(vendor.localId)
    expect(reviews).toHaveLength(1)
    expect(reviews[0].overallRating).toBe(4)
    expect(reviews[0].tacoEntries[0].tacoType).toBe('Al Pastor')
  })

  it('clearAll removes all vendors and reviews', async () => {
    await localStorageService.addVendor({
      name: 'Test', spotType: null, lat: 0, lng: 0, address: null, cityName: null, hours: null, photoUri: null,
    })
    await localStorageService.clearAll()
    const vendors = await localStorageService.getVendors()
    expect(vendors).toHaveLength(0)
  })

  describe('normalizeVendor via getVendors', () => {
    it('fills privacy default when missing', async () => {
      await AsyncStorage.setItem('local_vendors', JSON.stringify([
        { localId: 'abc', name: 'Test', spotType: null, lat: 0, lng: 0,
          address: null, cityName: null, hours: null, photoUri: null, createdAt: '2026-01-01' }
      ]))
      const vendors = await localStorageService.getVendors()
      expect(vendors[0].privacy).toBe('public')
      expect(vendors[0].spotNote).toBeNull()
      expect(vendors[0].isVisited).toBe(true)
    })
  })

  describe('normalizeReview via getReviewsForVendor', () => {
    it('fills burritoEntries and tortaEntries defaults when missing', async () => {
      await AsyncStorage.setItem('local_reviews', JSON.stringify([
        { localId: 'r1', vendorLocalId: 'abc', overallRating: 4,
          returnIntent: 'yes', notes: null, photoUris: [], tacoEntries: [],
          salsaEntries: [], condiments: [], createdAt: '2026-01-01' }
      ]))
      const reviews = await localStorageService.getReviewsForVendor('abc')
      expect(reviews[0].burritoEntries).toEqual([])
      expect(reviews[0].tortaEntries).toEqual([])
    })
  })

  describe('updateVendor and markVendorVisited', () => {
    it('updateVendor modifies vendor fields', async () => {
      const vendor = await localStorageService.addVendor({
        name: 'Test Spot',
        spotType: null,
        lat: 0, lng: 0,
        address: null, cityName: null, hours: null, photoUri: null,
      })

      await localStorageService.updateVendor(vendor.localId, {
        privacy: 'private',
        spotNote: 'Great tacos!',
        isVisited: false,
      })

      const updated = await localStorageService.getVendorByLocalId(vendor.localId)
      expect(updated?.privacy).toBe('private')
      expect(updated?.spotNote).toBe('Great tacos!')
      expect(updated?.isVisited).toBe(false)
    })

    it('markVendorVisited sets isVisited to true', async () => {
      const vendor = await localStorageService.addVendor({
        name: 'Test Spot',
        spotType: null,
        lat: 0, lng: 0,
        address: null, cityName: null, hours: null, photoUri: null,
      })

      await localStorageService.markVendorVisited(vendor.localId)

      const updated = await localStorageService.getVendorByLocalId(vendor.localId)
      expect(updated?.isVisited).toBe(true)
    })
  })
})
