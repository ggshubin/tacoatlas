import { useState, useRef, useEffect, useCallback } from 'react'
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
  Platform, PanResponder, Animated, Modal, ActivityIndicator,
} from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useProStore } from '../../src/store/proStore'
import { useAuthStore } from '../../src/store/authStore'
import { useNotificationStore } from '../../src/store/notificationStore'
import { type FriendStub, type ActivityStub } from '../../src/data/mi-gente-stubs'
import {
  getFriends,
  getFriendActivity,
  getPendingRequests,
  acceptFriendRequest,
  declineFriendRequest,
  getSentRequests,
  cancelSentRequest,
  removeFriend,
  blockUser,
  INVITE_EXPIRY_DAYS,
  type FriendWithId,
  type PendingRequest,
  type SentRequest,
} from '../../src/services/miGenteService'
import { openMapsNavigation } from '../../src/utils/mapsNavigation'
import { colors, spacing, radius } from '../../src/utils/theme'

const CREW_ITEM_W = 60 // crewItem width (44) + marginRight (16)

interface DraggableItemProps {
  friend: FriendStub
  index: number
  orderLength: number
  isSelected: boolean
  isDragging: boolean
  onTap: (username: string) => void
  onDoubleTap: (username: string) => void
  onDragStart: (username: string, index: number) => void
  onDragEnd: (username: string, dx: number) => void
}

function DraggableCrewItem({ friend, index, orderLength, isSelected, isDragging, onTap, onDoubleTap, onDragStart, onDragEnd }: DraggableItemProps) {
  const translateX = useRef(new Animated.Value(0)).current
  const scale = useRef(new Animated.Value(1)).current
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isDragActiveRef = useRef(false)
  const lastTapTime = useRef(0)
  const propsRef = useRef({ friend, index, orderLength, onTap, onDoubleTap, onDragStart, onDragEnd })
  useEffect(() => { propsRef.current = { friend, index, orderLength, onTap, onDoubleTap, onDragStart, onDragEnd } })

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => isDragActiveRef.current || Math.abs(g.dx) > 2,

      onPanResponderGrant: () => {
        isDragActiveRef.current = false
        longPressTimer.current = setTimeout(() => {
          isDragActiveRef.current = true
          Animated.spring(scale, { toValue: 1.14, useNativeDriver: true }).start()
          propsRef.current.onDragStart(propsRef.current.friend.username, propsRef.current.index)
        }, 450)
      },

      onPanResponderMove: (_, g) => {
        if (!isDragActiveRef.current) return
        translateX.setValue(g.dx)
      },

      onPanResponderRelease: (_, g) => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
        if (!isDragActiveRef.current) {
          const now = Date.now()
          if (now - lastTapTime.current < 300) {
            lastTapTime.current = 0
            propsRef.current.onDoubleTap(propsRef.current.friend.username)
          } else {
            lastTapTime.current = now
            propsRef.current.onTap(propsRef.current.friend.username)
          }
        } else {
          propsRef.current.onDragEnd(propsRef.current.friend.username, g.dx)
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
          ]).start()
        }
        isDragActiveRef.current = false
      },

      onPanResponderTerminate: () => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
        isDragActiveRef.current = false
        propsRef.current.onDragEnd(propsRef.current.friend.username, 0)
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
        ]).start()
      },
    })
  ).current

  return (
    <Animated.View
      style={[styles.crewItem, { transform: [{ translateX }, { scale }], zIndex: isDragging ? 100 : 1, elevation: isDragging ? 8 : 0 }]}
      {...panResponder.panHandlers}
    >
      <View style={[styles.crewAv, isSelected && styles.crewAvSelected, isDragging && styles.crewAvDragging]}>
        <Text style={styles.crewAvText}>{friend.initials}</Text>
      </View>
      <Text style={styles.crewName} numberOfLines={1}>{friend.username.split('_')[0]}</Text>
    </Animated.View>
  )
}

