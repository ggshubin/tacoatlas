import type { Announcement } from '../../types/announcement'

jest.mock('../../services/announcementService', () => ({
  fetchPublished: jest.fn(),
  fetchReadIds: jest.fn(),
  markRead: jest.fn(),
  markUnread: jest.fn(),
}))
jest.mock('../../services/announcementReadsLocal', () => ({
  getLocalReadIds: jest.fn(),
  setLocalReadIds: jest.fn(),
  clearLocalReadIds: jest.fn(),
  isLocalSeeded: jest.fn(),
  markLocalSeeded: jest.fn(),
  clearLocalSeeded: jest.fn(),
}))

import * as service from '../../services/announcementService'
import * as local from '../../services/announcementReadsLocal'
import {
  useAnnouncementStore, selectUnreadCount, selectLatestUnread,
} from '../announcementStore'
import type { AnnouncementViewer } from '../../utils/announcementViewer'

const svc = service as jest.Mocked<typeof service>
const loc = local as jest.Mocked<typeof local>

function make(id: string, publishedAt: string): Announcement {
  return { id, title: id, body: 'b', publishedAt, createdAt: publishedAt, updatedAt: publishedAt }
}
const A = make('a', '2026-09-20T00:00:00Z')
const B = make('b', '2026-09-21T00:00:00Z')

function viewer(id: string, joinedAt: string): AnnouncementViewer {
  return { id, joinedAt }
}

beforeEach(() => {
  jest.resetAllMocks()
  useAnnouncementStore.setState({
    items: [], readIds: [], userId: null, since: null, lastRefreshAt: 0,
  })
  svc.fetchPublished.mockResolvedValue([A, B])
  svc.fetchReadIds.mockResolvedValue([])
  svc.markRead.mockResolvedValue()
  svc.markUnread.mockResolvedValue()
  loc.getLocalReadIds.mockResolvedValue([])
  loc.setLocalReadIds.mockResolvedValue()
  loc.clearLocalReadIds.mockResolvedValue()
  loc.isLocalSeeded.mockResolvedValue(true)
  loc.markLocalSeeded.mockResolvedValue()
  loc.clearLocalSeeded.mockResolvedValue()
})

afterEach(() => {
  jest.restoreAllMocks()
})

const state = () => useAnnouncementStore.getState()

