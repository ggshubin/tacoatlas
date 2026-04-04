import { supabase } from './supabase'
import { sendFriendRequestNotification } from './notificationService'
import type { FriendStub, ActivityStub } from '../data/mi-gente-stubs'

function initials(username: string, displayName: string | null): string {
  const name = displayName || username || '?'
  const parts = name.split(/[\s_]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  return `${weeks}w ago`
}

export type FriendWithId = FriendStub & { userId: string }

export async function getFriends(userId: string): Promise<FriendWithId[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

  if (error || !data || data.length === 0) return []

  const friendIds = data.map((row: any) =>
    row.requester_id === userId ? row.addressee_id : row.requester_id
  )

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', friendIds)

  if (!profiles) return []

  return profiles.map((p: any) => {
    const username = p.username || p.id.slice(0, 8)
    return {
      userId: p.id,
      username,
      initials: initials(username, p.display_name),
      avatarUrl: p.avatar_url ?? null,
      isActive: false,
      pinCount: 0,
      reviewCount: 0,
      avgRating: 0,
    } as FriendWithId
  })
}

export async function getFriendActivity(friendUserIds: string[]): Promise<ActivityStub[]> {
  if (friendUserIds.length === 0) return []

  const { data, error } = await supabase
    .from('reviews')
    .select('id, overall_rating, notes, created_at, user_id, vendor:vendors(name, lat, lng, address, spot_type)')
    .in('user_id', friendUserIds)
    .in('privacy', ['public', 'friends'])
    .order('created_at', { ascending: false })
    .limit(50)

  if (error || !data || data.length === 0) return []

  // Fetch profiles for all reviewers
  const reviewerIds = [...new Set(data.map((r: any) => r.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', reviewerIds)

  const profileMap: Record<string, { username: string; display_name: string | null; avatar_url: string | null }> = {}
  for (const p of (profiles ?? [])) {
    profileMap[p.id] = { username: p.username || p.id.slice(0, 8), display_name: p.display_name, avatar_url: p.avatar_url ?? null }
  }

  return data
    .filter((row: any) => row.vendor)
    .map((row: any) => {
      const prof = profileMap[row.user_id] ?? { username: row.user_id.slice(0, 8), display_name: null, avatar_url: null }
      return {
        id: row.id,
        friend: {
          username: prof.username,
          initials: initials(prof.username, prof.display_name),
          avatarUrl: prof.avatar_url,
          isActive: false,
          pinCount: 0,
          reviewCount: 0,
          avgRating: 0,
        },
        type: 'reviewed' as const,
        spotName: row.vendor.name,
        spotType: (row.vendor.spot_type ?? 'taco_truck') as any,
        lat: row.vendor.lat ?? 0,
        lng: row.vendor.lng ?? 0,
        address: row.vendor.address ?? '',
        rating: row.overall_rating ?? undefined,
        note: row.notes ?? undefined,
        timestamp: relativeTime(row.created_at),
      } as ActivityStub
    })
}

export interface PendingRequest {
  id: string
  requesterId: string
  username: string
  displayName: string | null
}

export async function getPendingRequests(userId: string): Promise<PendingRequest[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id')
    .eq('addressee_id', userId)
    .eq('status', 'pending')

  if (error || !data || data.length === 0) return []

  const requesterIds = data.map((r: any) => r.requester_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', requesterIds)

  const profileMap: Record<string, any> = {}
  for (const p of (profiles ?? [])) profileMap[p.id] = p

  return data.map((row: any) => {
    const p = profileMap[row.requester_id]
    return {
      id: row.id,
      requesterId: row.requester_id,
      username: p?.username ?? row.requester_id.slice(0, 8),
      displayName: p?.display_name ?? null,
    }
  })
}

export const INVITE_EXPIRY_DAYS = 7

export interface SentRequest {
  id: string
  addresseeId: string
  username: string
  displayName: string | null
  sentAt: string
}

export async function getSentRequests(userId: string): Promise<SentRequest[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select('id, addressee_id, created_at')
    .eq('requester_id', userId)
    .eq('status', 'pending')

  if (error || !data || data.length === 0) return []

  const addresseeIds = data.map((r: any) => r.addressee_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .in('id', addresseeIds)

  const profileMap: Record<string, any> = {}
  for (const p of (profiles ?? [])) profileMap[p.id] = p

  return data.map((row: any) => {
    const p = profileMap[row.addressee_id]
    return {
      id: row.id,
      addresseeId: row.addressee_id,
      username: p?.username ?? row.addressee_id.slice(0, 8),
      displayName: p?.display_name ?? null,
      sentAt: row.created_at,
    }
  })
}

export async function cancelSentRequest(requestId: string): Promise<string | null> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', requestId)
  return error ? error.message : null
}

export async function acceptFriendRequest(requestId: string): Promise<string | null> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', requestId)
  return error ? error.message : null
}

export async function declineFriendRequest(requestId: string): Promise<string | null> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', requestId)
  return error ? error.message : null
}

export async function getUserIdsByUsernames(usernames: string[]): Promise<string[]> {
  if (usernames.length === 0) return []
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .in('username', usernames)
  return data?.map((r: any) => r.id) ?? []
}

export async function searchUserByUsername(username: string): Promise<{ id: string; username: string; displayName: string | null }[]> {
  const query = username.replace(/^@/, '').toLowerCase().trim()
  if (!query) return []
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .ilike('username', `%${query}%`)
    .limit(10)
  if (!data) return []
  return data.map((p: any) => ({ id: p.id, username: p.username, displayName: p.display_name }))
}

export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<string | null> {
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: requesterId, addressee_id: addresseeId, status: 'pending' })
  if (error) return error.message
  // Notify addressee — fire and forget, don't fail the request if notification fails
  const { data: requesterProfile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', requesterId)
    .single()
  if (requesterProfile?.username) {
    sendFriendRequestNotification(addresseeId, requesterProfile.username).catch(() => {})
  }
  return null
}

export async function removeFriend(userId: string, friendId: string): Promise<string | null> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`
    )
  return error ? error.message : null
}

export async function blockUser(userId: string, targetId: string): Promise<string | null> {
  // Remove any existing friendship first, then insert a blocked record from our side
  await removeFriend(userId, targetId)
  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: userId, addressee_id: targetId, status: 'blocked' })
  return error ? error.message : null
}
