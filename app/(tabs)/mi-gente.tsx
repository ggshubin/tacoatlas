import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Platform,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useProStore } from '../../src/store/proStore'
import { STUB_FRIENDS, STUB_ACTIVITY, type ActivityStub } from '../../src/data/mi-gente-stubs'
import { openMapsNavigation } from '../../src/utils/mapsNavigation'
import { colors, spacing, radius, typography } from '../../src/utils/theme'

export default function MiGenteScreen() {
  const { isPro } = useProStore()
  const insets = useSafeAreaInsets()
  const [expandedId, setExpandedId] = useState<string | null>(
    STUB_ACTIVITY.length > 0 ? STUB_ACTIVITY[0].id : null
  )

  // --- Pro gate ---
  if (!isPro) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.eyebrow}>taco atlas</Text>
        <Text style={styles.title}>Mi Gente</Text>
        <View style={styles.lockedCard}>
          <Ionicons name="people-outline" size={28} color={colors.creamMuted} />
          <Text style={styles.lockedText}>Connect with your taco crew</Text>
          <View style={styles.proBadge}><Text style={styles.proBadgeText}>Pro</Text></View>
        </View>
      </View>
    )
  }

  // --- State A: no friends ---
  if (STUB_FRIENDS.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>taco atlas</Text>
            <Text style={styles.title}>Mi Gente</Text>
          </View>
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
            const labels = { search: '🔍 Search', invite: '🔗 Invite Link', qr: '📷 QR Code' }
            return (
              <TouchableOpacity
                key={method}
                style={styles.methodBtn}
                onPress={() => router.push(`/mi-gente/add?method=${method}`)}
              >
                <Text style={styles.methodBtnText}>{labels[method]}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>
    )
  }

  // --- States B + C: friends present ---
  const hasActivity = STUB_ACTIVITY.length > 0

  function handlePoke(username: string) {
    Alert.alert('', `Poke sent to ${username}! 🌮`)
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => (prev === id ? null : id))
  }

  function renderStars(rating: number) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>taco atlas</Text>
          <Text style={styles.title}>Mi Gente</Text>
        </View>
        <TouchableOpacity style={styles.addPill} onPress={() => router.push('/mi-gente/add')}>
          <Text style={styles.addPillText}>＋ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Crew avatar strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.crewStrip}>
        {STUB_FRIENDS.map(friend => (
          <TouchableOpacity
            key={friend.username}
            style={styles.crewItem}
            onPress={() => router.push(`/mi-gente/friend/${friend.username}`)}
          >
            <View style={[styles.crewAv, friend.isActive && styles.crewAvActive]}>
              <Text style={styles.crewAvText}>{friend.initials}</Text>
            </View>
            <Text style={styles.crewName} numberOfLines={1}>{friend.username.split('_')[0]}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.crewItem} onPress={() => router.push('/mi-gente/add')}>
          <View style={styles.crewAvAdd}>
            <Text style={styles.crewAvAddText}>＋</Text>
          </View>
          <Text style={[styles.crewName, { color: colors.creamDim }]}>add</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* State B: no activity */}
      {!hasActivity && (
        <>
          <Text style={styles.sectionLabel}>Your Crew</Text>
          {STUB_FRIENDS.map(friend => (
            <View key={friend.username} style={styles.friendRow}>
              <View style={[styles.friendAv, friend.isActive && styles.crewAvActive]}>
                <Text style={styles.friendAvText}>{friend.initials}</Text>
              </View>
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{friend.username}</Text>
                <Text style={styles.friendSub}>Hasn't shared yet</Text>
              </View>
              <TouchableOpacity style={styles.pokeBtn} onPress={() => handlePoke(friend.username)}>
                <Text style={styles.pokeBtnText}>🌮 Poke</Text>
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
          {STUB_ACTIVITY.map(item => {
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
                  <View style={[styles.actAv, item.friend.isActive && styles.crewAvActive]}>
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
                      <Text style={styles.navBtnText}>🌮 Get these tacos</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  eyebrow: { fontSize: 11, color: colors.creamMuted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: colors.cream, letterSpacing: -0.5, marginBottom: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  addPill: { borderWidth: 1, borderColor: colors.amberDim, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, marginTop: spacing.xs },
  addPillText: { fontSize: 12, color: colors.amber, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.creamDim, letterSpacing: 1, textTransform: 'uppercase', marginTop: spacing.sm, marginBottom: spacing.sm },
  // Crew strip
  crewStrip: { flexDirection: 'row', marginBottom: spacing.md },
  crewItem: { alignItems: 'center', marginRight: spacing.md, width: 44 },
  crewAv: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.amberSubtle, borderWidth: 2, borderColor: colors.amberDim, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  crewAvActive: { borderColor: colors.green },
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
  pokeBtn: { backgroundColor: colors.amberSubtle, borderWidth: 1, borderColor: colors.amberDim, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  pokeBtnText: { fontSize: 11, color: colors.amber, fontWeight: '700' },
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
  navBtn: { backgroundColor: colors.amber, borderRadius: 0, padding: spacing.sm, alignItems: 'center', marginHorizontal: -spacing.sm, marginBottom: 0 },
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
  // Pro gate
  lockedCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.surfaceBorder, marginTop: spacing.md },
  lockedText: { flex: 1, color: colors.creamMuted, fontSize: 14 },
  proBadge: { backgroundColor: colors.amber, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  proBadgeText: { fontSize: 10, fontWeight: '800', color: colors.bg },
})
