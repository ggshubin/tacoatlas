import type { Session } from '@supabase/supabase-js'
import { viewerFromSession } from '../announcementViewer'

function makeSession(userId: string, createdAt: string): Session {
  return {
    user: { id: userId, created_at: createdAt },
  } as Session
}

describe('viewerFromSession', () => {
  it('returns null for a signed-out session', () => {
    expect(viewerFromSession(null)).toBeNull()
  })

  it('maps a session to id and joinedAt from user.created_at', () => {
    const session = makeSession('u1', '2026-09-01T00:00:00Z')
    expect(viewerFromSession(session)).toEqual({ id: 'u1', joinedAt: '2026-09-01T00:00:00Z' })
  })
})
