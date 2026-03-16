// Local (guest) versions of entities — no UUIDs yet

export interface LocalVendor {
  localId: string
  name: string
  lat: number
  lng: number
  address: string | null
  cityName: string | null
  hours: string | null
  photoUri: string | null
  createdAt: string
}

export interface LocalReview {
  localId: string
  vendorLocalId: string
  overallRating: number
  returnIntent: 'yes' | 'maybe' | 'no' | null
  notes: string | null
  photoUris: string[]
  tacoEntries: LocalTacoEntry[]
  salsaEntries: LocalSalsaEntry[]
  condiments: string[]
  createdAt: string
}

export interface LocalTacoEntry {
  tacoType: string
  rating: number
  notes: string | null
}

export interface LocalSalsaEntry {
  salsaName: string
  flavorRating: number
  heatLevel: 'mild' | 'medium' | 'hot' | 'fire' | null
}
