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

// Guards against a slow refresh response landing after a newer one already
// committed its state (e.g. a sign-in fires a refresh while a stale
// signed-out refresh is still in flight).
let latestRefresh = 0

interface AnnouncementState {
  items: Announcement[]
  readIds: string[]
  userId: string | null
  lastRefreshAt: number
  refresh: (userId: string | null, opts?: { force?: boolean }) => Promise<void>
  setRead: (id: string, read: boolean) => Promise<void>
  markAllRead: () => Promise<void>
}

// Signed-in: best-effort fold of any reads made while signed out into the
// server set. This must never block the feed from loading: a local id for an
// announcement that has since been deleted would otherwise fail the upsert's
// FK on every refresh, forever. So we only attempt ids that are still present
// in the just-fetched feed, and swallow any failure (it will simply retry on
// the next refresh, since local ids are only cleared once the merge attempt
// finishes running, success or failure).
async function mergeLocalReads(userId: string, knownIds: ReadonlySet<string>): Promise<void> {
  try {
    const local = (await getLocalReadIds()).filter(id => knownIds.has(id))
    if (local.length > 0) await markRead(userId, local)
    // Signing out later starts from an empty local read set by design (the
    // server keeps the signed-in history); clearing here also discards any
    // stale ids that were dropped above, so they aren't retried forever.
    await clearLocalReadIds()
  } catch (e: unknown) {
    console.warn('[announcements] local read merge failed, will retry:', e)
  }
}

async function persistReads(
  userId: string | null,
  changed: string[],
  read: boolean,
  getReadIds: () => string[],
) {
  if (!userId) return setLocalReadIds(getReadIds())
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
      await persistReads(get().userId, changed, read, () => get().readIds)
    } catch (e: unknown) {
      console.warn('[announcements] read state write failed, reverting:', e)
      // Undo only this call's ids against whatever the current state is, not
      // a whole snapshot: an overlapping write may have committed since we
      // started, and restoring `prev` would clobber it.
      set(s => ({
        readIds: read
          ? s.readIds.filter(id => !changed.includes(id))
          : [...s.readIds, ...changed.filter(id => !s.readIds.includes(id))],
      }))
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
      const token = ++latestRefresh
      try {
        const items = await fetchPublished()
        if (token !== latestRefresh) return
        if (userId) await mergeLocalReads(userId, new Set(items.map(a => a.id)))
        const readIds = userId ? await fetchReadIds() : await getLocalReadIds()
        if (token !== latestRefresh) return
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
