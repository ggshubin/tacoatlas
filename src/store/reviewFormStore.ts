import { create } from 'zustand'
import type { LocalTacoEntry, LocalSalsaEntry, LocalReview, SpotType, PrivacySetting,
  LocalBurritoEntry, LocalTortaEntry } from '../types/app'

export type FoodCategory = 'tacos' | 'burritos' | 'tortas' | 'salsas'

interface ReviewFormState {
  // Step 1
  vendorName: string
  spotType: SpotType | null
  lat: number | null
  lng: number | null
  address: string | null
  cityName: string | null
  privacy: PrivacySetting
  spotNote: string
  // Step 2
  activeCategory: FoodCategory
  tacoEntries: LocalTacoEntry[]
  burritoEntries: LocalBurritoEntry[]
  tortaEntries: LocalTortaEntry[]
  salsaEntries: LocalSalsaEntry[]
  condiments: string[]
  // Step 3
  overallRating: number
  returnIntent: 'yes' | 'maybe' | 'no' | null
  notes: string
  photoUris: string[]
  // Edit mode
  editingReviewLocalId: string | null
  editingVendorLocalId: string | null
  // Navigation
  currentStep: number  // 1–3
  // Actions
  setField: <K extends keyof ReviewFormState>(key: K, value: ReviewFormState[K]) => void
  setActiveCategory: (cat: FoodCategory) => void
  addTacoEntry: (entry: LocalTacoEntry) => void
  removeTacoEntry: (index: number) => void
  updateTacoEntry: (index: number, updates: Partial<LocalTacoEntry>) => void
  addBurritoEntry: (entry: LocalBurritoEntry) => void
  removeBurritoEntry: (index: number) => void
  addTortaEntry: (entry: LocalTortaEntry) => void
  removeTortaEntry: (index: number) => void
  addSalsaEntry: (entry: LocalSalsaEntry) => void
  removeSalsaEntry: (index: number) => void
  toggleCondiment: (name: string) => void
  loadForEdit: (review: LocalReview, vendorName: string) => void
  addPhoto: (uri: string) => void
  removePhoto: (uri: string) => void
  nextStep: () => void
  prevStep: () => void
  reset: () => void
}

const initialState = {
  vendorName: '',
  spotType: null as SpotType | null,
  lat: null,
  lng: null,
  address: null,
  cityName: null,
  privacy: 'public' as PrivacySetting,
  spotNote: '',
  activeCategory: 'tacos' as FoodCategory,
  tacoEntries: [],
  burritoEntries: [],
  tortaEntries: [],
  salsaEntries: [],
  condiments: [],
  overallRating: 0,
  returnIntent: null as null,
  notes: '',
  photoUris: [],
  editingReviewLocalId: null,
  editingVendorLocalId: null,
  currentStep: 1,
}

export const useReviewFormStore = create<ReviewFormState>((set) => ({
  ...initialState,
  setField: (key, value) => set({ [key]: value } as Partial<ReviewFormState>),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
  addTacoEntry: (entry) => set(s => ({ tacoEntries: [...s.tacoEntries, entry] })),
  removeTacoEntry: (i) => set(s => ({ tacoEntries: s.tacoEntries.filter((_, idx) => idx !== i) })),
  updateTacoEntry: (i, updates) => set(s => ({
    tacoEntries: s.tacoEntries.map((e, idx) => idx === i ? { ...e, ...updates } : e),
  })),
  addBurritoEntry: (entry) => set(s => ({ burritoEntries: [...s.burritoEntries, entry] })),
  removeBurritoEntry: (i) => set(s => ({ burritoEntries: s.burritoEntries.filter((_, idx) => idx !== i) })),
  addTortaEntry: (entry) => set(s => ({ tortaEntries: [...s.tortaEntries, entry] })),
  removeTortaEntry: (i) => set(s => ({ tortaEntries: s.tortaEntries.filter((_, idx) => idx !== i) })),
  addSalsaEntry: (entry) => set(s => ({ salsaEntries: [...s.salsaEntries, entry] })),
  removeSalsaEntry: (i) => set(s => ({ salsaEntries: s.salsaEntries.filter((_, idx) => idx !== i) })),
  toggleCondiment: (name) =>
    set(s => ({
      condiments: s.condiments.includes(name)
        ? s.condiments.filter(c => c !== name)
        : [...s.condiments, name],
    })),
  loadForEdit: (review, vendorName) => set({
    editingReviewLocalId: review.localId,
    editingVendorLocalId: review.vendorLocalId,
    vendorName,
    tacoEntries: review.tacoEntries,
    burritoEntries: review.burritoEntries ?? [],
    tortaEntries: review.tortaEntries ?? [],
    salsaEntries: review.salsaEntries,
    condiments: review.condiments,
    overallRating: review.overallRating,
    returnIntent: review.returnIntent,
    notes: review.notes ?? '',
    photoUris: review.photoUris,
    currentStep: 1,
    lat: null,
    lng: null,
    address: null,
    cityName: null,
  }),
  addPhoto: (uri) => set(s => ({ photoUris: [...s.photoUris, uri] })),
  removePhoto: (uri) => set(s => ({ photoUris: s.photoUris.filter(u => u !== uri) })),
  nextStep: () => set(s => ({ currentStep: Math.min(s.currentStep + 1, 3) })),
  prevStep: () => set(s => ({ currentStep: Math.max(1, s.currentStep - 1) })),
  reset: () => set(initialState),
}))