describe('refresh', () => {
  it('signed out: loads items and local read ids', async () => {
    loc.getLocalReadIds.mockResolvedValue(['a'])
    await state().refresh(null)
    expect(state().items).toEqual([A, B])
    expect(state().readIds).toEqual(['a'])
    expect(svc.fetchReadIds).not.toHaveBeenCalled()
  })

  it('signed in: merges local reads to the server, clears them, then loads remote', async () => {
    loc.getLocalReadIds.mockResolvedValue(['a'])
    svc.fetchReadIds.mockResolvedValue(['a', 'b'])
    await state().refresh(viewer('u1', '2026-09-01T00:00:00Z'))
    expect(svc.markRead).toHaveBeenCalledWith('u1', ['a'])
    expect(loc.clearLocalReadIds).toHaveBeenCalled()
    expect(state().readIds).toEqual(['a', 'b'])
    expect(state().userId).toBe('u1')
  })

  it('signed in: sets since to the viewer joinedAt', async () => {
    await state().refresh(viewer('u1', '2026-09-05T00:00:00Z'))
    expect(state().since).toBe('2026-09-05T00:00:00Z')
  })

  it('signed out: since is always null (clock-free cutoff)', async () => {
    await state().refresh(null)
    expect(state().since).toBeNull()
  })

  it('is throttled for the same user unless forced', async () => {
    await state().refresh(viewer('u1', '2026-09-01T00:00:00Z'))
    await state().refresh(viewer('u1', '2026-09-01T00:00:00Z'))
    expect(svc.fetchPublished).toHaveBeenCalledTimes(1)
    await state().refresh(viewer('u1', '2026-09-01T00:00:00Z'), { force: true })
    expect(svc.fetchPublished).toHaveBeenCalledTimes(2)
  })

  it('always refreshes when the user changes', async () => {
    await state().refresh(viewer('u1', '2026-09-01T00:00:00Z'))
    await state().refresh(null)
    expect(svc.fetchPublished).toHaveBeenCalledTimes(2)
  })

  it('keeps previous items when the fetch fails', async () => {
    useAnnouncementStore.setState({ items: [A] })
    svc.fetchPublished.mockRejectedValue(new Error('offline'))
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    await state().refresh(viewer('u1', '2026-09-01T00:00:00Z'), { force: true })
    expect(state().items).toEqual([A])
  })

  it('still loads the feed when merging a local read to the server fails', async () => {
    loc.getLocalReadIds.mockResolvedValue(['a'])
    svc.fetchReadIds.mockResolvedValue(['a', 'b'])
    svc.markRead.mockRejectedValue(new Error('fk violation'))
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    await state().refresh(viewer('u1', '2026-09-01T00:00:00Z'))
    expect(state().items).toEqual([A, B])
    expect(state().readIds).toEqual(['a', 'b'])
  })

  it('still loads the feed when clearing local reads after a merge fails', async () => {
    loc.getLocalReadIds.mockResolvedValue(['a'])
    svc.fetchReadIds.mockResolvedValue(['a', 'b'])
    loc.clearLocalReadIds.mockRejectedValue(new Error('storage error'))
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    await state().refresh(viewer('u1', '2026-09-01T00:00:00Z'))
    expect(state().items).toEqual([A, B])
    expect(state().readIds).toEqual(['a', 'b'])
  })

  it('drops a local read id no longer present in the feed but still clears local storage', async () => {
    loc.getLocalReadIds.mockResolvedValue(['deleted-id'])
    svc.fetchReadIds.mockResolvedValue([])
    await state().refresh(viewer('u1', '2026-09-01T00:00:00Z'))
    expect(svc.markRead).not.toHaveBeenCalled()
    expect(loc.clearLocalReadIds).toHaveBeenCalled()
  })

  it('ignores a stale refresh response that resolves after a newer one', async () => {
    let resolveFirst: (items: Announcement[]) => void = () => {}
    const firstPromise = new Promise<Announcement[]>((resolve) => { resolveFirst = resolve })
    svc.fetchPublished
      .mockImplementationOnce(() => firstPromise)
      .mockImplementationOnce(async () => [B])
    svc.fetchReadIds.mockResolvedValue(['b'])

    const firstRefresh = state().refresh(viewer('u1', '2026-09-01T00:00:00Z'))
    const secondRefresh = state().refresh(viewer('u2', '2026-09-02T00:00:00Z'), { force: true })
    await secondRefresh
    resolveFirst([A])
    await firstRefresh

    expect(state().userId).toBe('u2')
    expect(state().items).toEqual([B])
  })

  it('signed out: first refresh marks all fetched items as read and seeds the device', async () => {
    loc.isLocalSeeded.mockResolvedValue(false)
    await state().refresh(null)
    expect(state().readIds).toEqual(['a', 'b'])
    expect(loc.setLocalReadIds).toHaveBeenCalledWith(['a', 'b'])
    expect(loc.markLocalSeeded).toHaveBeenCalled()
  })

  it('signed out: a second refresh with a new item leaves only the new item unread', async () => {
    loc.isLocalSeeded.mockResolvedValueOnce(false)
    await state().refresh(null)
    expect(state().readIds).toEqual(['a', 'b'])

    const C = make('c', '2026-09-22T00:00:00Z')
    svc.fetchPublished.mockResolvedValue([A, B, C])
    loc.getLocalReadIds.mockResolvedValue(['a', 'b'])
    loc.isLocalSeeded.mockResolvedValue(true)
    await state().refresh(null, { force: true })
    expect(state().readIds).toEqual(['a', 'b'])
    expect(selectUnreadCount(state())).toBe(1)
    expect(selectLatestUnread(state())).toBe(C)
  })

  it('sign-in then sign-out reseeds: clears the seeded flag and local ids before reading the feed', async () => {
    await state().refresh(viewer('u1', '2026-09-01T00:00:00Z'))
    loc.isLocalSeeded.mockResolvedValue(false)
    loc.getLocalReadIds.mockResolvedValue([])
    await state().refresh(null, { force: true })
    expect(loc.clearLocalSeeded).toHaveBeenCalled()
    expect(loc.clearLocalReadIds).toHaveBeenCalled()
    expect(state().readIds).toEqual(['a', 'b'])
  })
})

