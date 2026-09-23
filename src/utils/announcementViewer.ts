import type { Session } from '@supabase/supabase-js'

// Who is viewing the announcements feed, and when they joined — used to draw
// the unread-backlog cutoff (see announcements.ts unreadOf/isRead).
export interface AnnouncementViewer {
  id: string
  joinedAt: string
}

export function viewerFromSession(session: Session | null): AnnouncementViewer | null {
  return session ? { id: session.user.id, joinedAt: session.user.created_at } : null
}
