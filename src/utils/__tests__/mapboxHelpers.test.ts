import { toMapboxCoord, toBoundsFromCoords, deltaToZoom } from '../mapboxHelpers'

describe('toMapboxCoord', () => {
  it('returns [longitude, latitude] — note reversed order vs react-native-maps', () => {
    expect(toMapboxCoord({ latitude: 37.7749, longitude: -122.4194 })).toEqual([-122.4194, 37.7749])
  })
})

describe('toBoundsFromCoords', () => {
  it('computes ne/sw bounding box with padding from a list of lat/lng objects', () => {
    const coords = [
      { latitude: 37.7, longitude: -122.5 },
      { latitude: 37.8, longitude: -122.3 },
    ]
    const bounds = toBoundsFromCoords(coords, 0.01)
    expect(bounds.ne[0]).toBeCloseTo(-122.29) // lng
    expect(bounds.ne[1]).toBeCloseTo(37.81)   // lat
    expect(bounds.sw[0]).toBeCloseTo(-122.51)
    expect(bounds.sw[1]).toBeCloseTo(37.69)
  })

  it('returns a non-zero box when given a single point', () => {
    const bounds = toBoundsFromCoords([{ latitude: 37.7749, longitude: -122.4194 }], 0.05)
    expect(bounds.ne[1]).toBeGreaterThan(bounds.sw[1])
    expect(bounds.ne[0]).toBeGreaterThan(bounds.sw[0])
  })
})

describe('deltaToZoom', () => {
  it('converts a latitudeDelta of 0.05 to a street-level zoom', () => {
    const zoom = deltaToZoom(0.05)
    expect(zoom).toBeGreaterThan(11)
    expect(zoom).toBeLessThan(15)
  })

  it('converts a latitudeDelta of 10 to a country-level zoom', () => {
    const zoom = deltaToZoom(10)
    expect(zoom).toBeGreaterThan(4)
    expect(zoom).toBeLessThan(8)
  })
})
