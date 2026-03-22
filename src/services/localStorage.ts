import AsyncStorage from '@react-native-async-storage/async-storage'
import { nanoid } from 'nanoid/non-secure'
import type { LocalVendor, LocalReview } from '../types/app'

// Namespace keys by user ID so each account has isolated local data.
// Falls back to 'guest' scope for unauthenticated users.
let _userScope = 'guest'

function VENDORS_KEY() { return `local_vendors_${_userScope}` }
function REVIEWS_KEY() { return `local_reviews_${_userScope}` }

export function setUserScope(userId: string | null) {
  _userScope = userId ?? 'guest'
}

// One-time migration: copy data from the old unscoped keys (local_vendors / local_reviews)
// into the current user-scoped keys, then remove the old keys.
// Safe to call multiple times — no-op once old keys are gone.
export async function migrateFromLegacyKeys(): Promise<void> {
  const OLD_VENDORS = 'local_vendors'
  const OLD_REVIEWS = 'local_reviews'

  const [oldV, oldR, newV, newR] = await Promise.all([
    AsyncStorage.getItem(OLD_VENDORS),
    AsyncStorage.getItem(OLD_REVIEWS),
    AsyncStorage.getItem(VENDORS_KEY()),
    AsyncStorage.getItem(REVIEWS_KEY()),
  ])

  const writes: Promise<void>[] = []
  if (oldV && !newV) writes.push(AsyncStorage.setItem(VENDORS_KEY(), oldV))
  if (oldR && !newR) writes.push(AsyncStorage.setItem(REVIEWS_KEY(), oldR))

  if (writes.length > 0) {
    await Promise.all(writes)
    await Promise.all([
      AsyncStorage.removeItem(OLD_VENDORS),
      AsyncStorage.removeItem(OLD_REVIEWS),
    ])
  }
}

// Normalize persisted vendor data — fills in missing new fields with safe defaults
function normalizeVendor(v: any): LocalVendor {
  return {
    ...v,
    privacy: v.privacy ?? 'public',
    spotNote: v.spotNote ?? null,
    isVisited: v.isVisited ?? true,  // default true for existing data (they have reviews)
  }
}

// Normalize persisted review data
function normalizeReview(r: any): LocalReview {
  return {
    ...r,
    burritoEntries: r.burritoEntries ?? [],
    tortaEntries: r.tortaEntries ?? [],
    salsaEntries: (r.salsaEntries ?? []).map((s: any) => ({
      ...s,
      notes: s.notes ?? null,
    })),
  }
}

async function getVendors(): Promise<LocalVendor[]> {
  const raw = await AsyncStorage.getItem(VENDORS_KEY())
  return raw ? JSON.parse(raw).map(normalizeVendor) : []
}

async function saveVendors(vendors: LocalVendor[]): Promise<void> {
  await AsyncStorage.setItem(VENDORS_KEY(), JSON.stringify(vendors))
}

async function getReviews(): Promise<LocalReview[]> {
  const raw = await AsyncStorage.getItem(REVIEWS_KEY())
  return raw ? JSON.parse(raw).map(normalizeReview) : []
}

async function saveReviews(reviews: LocalReview[]): Promise<void> {
  await AsyncStorage.setItem(REVIEWS_KEY(), JSON.stringify(reviews))
}

export const localStorageService = {
  async addVendor(vendor: Omit<LocalVendor, 'localId' | 'createdAt'>): Promise<LocalVendor> {
    const vendors = await getVendors()
    const newVendor: LocalVendor = {
      ...vendor,
      localId: nanoid(),
      createdAt: new Date().toISOString(),
    }
    await saveVendors([...vendors, newVendor])
    return newVendor
  },

  async getVendors(): Promise<LocalVendor[]> {
    return getVendors()
  },

  async getReviews(): Promise<LocalReview[]> {
    return getReviews()
  },

  async getVendorByLocalId(localId: string): Promise<LocalVendor | null> {
    const vendors = await getVendors()
    return vendors.find(v => v.localId === localId) ?? null
  },

  async updateVendor(localId: string, updates: Partial<Omit<LocalVendor, 'localId' | 'createdAt'>>): Promise<void> {
    const vendors = await getVendors()
    const idx = vendors.findIndex(v => v.localId === localId)
    if (idx !== -1) {
      vendors[idx] = { ...vendors[idx], ...updates }
      await saveVendors(vendors)
    }
  },

  async markVendorVisited(localId: string): Promise<void> {
    await this.updateVendor(localId, { isVisited: true })
  },

  async addReview(review: Omit<LocalReview, 'localId' | 'createdAt'>): Promise<LocalReview> {
    const reviews = await getReviews()
    const newReview: LocalReview = {
      ...review,
      localId: nanoid(),
      createdAt: new Date().toISOString(),
    }
    await saveReviews([...reviews, newReview])
    return newReview
  },

  async getReviewsForVendor(vendorLocalId: string): Promise<LocalReview[]> {
    const reviews = await getReviews()
    return reviews.filter(r => r.vendorLocalId === vendorLocalId)
  },

  async updateReview(localId: string, updates: Partial<Omit<LocalReview, 'localId' | 'createdAt'>>): Promise<void> {
    const reviews = await getReviews()
    const idx = reviews.findIndex(r => r.localId === localId)
    if (idx !== -1) {
      reviews[idx] = { ...reviews[idx], ...updates }
      await saveReviews(reviews)
    }
  },

  async deleteReview(localId: string): Promise<void> {
    const reviews = await getReviews()
    await saveReviews(reviews.filter(r => r.localId !== localId))
  },

  async deleteVendor(localId: string): Promise<void> {
    const vendors = await getVendors()
    await saveVendors(vendors.filter(v => v.localId !== localId))
    // also remove all reviews for this vendor
    const reviews = await getReviews()
    await saveReviews(reviews.filter(r => r.vendorLocalId !== localId))
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(VENDORS_KEY())
    await AsyncStorage.removeItem(REVIEWS_KEY())
  },

  async getVendorCount(): Promise<number> {
    const vendors = await getVendors()
    return vendors.length
  },

  async isAtFreeLimit(): Promise<boolean> {
    const count = await this.getVendorCount()
    return count >= 15
  },
}
