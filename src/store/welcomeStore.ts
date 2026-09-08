import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'showWelcomeOnLaunch'

interface WelcomeState {
  /** Show the quick-start guide when the app opens. */
  showOnLaunch: boolean
  /** False until AsyncStorage has been read — routing must wait for this. */
  hydrated: boolean
  hydrate: () => Promise<void>
  setShowOnLaunch: (value: boolean) => Promise<void>
}

// Persisted separately from `hasSeenOnboarding`: onboarding is the one-time
// "what is this app" pitch, while this is a reference card the user can keep
// on (or bring back from Settings) for as long as it's useful.
export const useWelcomeStore = create<WelcomeState>((set) => ({
  showOnLaunch: true,
  hydrated: false,
  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(KEY)
      // Absent means never answered — default to showing it.
      set({ showOnLaunch: stored !== 'false', hydrated: true })
    } catch {
      set({ hydrated: true })
    }
  },
  setShowOnLaunch: async (value) => {
    set({ showOnLaunch: value })
    try {
      await AsyncStorage.setItem(KEY, value ? 'true' : 'false')
    } catch {
      // Preference is cosmetic — a failed write shouldn't surface an error.
    }
  },
}))
