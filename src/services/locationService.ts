import * as Location from 'expo-location'

export interface Coordinates {
  lat: number
  lng: number
}

export const locationService = {
  async requestPermission(): Promise<boolean> {
    const { status } = await Location.requestForegroundPermissionsAsync()
    return status === 'granted'
  },

  async getCurrentLocation(): Promise<Coordinates | null> {
    const hasPermission = await locationService.requestPermission()
    if (!hasPermission) return null

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      return {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      }
    } catch {
      // Location unavailable (simulator, services off, etc.) — return null gracefully
      return null
    }
  },

  async reverseGeocode(coords: Coordinates): Promise<string | null> {
    const results = await Location.reverseGeocodeAsync({
      latitude: coords.lat,
      longitude: coords.lng,
    })

    if (!results.length) return null
    const r = results[0]
    return [r.streetNumber, r.street, r.city, r.region].filter(Boolean).join(' ')
  },

  distanceKm(a: Coordinates, b: Coordinates): number {
    const R = 6371
    const dLat = ((b.lat - a.lat) * Math.PI) / 180
    const dLng = ((b.lng - a.lng) * Math.PI) / 180
    const lat1 = (a.lat * Math.PI) / 180
    const lat2 = (b.lat * Math.PI) / 180
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
  },
}
