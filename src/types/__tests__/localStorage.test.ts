import { localStorageService } from '../../services/localStorage'

// AsyncStorage is mocked via moduleNameMapper in package.json

beforeEach(async () => {
  await localStorageService.clearAll()
})

describe('localStorageService.getVendorCount', () => {
  it('returns 0 when no vendors exist', async () => {
    const count = await localStorageService.getVendorCount()
    expect(count).toBe(0)
  })

  it('returns correct count after adding vendors', async () => {
    await localStorageService.addVendor({
      name: 'Taco Spot 1', spotType: 'Truck',
      lat: 0, lng: 0, address: null, cityName: null, hours: null, photoUri: null,
    })
    await localStorageService.addVendor({
      name: 'Taco Spot 2', spotType: 'Truck',
      lat: 0, lng: 0, address: null, cityName: null, hours: null, photoUri: null,
    })
    const count = await localStorageService.getVendorCount()
    expect(count).toBe(2)
  })
})

describe('localStorageService.isAtFreeLimit', () => {
  it('returns false when under 15 spots', async () => {
    expect(await localStorageService.isAtFreeLimit()).toBe(false)
  })
})
