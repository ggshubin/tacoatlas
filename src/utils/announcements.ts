import {
  ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX, type Announcement,
} from '../types/announcement'

export function isPublished(a: Announcement): boolean {
  return a.publishedAt !== null
}

function sortKey(a: Announcement): number {
  return Date.parse(a.publishedAt ?? a.createdAt)
}

export function sortNewestFirst(items: readonly Announcement[]): Announcement[] {
  return [...items].sort((a, b) => sortKey(b) - sortKey(a))
}

export function unreadOf(
  items: readonly Announcement[],
  readIds: readonly string[],
): Announcement[] {
  const read = new Set(readIds)
  return sortNewestFirst(items.filter(a => isPublished(a) && !read.has(a.id)))
}

export function validateDraft(title: string, body: string): string | null {
  const t = title.trim()
  const b = body.trim()
  if (!t) return 'Add a title.'
  if (!b) return 'Add a message.'
  if (t.length > ANNOUNCEMENT_TITLE_MAX) return `Title is too long (${ANNOUNCEMENT_TITLE_MAX} max).`
  if (b.length > ANNOUNCEMENT_BODY_MAX) return `Message is too long (${ANNOUNCEMENT_BODY_MAX} max).`
  return null
}