describe('selectors', () => {
  it('count and latest unread', () => {
    useAnnouncementStore.setState({ items: [A, B], readIds: ['b'] })
    expect(selectUnreadCount(state())).toBe(1)
    expect(selectLatestUnread(state())).toBe(A)
  })
  it('latest unread is null when all read', () => {
    useAnnouncementStore.setState({ items: [A], readIds: ['a'] })
    expect(selectLatestUnread(state())).toBeNull()
  })
  it('excludes items published before since', () => {
    // A published 2026-09-20, B published 2026-09-21.
    useAnnouncementStore.setState({ items: [A, B], readIds: [], since: '2026-09-21T00:00:00Z' })
    expect(selectUnreadCount(state())).toBe(1)
    expect(selectLatestUnread(state())).toBe(B)
  })
})

describe('setRead', () => {
  it('signed in: optimistic read then server write', async () => {
    useAnnouncementStore.setState({ items: [A, B], userId: 'u1' })
    await state().setRead('a', true)
    expect(state().readIds).toEqual(['a'])
    expect(svc.markRead).toHaveBeenCalledWith('u1', ['a'])
  })

  it('signed in: mark unread deletes the receipt', async () => {
    useAnnouncementStore.setState({ items: [A], readIds: ['a'], userId: 'u1' })
    await state().setRead('a', false)
    expect(state().readIds).toEqual([])
    expect(svc.markUnread).toHaveBeenCalledWith('u1', 'a')
  })

  it('rolls back when the server write fails', async () => {
    useAnnouncementStore.setState({ items: [A], userId: 'u1' })
    svc.markRead.mockRejectedValue(new Error('nope'))
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    await state().setRead('a', true)
    expect(state().readIds).toEqual([])
  })

  it('signed out: persists locally', async () => {
    useAnnouncementStore.setState({ items: [A] })
    await state().setRead('a', true)
    expect(loc.setLocalReadIds).toHaveBeenCalledWith(['a'])
  })

  it('no-op when already in the requested state', async () => {
    useAnnouncementStore.setState({ items: [A], readIds: ['a'], userId: 'u1' })
    await state().setRead('a', true)
    expect(svc.markRead).not.toHaveBeenCalled()
  })

  it('rolls back a failed mark-unread by re-adding the id', async () => {
    useAnnouncementStore.setState({ items: [A], readIds: ['a'], userId: 'u1' })
    svc.markUnread.mockRejectedValue(new Error('nope'))
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    await state().setRead('a', false)
    expect(state().readIds).toEqual(['a'])
  })

  it('keeps a later successful write after an earlier overlapping write fails', async () => {
    useAnnouncementStore.setState({ items: [A, B], userId: 'u1' })
    let rejectFirst: (e: Error) => void = () => {}
    svc.markRead
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectFirst = reject }))
      .mockImplementationOnce(() => Promise.resolve())
    jest.spyOn(console, 'warn').mockImplementation(() => {})

    const firstWrite = state().setRead('a', true)
    const secondWrite = state().setRead('b', true)
    await secondWrite
    rejectFirst(new Error('nope'))
    await firstWrite

    expect(state().readIds).toEqual(['b'])
  })
})

describe('markAllRead', () => {
  it('marks every unread item in one write', async () => {
    useAnnouncementStore.setState({ items: [A, B], userId: 'u1' })
    await state().markAllRead()
    // unreadOf sorts newest-first, so B ('b', published 09-21) precedes A.
    expect(svc.markRead).toHaveBeenCalledWith('u1', ['b', 'a'])
    expect(selectUnreadCount(state())).toBe(0)
  })

  it('signed out: writes all ids to local storage', async () => {
    useAnnouncementStore.setState({ items: [A, B] })
    await state().markAllRead()
    expect(loc.setLocalReadIds).toHaveBeenCalledWith(['b', 'a'])
  })

  it('does not send an id for an item published before since', async () => {
    // A published 2026-09-20, B published 2026-09-21.
    useAnnouncementStore.setState({
      items: [A, B], readIds: [], userId: 'u1', since: '2026-09-21T00:00:00Z',
    })
    await state().markAllRead()
    expect(svc.markRead).toHaveBeenCalledWith('u1', ['b'])
  })
})
