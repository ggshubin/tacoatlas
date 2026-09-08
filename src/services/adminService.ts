import { supabase } from './supabase'

// Founder dashboard data. Both RPCs are SECURITY DEFINER and gated on the
// caller's profiles.is_admin flag server-side — a non-admin gets a Postgres
// 42501 rather than an empty list, so failures here are loud by design.
// See supabase/migrations/20260725000002_admin_activity_rpcs.sql.

export interface RosterEntry {
  id: string
  username: string | null
  displayName: string | null
  isFounder: boolean
  joinedAt: string
  spotCount: number
  reviewCount: number
  lastActive: string | null
}

export type ActivityKind = 'spot' | 'review'

export interface AdminActivityEntry {
  kind: ActivityKind
  id: string
  userId: string | null
  username: string | null
  displayName: string | null
  title: string
  detail: string | null
  rating: number | null
  privacy: string | null
  createdAt: string
}

export async function getUserRoster(): Promise<RosterEntry[]> {
  const { data, error } = await supabase.rpc('admin_user_roster')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: any) => ({
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    isFounder: r.is_founder === true,
    joinedAt: r.joined_at,
    spotCount: Number(r.spot_count ?? 0),
    reviewCount: Number(r.review_count ?? 0),
    lastActive: r.last_active ?? null,
  }))
}

export async function getRecentActivity(limit = 50): Promise<AdminActivityEntry[]> {
  const { data, error } = await supabase.rpc('admin_recent_activity', { p_limit: limit })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: any) => ({
    kind: r.kind === 'review' ? 'review' : 'spot',
    id: r.id,
    userId: r.user_id ?? null,
    username: r.username ?? null,
    displayName: r.display_name ?? null,
    title: r.title ?? 'Untitled',
    detail: r.detail ?? null,
    rating: r.rating ?? null,
    privacy: r.privacy ?? null,
    createdAt: r.created_at,
  }))
}
