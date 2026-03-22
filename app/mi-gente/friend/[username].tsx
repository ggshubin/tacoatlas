import { useState, useEffect } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Image } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../../src/store/authStore'
import { getFriendActivity, removeFriend } from '../../../src/services/miGenteService'
import { openMapsNavigation } from '../../../src/utils/mapsNavigation'
import { colors, spacing, radius } from '../../../src/utils/theme'
import type { ActivityStub } from '../../../src/data/mi-gente-stubs'

const MAX_PINS_VISIBLE = 5

function initials(username: string): string {
  const name = username || '?'
  const parts = name.split(/[\s_]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function FriendProfileScreen() {
  const insets = useSafeAreaInsets()
  const { username, userId } = useLocalSearchParams<{ username: string; userId: string }>()
  const { session } = useAuthStore()
  const [activity, setActivity] = useState<ActivityStub[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    getFriendActivity([userId]).then(data => {
      setActivity(data)
      setLoading(false)
    })
  }, [userId])

  async function handleConfirmRemove() {
    if (!session?.user.id || !userId) return
    setRemoving(true)
    await removeFriend(session.user.id, userId)
    setRemoving(false)
    setShowRemoveModal(false)
    router.back()
  }

  function renderStars(rating: number) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  const visible = showAll ? activity : activity.slice(0, MAX_PINS_VISIBLE)

  return (
    <View style={styles.container}>
      <Image source={require('../../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Image source={require('../../../images/tacoatlas-logo-horz.png')} style={styles.headerLogo} resizeMode="contain" />
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.cream} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{username}</Text>
          <TouchableOpacity style={styles.removeIconBtn} onPress={() => setShowRemoveModal(true)}>
            <Ionicons name="person-remove-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero card */}
        <View style={styles.hero}>
          <View style={styles.av}>
            <Text style={styles.avText}>{initials(username ?? '')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{username}</Text>
            <Text style={styles.heroStatus}>Taco crew member</Text>
          </View>
        </View>

        {/* Map CTA */}
        <TouchableOpacity
          style={styles.mapCta}
          onPress={() => router.push({ pathname: '/mi-gente/map/[username]', params: { username, userId } })}
        >
          <Ionicons name="map-outline" size={18} color={colors.amber} />
          <Text style={styles.mapCtaText}>See {username}'s Pins on Map →</Text>
        </TouchableOpacity>

        {/* Activity */}
        <Text style={styles.sectionLabel}>Their Drops ({activity.length})</Text>

        {loading ? (
          <ActivityIndicator color={colors.amber} style={{ marginTop: spacing.xl }} />
        ) : activity.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No shared drops yet</Text>
          </View>
        ) : (
          <>
            {visible.map(item => (
              <View key={item.id} style={styles.pinRow}>
                <Text style={styles.pinEmoji}>{item.type === 'reviewed' ? '🌮' : '📍'}</Text>
                <View style={styles.pinInfo}>
                  <Text style={styles.pinName}>{item.spotName}</Text>
                  <Text style={styles.pinMeta}>
                    {item.spotType}
                    {item.rating ? ` · ${renderStars(item.rating)}` : ' · Not yet reviewed'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.goBtn}
                  onPress={() => openMapsNavigation(item.lat, item.lng, item.spotName)}
                >
                  <Text style={styles.goBtnText}>🌮 Go</Text>
                </TouchableOpacity>
              </View>
            ))}
            {activity.length > MAX_PINS_VISIBLE && !showAll && (
              <TouchableOpacity onPress={() => setShowAll(true)} style={styles.moreRow}>
                <Text style={styles.moreText}>＋ {activity.length - MAX_PINS_VISIBLE} more →</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Remove Friend confirmation modal */}
      <Modal visible={showRemoveModal} transparent animationType="fade" onRequestClose={() => setShowRemoveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Remove Friend</Text>
            <Text style={styles.modalBody}>
              Remove <Text style={styles.modalUsername}>{username}</Text> from your crew? They won't be notified.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowRemoveModal(false)}>
                <Text style={styles.modalCancelText}>Keep</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalRemoveBtn} onPress={handleConfirmRemove} disabled={removing}>
                {removing
                  ? <ActivityIndicator color={colors.cream} size="small" />
                  : <Text style={styles.modalRemoveText}>Remove</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLogo: { height: 28, width: 160, alignSelf: 'center', marginBottom: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(36,28,22,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.cream },
  removeIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(224,82,82,0.12)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(224,82,82,0.3)',
  },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceBorder, padding: spacing.md, marginBottom: spacing.sm, marginTop: spacing.sm },
  av: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.amberSubtle, borderWidth: 2, borderColor: colors.amberDim, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 16, fontWeight: '700', color: colors.amber },
  heroName: { fontSize: 17, fontWeight: '800', color: colors.cream },
  heroStatus: { fontSize: 12, color: colors.creamMuted, marginTop: 2 },
  mapCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.amberSubtle, borderWidth: 1, borderColor: colors.amberDim, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  mapCtaText: { fontSize: 13, fontWeight: '700', color: colors.amber, flex: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.creamDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  emptyState: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder, borderStyle: 'dashed', borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' },
  emptyText: { fontSize: 13, color: colors.creamDim },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: spacing.sm },
  pinEmoji: { fontSize: 18 },
  pinInfo: { flex: 1 },
  pinName: { fontSize: 13, fontWeight: '600', color: colors.cream },
  pinMeta: { fontSize: 11, color: colors.creamMuted, marginTop: 2 },
  goBtn: { backgroundColor: colors.amber, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  goBtnText: { fontSize: 11, fontWeight: '800', color: colors.bg },
  moreRow: { alignItems: 'center', paddingVertical: spacing.sm },
  moreText: { fontSize: 12, color: colors.creamMuted, textDecorationLine: 'underline' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surfaceBorder, padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.cream, marginBottom: spacing.sm },
  modalBody: { fontSize: 14, color: colors.creamMuted, marginBottom: spacing.lg, lineHeight: 20 },
  modalUsername: { color: colors.cream, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.full, borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceRaised, alignItems: 'center' },
  modalCancelText: { color: colors.cream, fontWeight: '600', fontSize: 14 },
  modalRemoveBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.full, backgroundColor: colors.error, alignItems: 'center' },
  modalRemoveText: { color: colors.cream, fontWeight: '700', fontSize: 14 },
})
