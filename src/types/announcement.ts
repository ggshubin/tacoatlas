// Mirrors public.announcements. publishedAt null = draft (admin-only).
export interface Announcement {
  id: string
  title: string
  body: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

// Keep in sync with the CHECK constraints in
// supabase/migrations/20260922000001_announcements.sql.
export const ANNOUNCEMENT_TITLE_MAX = 80
export const ANNOUNCEMENT_BODY_MAX = 1000
