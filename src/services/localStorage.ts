import { MMKV } from 'react-native-mmkv'
import { nanoid } from 'nanoid/non-secure'
import type { LocalVendor, LocalReview } from '../types/app'

const storage = new MMKV()

const VENDORS_KEY = 'local_vendors'
const REVIEWS_KEY = 'local_reviews'

function getVendors(): LocalVendor[] {
  const raw = storage.getString(VENDORS_KEY)
  return raw ? JSON.parse(raw) : []
}

function saveVendors(vendors: LocalVendor[]): void {
  storage.set(VENDORS_KEY, JSON.stringify(vendors))
}

function getReviews(): LocalReview[] {
  const raw = storage.getString(REVIEWS_KEY)
  return raw ? JSON.parse(raw) : []
}

function saveReviews(reviews: LocalReview[]): void {
  storage.set(REVIEWS_KEY, JSON.stringify(reviews))
}

export const localStorageService = {
  addVendor(vendor: Omit<LocalVendor, 'localId' | 'createdAt'>): LocalVendor {
    const vendors = getVendors()
    const newVendor: LocalVendor = {
      ...vendor,
      localId: nanoid(),
      createdAt: new Date().toISOString(),
    }
    saveVendors([...vendors, newVendor])
    return newVendor
  },

  getVendors(): LocalVendor[] {
    return getVendors()
  },

  addReview(review: Omit<LocalReview, 'localId' | 'createdAt'>): LocalReview {
    const reviews = getReviews()
    const newReview: LocalReview = {
      ...review,
      localId: nanoid(),
      createdAt: new Date().toISOString(),
    }
    saveReviews([...reviews, newReview])
    return newReview
  },

  getReviewsForVendor(vendorLocalId: string): LocalReview[] {
    return getReviews().filter(r => r.vendorLocalId === vendorLocalId)
  },

  clearAll(): void {
    storage.delete(VENDORS_KEY)
    storage.delete(REVIEWS_KEY)
  },
}
