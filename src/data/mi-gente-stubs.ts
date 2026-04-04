// src/data/mi-gente-stubs.ts
import type { SpotType } from '../types/app'

export interface FriendStub {
  username: string
  initials: string
  avatarUrl?: string | null
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

export const STUB_FRIENDS: FriendStub[] = []

export const STUB_ACTIVITY: ActivityStub[] = []
