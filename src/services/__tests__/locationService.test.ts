import { locationService } from '../locationService'

describe('locationService.distanceKm', () => {
  it('returns 0 for identical coordinates', () => {
    const coord = { lat: 33.4484, lng: -112.0740 }
    expect(locationService.distanceKm(coord, coord)).toBeCloseTo(0, 5)
  })

  it('calculates distance between Phoenix and Tucson (~170km)', () => {
    const phoenix = { lat: 33.4484, lng: -112.0740 }
    const tucson = { lat: 32.2226, lng: -110.9747 }
    const dist = locationService.distanceKm(phoenix, tucson)
    expect(dist).toBeGreaterThan(160)
    expect(dist).toBeLessThan(180)
  })

  it('is symmetric', () => {
    const a = { lat: 33.4, lng: -112.0 }
    const b = { lat: 32.2, lng: -111.0 }
    expect(locationService.distanceKm(a, b)).toBeCloseTo(locationService.distanceKm(b, a), 5)
  })
})
