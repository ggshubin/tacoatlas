/**
 * @jest-environment node
 */

import { localStorageService } from '../localStorage'

beforeEach(() => {
  localStorageService.clearAll()
})

describe('localStorageService', () => {
  it('adds and retrieves a vendor', () => {
    const vendor = localStorageService.addVendor({
      name: 'El Gordo',
      lat: 33.4,
      lng: -112.0,
      address: null,
      cityName: 'Phoenix',
      hours: null,
      photoUri: null,
    })

    expect(vendor.localId).toBeDefined()
    const vendors = localStorageService.getVendors()
    expect(vendors).toHaveLength(1)
    expect(vendors[0].name).toBe('El Gordo')
  })

  it('adds a review and retrieves it by vendor', () => {
    const vendor = localStorageService.addVendor({
      name: 'El Gordo', lat: 33.4, lng: -112.0,
      address: null, cityName: null, hours: null, photoUri: null,
    })

    localStorageService.addReview({
      vendorLocalId: vendor.localId,
      overallRating: 4,
      returnIntent: 'yes',
      notes: 'Incredible al pastor',
      photoUris: [],
      tacoEntries: [{ tacoType: 'Al Pastor', rating: 5, notes: null }],
      salsaEntries: [],
      condiments: ['cilantro', 'onions'],
    })

    const reviews = localStorageService.getReviewsForVendor(vendor.localId)
    expect(reviews).toHaveLength(1)
    expect(reviews[0].overallRating).toBe(4)
    expect(reviews[0].tacoEntries[0].tacoType).toBe('Al Pastor')
  })

  it('clearAll removes all vendors and reviews', () => {
    localStorageService.addVendor({
      name: 'Test', lat: 0, lng: 0, address: null, cityName: null, hours: null, photoUri: null,
    })
    localStorageService.clearAll()
    expect(localStorageService.getVendors()).toHaveLength(0)
  })
})
