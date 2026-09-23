import { create } from 'zustand'
import type { Announcement } from '../types/announcement'
import { unreadOf } from '../utils/announcements'
import {
  fetchPublished, fetchReadIds, markRead, markUnread,
} from '../services/announcementService'
import {
  getLocalReadIds, setLocalReadIds, clearLocalReadIds,
} from '../services/announcementReadsLocal'

const REFRESH_THROTTLE_MS = 5 * 60 * 1000

interface AnnouncementState {
  items: Announcement[]
  readIds: string[]
  userId: string | null
  lastRefreshAt: number
  refresh: (userId: string | null, opts?: { force?: boolean }) => Promise<void>
  setRead: (id: string, read: boolean) => Promise<void>
  markAllRead: () => Promise<void>
}

// Signed-in: fold any reads made while signed out into the server set, once.
async function loadRemoteReadIds(userId: string): Promise<string[]> {
  const local = await getLocalReadIds()
  if (local.length > 0) {
    await markRead(userId, local)
    await clearLocalReadIds()
  }
  return fetchReadIds()
}

async function persistReads(userId: string | null, next: string[], changed: string[], read: boolean) {
  if (!userId) return setLocalReadIds(next)
  if (read) return markRead(userId, changed)
  return Promise.all(changed.map(id => markUnread(userId, id))).then(() => undefined)
}

export const useAnnouncementStore = create<AnnouncementState>((set, get) => {
  // Optimistic update with rollback; read receipts are non-critical, so a
  // failure is logged and reverted rather than surfaced to the user.
  async function applyReads(ids: string[], read: boolean) {
    const prev = get().readIds
    const changed = read ? ids.filter(id => !prev.includes(id)) : ids.filter(id => prev.includes(id))
    if (changed.length === 0) return
    const next = read ? [...prev, ...changed] : prev.filter(id => !changed.includes(id))
    set({ readIds: next })
    try {
      await persistReads(get().userId, next, changed, read)
    } catch (e: unknown) {
      console.warn('[announcements] read state write failed, reverting:', e)
      set({ readIds: prev })
    }
  }

  return {
    items: [],
    readIds: [],
    userId: null,
    lastRefreshAt: 0,

    async refresh(userId, opts = {}) {
      const { userId: current, lastRefreshAt } = get()
      const fresh = Date.now() - lastRefreshAt < REFRESH_THROTTLE_MS
      if (!opts.force && userId === current && fresh) return
      try {
        const items = await fetchPublished()
        const readIds = userId ? await loadRemoteReadIds(userId) : await getLocalReadIds()
        set({ items, readIds, userId, lastRefreshAt: Date.now() })
      } catch (e: unknown) {
        console.warn('[announcements] refresh failed:', e)
      }
    },

    setRead: (id, read) => applyReads([id], read),

    markAllRead: () => {
      const { items, readIds } = get()
      return applyReads(unreadOf(items, readIds).map(a => a.id), true)
    },
  }
})

// Selectors return primitives or existing references (Zustand v5 re-renders
// forever on a fresh array per call).
export const selectUnreadCount = (s: AnnouncementState): number =>
  unreadOf(s.items, s.readIds).length

export const selectLatestUnread = (s: AnnouncementState): Announcement | null =>
  unreadOf(s.items, s.readIds)[0] ?? null
