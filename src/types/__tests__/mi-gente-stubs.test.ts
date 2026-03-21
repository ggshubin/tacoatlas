// src/types/__tests__/mi-gente-stubs.test.ts
/**
 * @jest-environment node
 */
import { STUB_FRIENDS, STUB_ACTIVITY, type FriendStub, type ActivityStub } from '../../data/mi-gente-stubs'

describe('STUB_FRIENDS', () => {
  it('has at least one friend', () => {
    expect(STUB_FRIENDS.length).toBeGreaterThan(0)
  })

  it('every friend has required fields', () => {
    for (const f of STUB_FRIENDS) {
      expect(typeof f.username).toBe('string')
      expect(typeof f.initials).toBe('string')
      expect(f.initials.length).toBeGreaterThan(0)
      expect(f.initials.length).toBeLessThanOrEqual(2)
      expect(typeof f.isActive).toBe('boolean')
      expect(typeof f.pinCount).toBe('number')
      expect(typeof f.reviewCount).toBe('number')
      expect(typeof f.avgRating).toBe('number')
    }
  })

  it('avgRating is in 1-5 range', () => {
    for (const f of STUB_FRIENDS) {
      expect(f.avgRating).toBeGreaterThanOrEqual(1)
      expect(f.avgRating).toBeLessThanOrEqual(5)
    }
  })
})

describe('STUB_ACTIVITY', () => {
  it('has at least one activity item', () => {
    expect(STUB_ACTIVITY.length).toBeGreaterThan(0)
  })

  it('every activity item has required fields', () => {
    for (const a of STUB_ACTIVITY) {
      expect(typeof a.id).toBe('string')
      expect(typeof a.spotName).toBe('string')
      expect(['pinned', 'reviewed']).toContain(a.type)
      expect(typeof a.lat).toBe('number')
      expect(typeof a.lng).toBe('number')
      expect(typeof a.timestamp).toBe('string')
    }
  })

  it('reviewed items have a rating; pinned items do not', () => {
    for (const a of STUB_ACTIVITY) {
      if (a.type === 'reviewed') {
        expect(a.rating).toBeGreaterThanOrEqual(1)
        expect(a.rating).toBeLessThanOrEqual(5)
      } else {
        expect(a.rating).toBeUndefined()
      }
    }
  })

  it('every activity references a known friend', () => {
    const usernames = new Set(STUB_FRIENDS.map(f => f.username))
    for (const a of STUB_ACTIVITY) {
      expect(usernames.has(a.friend.username)).toBe(true)
    }
  })
})
