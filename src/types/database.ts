export type VendorStatus = 'pending' | 'approved'
export type ReturnIntent = 'yes' | 'maybe' | 'no'
export type HeatLevel = 'mild' | 'medium' | 'hot' | 'fire' | 'volcano'

export interface City {
  id: string
  name: string
  state_region: string | null
  country: string
  created_at: string
}

export interface Vendor {
  id: string
  name: string
  lat: number
  lng: number
  address: string | null
  city_id: string | null
  hours: string | null
  photo_url: string | null
  status: VendorStatus
  submitted_by: string | null
  created_at: string
  city?: City
}

export interface Review {
  id: string
  vendor_id: string
  user_id: string
  overall_rating: number
  return_intent: ReturnIntent | null
  notes: string | null
  photos: string[]
  is_public: boolean
  created_at: string
  taco_entries?: TacoEntry[]
  salsa_entries?: SalsaEntry[]
  condiments?: Condiment[]
}

export interface TacoEntry {
  id: string
  review_id: string
  taco_type: string
  rating: number
  notes: string | null
  created_at: string
}

export interface SalsaEntry {
  id: string
  review_id: string
  salsa_name: string
  flavor_rating: number
  heat_level: HeatLevel | null
  created_at: string
}

export interface Condiment {
  id: string
  review_id: string
  name: string
  created_at: string
}

export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  home_city: string | null
  favorite_taco: string | null
  is_admin: boolean
  is_pro: boolean
  created_at: string
}
