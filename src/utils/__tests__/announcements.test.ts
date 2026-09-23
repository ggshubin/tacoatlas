import {
  isPublished, isRead, sortNewestFirst, unreadOf, validateDraft,
} from '../announcements'
import type { Announcement } from '../../types/announcement'

function make(id: string, publishedAt: string | null, createdAt = '2026-09-01T00:00:00Z'): Announcement {
  return { id, title: `t-${id}`, body: 'b', publishedAt, createdAt, updatedAt: createdAt }
}

describe('isPublished', () => {
  it('is false for drafts', () => {
    expect(isPublished(make('a', null))).toBe(false)
  })
  it('is true once published_at is set', () => {
    expect(isPublished(make('a', '2026-09-22T11:00:00Z'))).toBe(true)
  })
})

describe('sortNewestFirst', () => {
  it('orders by publishedAt, falling back to createdAt for drafts, without mutating input', () => {
    const input = [
      make('old', '2026-09-01T00:00:00Z'),
      make('draft', null, '2026-09-21T00:00:00Z'),
      make('new', '2026-09-20T00:00:00Z'),
    ]
    const snapshot = [...input]
    expect(sortNewestFirst(input).map(a => a.id)).toEqual(['draft', 'new', 'old'])
    expect(input).toEqual(snapshot)
  })
})

describe('unreadOf', () => {
  it('returns published, unread items newest first', () => {
    const items = [
      make('read', '2026-09-10T00:00:00Z'),
      make('draft', null),
      make('older', '2026-09-05T00:00:00Z'),
      make('newer', '2026-09-15T00:00:00Z'),
    ]
    expect(unreadOf(items, ['read']).map(a => a.id)).toEqual(['newer', 'older'])
  })
  it('is empty when everything is read', () => {
    expect(unreadOf([make('a', '2026-09-10T00:00:00Z')], ['a'])).toEqual([])
  })

  it('excludes items published before since', () => {
    const items = [
      make('before', '2026-09-10T00:00:00Z'),
      make('after', '2026-09-20T00:00:00Z'),
    ]
    expect(unreadOf(items, [], '2026-09-15T00:00:00Z').map(a => a.id)).toEqual(['after'])
  })

  it('includes an item published exactly at since', () => {
    const items = [make('at', '2026-09-15T00:00:00Z')]
    expect(unreadOf(items, [], '2026-09-15T00:00:00Z').map(a => a.id)).toEqual(['at'])
  })

  it('behaves as before when since is null', () => {
    const items = [make('old', '2026-09-01T00:00:00Z')]
    expect(unreadOf(items, [], null).map(a => a.id)).toEqual(['old'])
  })
})

describe('isRead', () => {
  it('is true when the id is in readIds', () => {
    expect(isRead(make('a', '2026-09-10T00:00:00Z'), new Set(['a']), null)).toBe(true)
  })

  it('is false when unread and since is null', () => {
    expect(isRead(make('a', '2026-09-10T00:00:00Z'), new Set(), null)).toBe(false)
  })

  it('is true when published before since, even if not in readIds', () => {
    const a = make('a', '2026-09-10T00:00:00Z')
    expect(isRead(a, new Set(), '2026-09-15T00:00:00Z')).toBe(true)
  })

  it('is false when published at or after since and not in readIds', () => {
    const a = make('a', '2026-09-20T00:00:00Z')
    expect(isRead(a, new Set(), '2026-09-15T00:00:00Z')).toBe(false)
  })

  it('is false for a draft (publishedAt null) that is not in readIds, even with a since', () => {
    const a = make('a', null)
    expect(isRead(a, new Set(), '2026-09-15T00:00:00Z')).toBe(false)
  })
})

describe('validateDraft', () => {
  it('requires a title', () => {
    expect(validateDraft('   ', 'body')).toBe('Add a title.')
  })
  it('requires a body', () => {
    expect(validateDraft('Title', '')).toBe('Add a message.')
  })
  it('caps the title at 80 characters', () => {
    expect(validateDraft('x'.repeat(81), 'body')).toBe('Title is too long (80 max).')
  })
  it('caps the body at 1000 characters', () => {
    expect(validateDraft('Title', 'x'.repeat(1001))).toBe('Message is too long (1000 max).')
  })
  it('returns null when valid', () => {
    expect(validateDraft('Title', 'Body')).toBeNull()
  })
})
