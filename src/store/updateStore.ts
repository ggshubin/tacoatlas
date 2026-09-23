import { create } from 'zustand'
import * as Updates from 'expo-updates'
import type { UpdateStatus } from '../utils/updatePrompt'

const CHECK_THROTTLE_MS = 30 * 60 * 1000
const CHECK_TIMEOUT_MS = 30_000
const FETCH_TIMEOUT_MS = 120_000

// expo-updates is a no-op in dev and Expo Go; skip the network entirely.
export function updatesActive(): boolean {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__
  return Updates.isEnabled && !isDev
}

// Races a promise against a timer so a stuck native call (e.g. a flaky
// update server) can't leave the store stuck in 'checking'/'downloading'
// forever. The timer is always cleared, whichever side wins, so no open
// handle survives the call.
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
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
      const result = await withTimeout(Updates.checkForUpdateAsync(), CHECK_TIMEOUT_MS, 'checkForUpdateAsync')
      // A rollback directive is how a bad OTA gets pulled mid-session: the
      // server tells clients to fall back to the embedded build. isAvailable
      // is false in that case, so isRollBackToEmbedded must be checked too
      // or the rollback would be silently ignored as "up to date".
      if (!result.isAvailable && !result.isRollBackToEmbedded) {
        set({ status: 'upToDate' })
        return
      }
      set({ status: 'downloading' })
      const fetched = await withTimeout(Updates.fetchUpdateAsync(), FETCH_TIMEOUT_MS, 'fetchUpdateAsync')
      const ready = fetched.isNew || fetched.isRollBackToEmbedded
      set({ status: ready ? 'ready' : 'upToDate', dismissed: false })
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
