// Local (guest) versions of entities — no UUIDs yet

export type SpotType = 'Truck' | 'Food Cart' | 'Street Tent' | 'Restaurant' | 'House' | 'Brick & Mortar'
export type PrivacySetting = 'public' | 'friends' | 'private'
export type HeatLevel = 'mild' | 'medium' | 'hot' | 'fire' | 'volcano'
export type ReturnIntent = 'yes' | 'maybe' | 'no'

export interface LocalVendor {
  localId: string
  name: string
  spotType: SpotType | null
  lat: number
  lng: number
  address: string | null
  cityName: string | null
  hours: string | null
  photoUri: string | null
  createdAt: string
  // New fields (safe defaults: undefined treated as 'public' / null / false)
  privacy?: PrivacySetting        // default 'public' when undefined
  spotNote?: string | null        // "About This Spot" — persists across visits
  isVisited?: boolean             // false = drop-a-pin only, true = has at least one review
  supabaseVendorId?: string       // Supabase UUID once synced
}

export interface LocalReview {
  localId: string
  vendorLocalId: string
  overallRating: number
  returnIntent: ReturnIntent | null
  notes: string | null
  photoUris: string[]
  tacoEntries: LocalTacoEntry[]
  salsaEntries: LocalSalsaEntry[]
  condiments: string[]
  createdAt: string
  // New fields
  burritoEntries?: LocalBurritoEntry[]   // Pro only, default []
  tortaEntries?: LocalTortaEntry[]       // Pro only, default []
  supabaseReviewId?: string              // Supabase UUID once synced
}

export interface LocalTacoEntry {
  tacoType: string
  rating: number
  notes: string | null
}

// New: burrito entries mirror taco entries
export interface LocalBurritoEntry {
  burritoType: string
  rating: number
  notes: string | null
}

// New: torta entries
export interface LocalTortaEntry {
  tortaType: string
  rating: number
  notes: string | null
}

export interface LocalSalsaEntry {
  salsaName: string
  flavorRating: number
  heatLevel: HeatLevel | null
  notes?: string | null    // New: quick note per salsa
}
