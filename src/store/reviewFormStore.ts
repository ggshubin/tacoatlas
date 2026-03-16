import { create } from 'zustand'
import type { LocalTacoEntry, LocalSalsaEntry } from '../types/app'

interface ReviewFormState {
  // Step 1: Vendor info
  vendorName: string
  lat: number | null
  lng: number | null
  address: string | null
  cityName: string | null
  // Step 2: Tacos
  tacoEntries: LocalTacoEntry[]
  // Step 3: Salsas
  salsaEntries: LocalSalsaEntry[]
  // Step 4: Condiments
  condiments: string[]
  // Step 5: Summary
  overallRating: number
  returnIntent: 'yes' | 'maybe' | 'no' | null
  notes: string
  photoUris: string[]
  // Navigation
  currentStep: number
  // Actions
  setField: <K extends keyof ReviewFormState>(key: K, value: ReviewFormState[K]) => void
  addTacoEntry: (entry: LocalTacoEntry) => void
  removeTacoEntry: (index: number) => void
  addSalsaEntry: (entry: LocalSalsaEntry) => void
  removeSalsaEntry: (index: number) => void
  toggleCondiment: (name: string) => void
  nextStep: () => void
  prevStep: () => void
  reset: () => void
}

const initialState = {
  vendorName: '',
  lat: null,
  lng: null,
  address: null,
  cityName: null,
  tacoEntries: [],
  salsaEntries: [],
  condiments: [],
  overallRating: 0,
  returnIntent: null as null,
  notes: '',
  photoUris: [],
  currentStep: 1,
}

export const useReviewFormStore = create<ReviewFormState>((set, get) => ({
  ...initialState,
  setField: (key, value) => set({ [key]: value } as Partial<ReviewFormState>),
  addTacoEntry: (entry) => set(s => ({ tacoEntries: [...s.tacoEntries, entry] })),
  removeTacoEntry: (i) => set(s => ({ tacoEntries: s.tacoEntries.filter((_, idx) => idx !== i) })),
  addSalsaEntry: (entry) => set(s => ({ salsaEntries: [...s.salsaEntries, entry] })),
  removeSalsaEntry: (i) => set(s => ({ salsaEntries: s.salsaEntries.filter((_, idx) => idx !== i) })),
  toggleCondiment: (name) =>
    set(s => ({
      condiments: s.condiments.includes(name)
        ? s.condiments.filter(c => c !== name)
        : [...s.condiments, name],
    })),
  nextStep: () => set(s => ({ currentStep: Math.min(s.currentStep + 1, 5) })),
  prevStep: () => set(s => ({ currentStep: Math.max(1, s.currentStep - 1) })),
  reset: () => set(initialState),
}))
