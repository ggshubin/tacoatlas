import { create } from 'zustand'
import * as Updates from 'expo-updates'
import type { UpdateStatus } from '../utils/updatePrompt'

const CHECK_THROTTLE_MS = 30 * 60 * 1000

// expo-updates is a no-op in dev and Expo Go; skip the network entirely.
function updatesActive(): boolean {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__
  return Updates.isEnabled && !isDev
}

interface UpdateState {
  status: UpdateStatus
  dismissed: boolean
  lastCheckAt: number
  check: (opts?: { force?: boolean }) => Promise<void>
  restart: () => Promise<boolean>
  dismiss: () => void
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: 'idle',
  dismissed: false,
  lastCheckAt: 0,

  async check(opts = {}) {
    if (!updatesActive()) return
    const { status, lastCheckAt } = get()
    if (status === 'checking' || status === 'downloading') return
    if (status === 'ready') {
      if (opts.force) set({ dismissed: false })
      return
    }
    if (!opts.force && Date.now() - lastCheckAt < CHECK_THROTTLE_MS) return

    set({ status: 'checking', lastCheckAt: Date.now() })
    try {
      const result = await Updates.checkForUpdateAsync()
      if (!result.isAvailable) {
        set({ status: 'upToDate' })
        return
      }
      set({ status: 'downloading' })
      const fetched = await Updates.fetchUpdateAsync()
      set({ status: fetched.isNew ? 'ready' : 'upToDate', dismissed: false })
    } catch (e: unknown) {
      console.warn('[updates] check failed:', e)
      set({ status: 'error' })
    }
  },

  async restart() {
    try {
      await Updates.reloadAsync()
      return true
    } catch (e: unknown) {
      console.warn('[updates] reload failed:', e)
      return false
    }
  },

  // "Later": expo-updates applies the downloaded bundle on the next cold start.
  dismiss: () => set({ dismissed: true }),
}))
