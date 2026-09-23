import { supabase } from './supabase'
import type { Announcement } from '../types/announcement'

// All announcement I/O. Functions throw on error (adminService pattern) so
// callers decide whether a failure is silent (read receipts) or loud (admin).
// RLS: see supabase/migrations/20260922000001_announcements.sql.

const COLUMNS = 'id, title, body, published_at, created_at, updated_at'
const FEED_LIMIT = 50

interface AnnouncementRow {
  id: string
  title: string
  body: string
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface AnnouncementInput {
  title: string
  body: string
}

function toAnnouncement(r: AnnouncementRow): Announcement {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function clean(input: AnnouncementInput): AnnouncementInput {
  return { title: input.title.trim(), body: input.body.trim() }
}

function fail(error: { message: string } | null): asserts error is null {
  if (error) throw new Error(error.message)
}

// ── Everyone ──

export async function fetchPublished(): Promise<Announcement[]> {
  // Drafts are hidden from non-admins by RLS; the not-null filter here keeps
  // an admin's own feed (and banner) free of drafts too.
  const { data, error } = await supabase
    .from('announcements')
    .select(COLUMNS)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(FEED_LIMIT)
  fail(error)
  return ((data ?? []) as AnnouncementRow[]).map(toAnnouncement)
}

export async function fetchReadIds(): Promise<string[]> {
  // RLS scopes rows to the caller; only call this with a session, since anon
  // has no grant on announcement_reads.
  const { data, error } = await supabase.from('announcement_reads').select('announcement_id')
  fail(error)
  return ((data ?? []) as { announcement_id: string }[]).map(r => r.announcement_id)
}

export async function markRead(userId: string, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return
  const rows = ids.map(id => ({ user_id: userId, announcement_id: id }))
  const { error } = await supabase
    .from('announcement_reads')
    .upsert(rows, { onConflict: 'user_id,announcement_id', ignoreDuplicates: true })
  fail(error)
}

export async function markUnread(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('announcement_reads')
    .delete()
    .eq('user_id', userId)
    .eq('announcement_id', id)
  fail(error)
}

// ── Admin (RLS rejects these for non-admins) ──

export async function listAll(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
  fail(error)
  return ((data ?? []) as AnnouncementRow[]).map(toAnnouncement)
}

export async function fetchById(id: string): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from('announcements')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle()
  fail(error)
  return data ? toAnnouncement(data as AnnouncementRow) : null
}

export async function createDraft(input: AnnouncementInput): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert(clean(input))
    .select(COLUMNS)
    .single()
  fail(error)
  return toAnnouncement(data as AnnouncementRow)
}

export async function updateAnnouncement(id: string, input: AnnouncementInput): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .update(clean(input))
    .eq('id', id)
    .select(COLUMNS)
    .single()
  fail(error)
  return toAnnouncement(data as AnnouncementRow)
}

export async function sendAnnouncement(id: string): Promise<Announcement> {
  // Any non-null value here means "send"; a trigger overwrites it with the
  // server's now() on write, so the client's timestamp is never trusted.
  // `.is('published_at', null)` makes a double-tap harmless: the second send
  // matches no row, so `data` comes back null instead of re-stamping the time.
  const { data, error } = await supabase
    .from('announcements')
    .update({ published_at: new Date().toISOString() })
    .eq('id', id)
    .is('published_at', null)
    .select(COLUMNS)
    .maybeSingle()
  fail(error)
  if (!data) throw new Error('Already sent, or you no longer have access.')
  return toAnnouncement(data as AnnouncementRow)
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  fail(error)
}