export default function MiGenteScreen() {
  const { isPro } = useProStore()
  const { session } = useAuthStore()
  const { setPendingFriendCount } = useNotificationStore()
  const insets = useSafeAreaInsets()
  const toastOpacity = useRef(new Animated.Value(0)).current
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [toastMsg, setToastMsg] = useState('')
  const [friends, setFriends] = useState<FriendWithId[]>([])
  const [activity, setActivity] = useState<ActivityStub[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null)
  const [friendOrder, setFriendOrder] = useState<string[]>([])
  const [draggingUsername, setDraggingUsername] = useState<string | null>(null)
  const [friendOptionsTarget, setFriendOptionsTarget] = useState<string | null>(null)

  useFocusEffect(
    useCallback(() => {
      if (!session?.user.id) { setLoading(false); return }
      let cancelled = false
      async function load() {
        const userId = session!.user.id
        const [friendList, pending, sent] = await Promise.all([
          getFriends(userId),
          getPendingRequests(userId),
          getSentRequests(userId),
        ])
        if (cancelled) return
        setFriends(friendList)
        setFriendOrder(prev => {
          // preserve existing order, append any new friends at the end
          const newUsernames = friendList.map(f => f.username)
          const kept = prev.filter(u => newUsernames.includes(u))
          const added = newUsernames.filter(u => !kept.includes(u))
          return [...kept, ...added]
        })
        setPendingRequests(pending)

        // Auto-expire sent requests older than INVITE_EXPIRY_DAYS
        const now = Date.now()
        const expiryMs = INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
        const expired = sent.filter(r => now - new Date(r.sentAt).getTime() > expiryMs)
        const active = sent.filter(r => now - new Date(r.sentAt).getTime() <= expiryMs)
        for (const r of expired) cancelSentRequest(r.id)
        setSentRequests(active)
        setPendingFriendCount(pending.length)
        if (friendList.length > 0) {
          const feed = await getFriendActivity(friendList.map(f => f.userId))
          if (!cancelled) {
            setActivity(feed)
            if (feed.length > 0) setExpandedId(prev => prev ?? feed[0].id)
          }
        }
        if (!cancelled) setLoading(false)
      }
      load()
      return () => { cancelled = true }
    }, [session?.user.id])
  )

  const handleAvatarTap = useCallback((username: string) => {
    setSelectedFriend(prev => prev === username ? null : username)
  }, [])

  const handleAvatarDoubleTap = useCallback((username: string) => {
    const friend = friends.find(f => f.username === username)
    if (friend) router.push({ pathname: '/mi-gente/friend/[username]', params: { username, userId: friend.userId } })
  }, [friends])

  const handleDragStart = useCallback((username: string) => {
    setDraggingUsername(username)
  }, [])

  const handleDragEnd = useCallback((username: string, dx: number) => {
    setDraggingUsername(null)
    setFriendOrder(prev => {
      const currentIndex = prev.indexOf(username)
      if (currentIndex === -1) return prev
      const targetIndex = Math.max(0, Math.min(prev.length - 1, Math.round(currentIndex + dx / CREW_ITEM_W)))
      if (targetIndex === currentIndex) return prev
      const next = [...prev]
      next.splice(currentIndex, 1)
      next.splice(targetIndex, 0, username)
      return next
    })
  }, [])

  const displayActivity = selectedFriend
    ? activity.filter(a => a.friend.username === selectedFriend)
    : activity

  // --- Pro gate ---
  if (!isPro) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingHorizontal: spacing.md }]}>
        <Image source={require('../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <Image source={require('../../images/tacoatlas-logo-horz.png')} style={styles.headerLogo} resizeMode="contain" />
        <Text style={styles.title}>Mi Gente</Text>
        <View style={styles.lockedCard}>
          <Ionicons name="people-outline" size={28} color={colors.creamMuted} />
          <Text style={styles.lockedText}>Connect with your taco crew</Text>
          <View style={styles.proBadge}><Text style={styles.proBadgeText}>Pro</Text></View>
        </View>
      </View>
    )
  }

  // --- Loading ---
  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Image source={require('../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    )
  }

  // --- State A½: pending requests but no friends yet ---
  if (friends.length === 0 && pendingRequests.length > 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingHorizontal: spacing.md }]}>
        <Image source={require('../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <Image source={require('../../images/tacoatlas-logo-horz.png')} style={styles.headerLogo} resizeMode="contain" />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Mi Gente</Text>
          <TouchableOpacity style={styles.addPill} onPress={() => router.push('/mi-gente/add')}>
            <Text style={styles.addPillText}>＋ Add</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionLabel}>Friend Requests</Text>
        {pendingRequests.map(req => (
          <View key={req.id} style={styles.requestRow}>
            <View style={styles.requestAv}>
              <Text style={styles.requestAvText}>
                {(req.displayName || req.username || '?').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.requestInfo}>
              <Text style={styles.requestName}>{req.username}</Text>
              {req.displayName && <Text style={styles.requestSub}>{req.displayName}</Text>}
            </View>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={async () => {
                await acceptFriendRequest(req.id)
                setPendingRequests(prev => {
                  const next = prev.filter(r => r.id !== req.id)
                  setPendingFriendCount(next.length)
                  return next
                })
                if (session?.user.id) {
                  const updated = await getFriends(session.user.id)
                  setFriends(updated)
                  setFriendOrder(updated.map(f => f.username))
                }
              }}
            >
              <Ionicons name="checkmark" size={16} color={colors.bg} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={async () => {
                await declineFriendRequest(req.id)
                setPendingRequests(prev => {
                  const next = prev.filter(r => r.id !== req.id)
                  setPendingFriendCount(next.length)
                  return next
                })
              }}
            >
              <Ionicons name="close" size={16} color={colors.creamMuted} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    )
  }

  // --- State A: no friends, no pending, no sent ---
  if (friends.length === 0 && pendingRequests.length === 0 && sentRequests.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingHorizontal: spacing.md }]}>
        <Image source={require('../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <Image source={require('../../images/tacoatlas-logo-horz.png')} style={styles.headerLogo} resizeMode="contain" />
        <View style={styles.headerRow}>
          <Text style={styles.title}>Mi Gente</Text>
          <TouchableOpacity style={styles.addPill} onPress={() => router.push('/mi-gente/add')}>
            <Text style={styles.addPillText}>＋ Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.amber} />
          <Text style={styles.emptyTitle}>Find your taco crew</Text>
          <Text style={styles.emptySub}>Add friends to see where they're eating and share your spots</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/mi-gente/add')}>
            <Text style={styles.emptyBtnText}>＋ Add Friends</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />
        <View style={styles.methodStrip}>
          {(['search', 'invite', 'qr'] as const).map((method) => {
            const config = {
              search: { icon: 'search-outline', label: 'Search' },
              invite: { icon: 'link-outline', label: 'Invite Link' },
              qr: { icon: 'qr-code-outline', label: 'QR Code' },
            } as const
            const { icon, label } = config[method]
            return (
              <TouchableOpacity
                key={method}
                style={styles.methodBtn}
                onPress={() => router.push(`/mi-gente/add?method=${method}`)}
              >
                <Ionicons name={icon} size={16} color={colors.amber} style={{ marginBottom: 4 }} />
                <Text style={styles.methodBtnText}>{label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    )
  }

  // --- States B + C: friends present ---
  const hasActivity = activity.length > 0

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastMsg(msg)
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start()
  }

  function handleFriendOptions(username: string) {
    setFriendOptionsTarget(username)
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => (prev === id ? null : id))
  }

  function renderStars(rating: number) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
        scrollEnabled={!draggingUsername}
      >
      {/* Header */}
      <Image source={require('../../images/tacoatlas-logo-horz.png')} style={styles.headerLogo} resizeMode="contain" />
      <View style={styles.headerRow}>
        <Text style={styles.title}>Mi Gente</Text>
        <TouchableOpacity style={styles.addPill} onPress={() => router.push('/mi-gente/add')}>
          <Text style={styles.addPillText}>＋ Add</Text>
          {pendingRequests.length > 0 && (
            <View style={styles.addPillBadge}>
              <Text style={styles.addPillBadgeText}>{pendingRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Pending friend requests */}
      {pendingRequests.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Friend Requests</Text>
          {pendingRequests.map(req => (
            <View key={req.id} style={styles.requestRow}>
              <View style={styles.requestAv}>
                <Text style={styles.requestAvText}>
                  {(req.displayName || req.username || '?').slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{req.username}</Text>
                {req.displayName && <Text style={styles.requestSub}>{req.displayName}</Text>}
              </View>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={async () => {
                  await acceptFriendRequest(req.id)
                  setPendingRequests(prev => {
                    const next = prev.filter(r => r.id !== req.id)
                    setPendingFriendCount(next.length)
                    return next
                  })
                  if (session?.user.id) {
                    const updated = await getFriends(session.user.id)
                    setFriends(updated)
                    setFriendOrder(updated.map(f => f.username))
                  }
                }}
              >
                <Ionicons name="checkmark" size={16} color={colors.bg} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={async () => {
                  await declineFriendRequest(req.id)
                  setPendingRequests(prev => {
                    const next = prev.filter(r => r.id !== req.id)
                    setPendingFriendCount(next.length)
                    return next
                  })
                }}
              >
                <Ionicons name="close" size={16} color={colors.creamMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {/* Crew avatar strip */}
      <View style={styles.crewStrip}>
        {friendOrder.map((username, idx) => {
          const friend = friends.find(f => f.username === username)!
          if (!friend) return null
          return (
            <DraggableCrewItem
              key={username}
              friend={friend}
              index={idx}
              orderLength={friendOrder.length}
              isSelected={selectedFriend === username}
              isDragging={draggingUsername === username}
              onTap={handleAvatarTap}
              onDoubleTap={handleAvatarDoubleTap}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          )
        })}
        <TouchableOpacity style={styles.crewItem} onPress={() => router.push('/mi-gente/add')}>
          <View style={styles.crewAvAdd}>
            <Text style={styles.crewAvAddText}>＋</Text>
          </View>
          <Text style={[styles.crewName, { color: colors.creamDim }]}>add</Text>
        </TouchableOpacity>
      </View>

      {/* Sent / pending invites */}
      {sentRequests.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Invites Sent</Text>
          {sentRequests.map(req => {
            const daysLeft = INVITE_EXPIRY_DAYS - Math.floor((Date.now() - new Date(req.sentAt).getTime()) / 86400000)
            return (
              <View key={req.id} style={styles.sentRow}>
                <View style={styles.requestAv}>
                  <Text style={styles.requestAvText}>
                    {(req.displayName || req.username || '?').slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{req.username}</Text>
                  <Text style={styles.requestSub}>
                    Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.pendingPill}>
                  <Ionicons name="time-outline" size={11} color={colors.creamDim} />
                  <Text style={styles.pendingPillText}>Pending</Text>
                </View>
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={async () => {
                    await cancelSentRequest(req.id)
                    setSentRequests(prev => prev.filter(r => r.id !== req.id))
                  }}
                >
                  <Ionicons name="close" size={14} color={colors.creamMuted} />
                </TouchableOpacity>
              </View>
            )
          })}
        </>
      )}

      {/* State B: no activity */}
      {!hasActivity && (
        <>
          <Text style={styles.sectionLabel}>Your Crew</Text>
          {friends.map(friend => (
            <View key={friend.username} style={styles.friendRow}>
              <View style={styles.friendAv}>
                <Text style={styles.friendAvText}>{friend.initials}</Text>
              </View>
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{friend.username}</Text>
                <Text style={styles.friendSub}>Hasn't shared yet</Text>
              </View>
              <TouchableOpacity onPress={() => handleFriendOptions(friend.username)} hitSlop={8}>
                <Ionicons name="ellipsis-horizontal" size={18} color={colors.creamDim} />
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.emptyFeed}>
            <Text style={styles.emptyFeedText}>Their drops will appear here once they share a spot</Text>
          </View>
        </>
      )}

      {/* State C: activity feed */}
      {hasActivity && (
        <>
          <Text style={styles.sectionLabel}>Recent Activity</Text>
          {displayActivity.map(item => {
            const isExpanded = expandedId === item.id
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.actCard, isExpanded && styles.actCardExpanded]}
                onPress={() => toggleExpand(item.id)}
                activeOpacity={0.8}
              >
                {/* Always-visible row */}
                <View style={styles.actRow}>
                  <View style={styles.actAv}>
                    <Text style={styles.actAvText}>{item.friend.initials}</Text>
                  </View>
                  <View style={styles.actInfo}>
                    <Text style={styles.actMain}>
                      <Text style={styles.actBold}>{item.friend.username}</Text>
                      {' '}{item.type === 'pinned' ? 'pinned' : 'reviewed'}{' · '}{item.spotName}
                    </Text>
                    {item.rating && (
                      <Text style={styles.actRating}>{renderStars(item.rating)}</Text>
                    )}
                  </View>
                  <Text style={styles.actTime}>{item.timestamp}</Text>
                  <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); handleFriendOptions(item.friend.username) }}
                    hitSlop={8}
                  >
                    <Ionicons name="ellipsis-horizontal" size={14} color={colors.creamDim} />
                  </TouchableOpacity>
                </View>

                {/* Expanded detail */}
                {isExpanded && (
                  <View style={styles.actExpanded}>
                    <Text style={styles.actSpotName}>{item.spotName}</Text>
                    <Text style={styles.actSpotMeta}>{item.spotType}</Text>
                    {item.rating && <Text style={styles.actStars}>{renderStars(item.rating)}</Text>}
                    {item.note && <Text style={styles.actNote}>"{item.note}"</Text>}
                    <TouchableOpacity
                      style={styles.navBtn}
                      onPress={() => openMapsNavigation(item.lat, item.lng, item.spotName)}
                    >
                      <Ionicons name="navigate" size={14} color={colors.bg} style={{ marginRight: 6 }} />
                      <Text style={styles.navBtnText}>Get Directions</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </>
      )}
      </ScrollView>

      {/* Toast */}
      <Animated.View style={[styles.toast, { opacity: toastOpacity, bottom: insets.bottom + 24 }]} pointerEvents="none">
        <Ionicons name="checkmark-circle" size={16} color={colors.amber} />
        <Text style={styles.toastText}>{toastMsg}</Text>
      </Animated.View>

      {/* Friend options bottom sheet */}
      <Modal
        visible={friendOptionsTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFriendOptionsTarget(null)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFriendOptionsTarget(null)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Ionicons name="person-circle-outline" size={28} color={colors.amber} />
              <Text style={styles.modalUsername}>{friendOptionsTarget}</Text>
            </View>
            <View style={styles.modalDivider} />
            <TouchableOpacity
              style={styles.modalAction}
              onPress={async () => {
                const target = friendOptionsTarget
                setFriendOptionsTarget(null)
                if (!target || !session?.user.id) return
                const friendId = friends.find(f => f.username === target)?.userId
                if (friendId) await removeFriend(session.user.id, friendId)
                setFriends(prev => prev.filter(f => f.username !== target))
                setFriendOrder(prev => prev.filter(u => u !== target))
              }}
            >
              <Ionicons name="person-remove-outline" size={18} color={colors.error} />
              <Text style={[styles.modalActionText, { color: colors.error }]}>Remove Friend</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalAction}
              onPress={async () => {
                const target = friendOptionsTarget
                setFriendOptionsTarget(null)
                if (!target || !session?.user.id) return
                const friendId = friends.find(f => f.username === target)?.userId
                if (friendId) await blockUser(session.user.id, friendId)
                setFriends(prev => prev.filter(f => f.username !== target))
                setFriendOrder(prev => prev.filter(u => u !== target))
              }}
            >
              <Ionicons name="ban-outline" size={18} color={colors.error} />
              <Text style={[styles.modalActionText, { color: colors.error }]}>Block User</Text>
            </TouchableOpacity>
            <View style={styles.modalDivider} />
            <TouchableOpacity style={styles.modalAction} onPress={() => setFriendOptionsTarget(null)}>
              <Text style={[styles.modalActionText, { color: colors.creamMuted, textAlign: 'center', flex: 1 }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  headerLogo: { height: 28, width: 160, alignSelf: 'center', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: colors.cream, letterSpacing: -0.5, marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  addPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.amberDim, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, marginTop: spacing.xs },
  addPillText: { fontSize: 12, color: colors.amber, fontWeight: '700' },
  addPillBadge: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  addPillBadgeText: { fontSize: 9, fontWeight: '800', color: colors.bg },
  // Pending requests
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.amberDim, marginBottom: spacing.sm },
  requestAv: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.amberSubtle, borderWidth: 2, borderColor: colors.amberDim, alignItems: 'center', justifyContent: 'center' },
  requestAvText: { fontSize: 12, fontWeight: '700', color: colors.amber },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 13, fontWeight: '600', color: colors.cream },
  requestSub: { fontSize: 11, color: colors.creamMuted, marginTop: 2 },
  acceptBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center' },
  declineBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.surfaceBorder, alignItems: 'center', justifyContent: 'center' },
  // Sent invites
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: spacing.sm },
  pendingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceRaised, borderRadius: radius.full, borderWidth: 1, borderColor: colors.surfaceBorder, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  pendingPillText: { fontSize: 10, color: colors.creamDim, fontWeight: '600' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.creamDim, letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing.sm, marginBottom: spacing.sm },
  // Crew strip
  crewStrip: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  crewItem: { alignItems: 'center', marginRight: spacing.md, width: 44 },
  crewAv: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.amberSubtle, borderWidth: 2, borderColor: colors.amberDim, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  crewAvSelected: { borderColor: colors.amber, backgroundColor: colors.amberSubtle },
  crewAvDragging: { borderColor: colors.amber, backgroundColor: colors.amberSubtle, opacity: 0.85 },
  crewAvText: { fontSize: 12, fontWeight: '700', color: colors.amber },
  crewName: { fontSize: 9, color: colors.creamMuted, textAlign: 'center' },
  crewAvAdd: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.creamDim, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  crewAvAddText: { fontSize: 18, color: colors.creamDim },
  // Friend rows (State B)
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: spacing.sm },
  friendAv: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.amberSubtle, borderWidth: 2, borderColor: colors.amberDim, alignItems: 'center', justifyContent: 'center' },
  friendAvText: { fontSize: 12, fontWeight: '700', color: colors.amber },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 13, fontWeight: '600', color: colors.cream },
  friendSub: { fontSize: 11, color: colors.creamMuted, marginTop: 2 },

  emptyFeed: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  emptyFeedText: { fontSize: 12, color: colors.creamDim, textAlign: 'center', lineHeight: 18 },
  // Activity cards (State C)
  actCard: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: spacing.sm, overflow: 'hidden' },
  actCardExpanded: { borderColor: colors.amberDim },
  actRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  actAv: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.amberSubtle, borderWidth: 1.5, borderColor: colors.amberDim, alignItems: 'center', justifyContent: 'center' },
  actAvText: { fontSize: 10, fontWeight: '700', color: colors.amber },
  actInfo: { flex: 1 },
  actMain: { fontSize: 12, color: colors.cream },
  actBold: { fontWeight: '700' },
  actRating: { fontSize: 10, color: colors.amber, marginTop: 2 },
  actTime: { fontSize: 10, color: colors.creamDim },
  chevron: { fontSize: 10, color: colors.creamDim, marginLeft: 4 },
  actExpanded: { paddingHorizontal: spacing.sm, paddingBottom: 0 },
  actSpotName: { fontSize: 15, fontWeight: '700', color: colors.cream, marginBottom: 2 },
  actSpotMeta: { fontSize: 11, color: colors.creamMuted, marginBottom: 4 },
  actStars: { fontSize: 13, color: colors.amber, marginBottom: spacing.sm },
  actNote: { fontSize: 12, color: colors.creamMuted, fontStyle: 'italic', borderLeftWidth: 2, borderLeftColor: colors.surfaceBorder, paddingLeft: spacing.sm, marginBottom: spacing.sm, lineHeight: 18 },
  navBtn: { backgroundColor: colors.amber, borderRadius: 0, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: -spacing.sm, marginBottom: 0 },
  navBtnText: { fontSize: 13, fontWeight: '800', color: colors.bg },
  // Empty state (no friends)
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.cream, marginTop: spacing.md, marginBottom: spacing.sm },
  emptySub: { fontSize: 13, color: colors.creamMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  emptyBtn: { backgroundColor: colors.amber, borderRadius: radius.full, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: colors.bg },
  divider: { height: 1, backgroundColor: colors.surfaceBorder, marginVertical: spacing.md },
  methodStrip: { flexDirection: 'row', gap: spacing.sm },
  methodBtn: { flex: 1, backgroundColor: colors.amberSubtle, borderWidth: 1, borderColor: colors.surfaceBorder, borderRadius: radius.md, padding: spacing.sm, alignItems: 'center' },
  methodBtnText: { fontSize: 11, color: colors.amber, fontWeight: '700' },
  // Friend options modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    alignSelf: 'center', marginTop: spacing.sm, marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
  },
  modalUsername: { fontSize: 16, fontWeight: '700', color: colors.cream },
  modalDivider: { height: 1, backgroundColor: colors.surfaceBorder, marginHorizontal: spacing.md },
  modalAction: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  modalActionText: { fontSize: 15, fontWeight: '600', color: colors.cream },
  // Toast
  toast: {
    position: 'absolute', alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.amberDim,
    borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  toastText: { fontSize: 13, color: colors.cream, fontWeight: '600' },
  // Pro gate
  lockedCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.surfaceBorder, marginTop: spacing.md },
  lockedText: { flex: 1, color: colors.creamMuted, fontSize: 14 },
  proBadge: { backgroundColor: colors.amber, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  proBadgeText: { fontSize: 10, fontWeight: '800', color: colors.bg },
})
