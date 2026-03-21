// src/data/mi-gente-stubs.ts
import type { SpotType } from '../types/app'

export interface FriendStub {
  username: string
  initials: string
  isActive: boolean
  pinCount: number
  reviewCount: number
  avgRating: number
}

export interface ActivityStub {
  id: string
  friend: FriendStub
  type: 'pinned' | 'reviewed'
  spotName: string
  spotType: SpotType
  lat: number
  lng: number
  address: string
  rating?: number
  note?: string
  timestamp: string
}

export const STUB_FRIENDS: FriendStub[] = [
  { username: 'marcos_r',  initials: 'MR', isActive: true,  pinCount: 14, reviewCount: 9,  avgRating: 4.6 },
  { username: 'jlo_tacos', initials: 'JL', isActive: false, pinCount: 6,  reviewCount: 4,  avgRating: 4.1 },
  { username: 'd_perez',   initials: 'DP', isActive: true,  pinCount: 8,  reviewCount: 7,  avgRating: 4.4 },
]

const [marcos, jlo, dperez] = STUB_FRIENDS

export const STUB_ACTIVITY: ActivityStub[] = [
  {
    id: 'a1', friend: marcos, type: 'reviewed',
    spotName: 'El Paisa Truck', spotType: 'Truck',
    lat: 33.4484, lng: -112.0740, address: '1234 W Van Buren St, Phoenix, AZ',
    rating: 5, note: 'Al pastor is unreal, go before 2pm', timestamp: '1h',
  },
  {
    id: 'a2', friend: dperez, type: 'reviewed',
    spotName: 'La Taqueria', spotType: 'Brick & Mortar',
    lat: 33.4512, lng: -112.0689, address: '456 N Central Ave, Phoenix, AZ',
    rating: 4, timestamp: '2d',
  },
  {
    id: 'a3', friend: marcos, type: 'reviewed',
    spotName: 'Tacos El Gordo', spotType: 'Street Tent',
    lat: 33.4455, lng: -112.0801, address: '789 S 16th St, Phoenix, AZ',
    rating: 5, note: 'Best birria in the valley, bring cash', timestamp: '3d',
  },
  {
    id: 'a4', friend: jlo, type: 'pinned',
    spotName: 'Casa de Tacos', spotType: 'House',
    lat: 33.4398, lng: -112.0756, address: '321 E McDowell Rd, Phoenix, AZ',
    timestamp: '5d',
  },
  {
    id: 'a5', friend: dperez, type: 'reviewed',
    spotName: 'Taqueria Los Compadres', spotType: 'Food Cart',
    lat: 33.4601, lng: -112.0633, address: '90 W Thomas Rd, Phoenix, AZ',
    rating: 4, note: 'Horchata is elite', timestamp: '1w',
  },
]
