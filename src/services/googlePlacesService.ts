import AsyncStorage from '@react-native-async-storage/async-storage'

const SEARCH_COUNT_KEY = 'places_search_count'
const SEARCH_DATE_KEY = 'places_search_date'
const FREE_DAILY_LIMIT = 5
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? ''

export interface GooglePlace {
  id: string
  name: string
  address: string | null
  lat: number
  lng: number
  rating: number | null
  types: string[]
}

async function getTodayString(): Promise<string> {
  return new Date().toISOString().split('T')[0]
}

export const googlePlacesService = {
  async getRemainingSearches(): Promise<number> {
    const today = await getTodayString()
    const storedDate = await AsyncStorage.getItem(SEARCH_DATE_KEY)
    if (storedDate !== today) {
      await AsyncStorage.setItem(SEARCH_DATE_KEY, today)
      await AsyncStorage.setItem(SEARCH_COUNT_KEY, '0')
      return FREE_DAILY_LIMIT
    }
    const raw = await AsyncStorage.getItem(SEARCH_COUNT_KEY)
    const count = raw ? parseInt(raw, 10) : 0
    return Math.max(0, FREE_DAILY_LIMIT - count)
  },

  async recordSearch(): Promise<void> {
    const today = await getTodayString()
    const storedDate = await AsyncStorage.getItem(SEARCH_DATE_KEY)
    if (storedDate !== today) {
      await AsyncStorage.setItem(SEARCH_DATE_KEY, today)
      await AsyncStorage.setItem(SEARCH_COUNT_KEY, '1')
    } else {
      const raw = await AsyncStorage.getItem(SEARCH_COUNT_KEY)
      const count = raw ? parseInt(raw, 10) : 0
      await AsyncStorage.setItem(SEARCH_COUNT_KEY, String(count + 1))
    }
  },

  // Test helper — not for production use
  async resetSearchCount(): Promise<void> {
    await AsyncStorage.removeItem(SEARCH_COUNT_KEY)
    await AsyncStorage.removeItem(SEARCH_DATE_KEY)
  },

  async searchNearby(lat: number, lng: number, radiusMeters = 5000): Promise<GooglePlace[]> {
    if (!API_KEY) {
      console.warn('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is not set')
      return []
    }

    const remaining = await this.getRemainingSearches()
    if (remaining <= 0) return []

    const body = {
      includedTypes: ['mexican_restaurant', 'restaurant'],
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusMeters,
        },
      },
      rankPreference: 'DISTANCE',
      maxResultCount: 20,
    }

    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error('Google Places API error:', await res.text())
      return []
    }

    const data = await res.json()
    await this.recordSearch()

    return (data.places ?? []).map((p: any): GooglePlace => ({
      id: p.id,
      name: p.displayName?.text ?? 'Unknown',
      address: p.formattedAddress ?? null,
      lat: p.location?.latitude ?? 0,
      lng: p.location?.longitude ?? 0,
      rating: p.rating ?? null,
      types: p.types ?? [],
    }))
  },
}
