import { useCallback, useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Modal, Alert,
} from 'react-native'
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { localStorageService } from '../../src/services/localStorage'
import { reviewRepository } from '../../src/services/reviewRepository'
import { vendorRepository } from '../../src/services/vendorRepository'
import { syncService } from '../../src/services/syncService'
import { useReviewFormStore } from '../../src/store/reviewFormStore'
import { useProStore } from '../../src/store/proStore'
import { useAuthStore } from '../../src/store/authStore'
import { TacoRating } from '../../src/components/TacoRating'
import { ConfirmModal } from '../../src/components/ConfirmModal'
import { AppBottomSheet } from '../../src/components/AppBottomSheet'
import { PrivacySelector } from '../../src/components/PrivacySelector'
import { ProPaywallModal } from '../../src/components/ProPaywallModal'
import { shareSpot } from '../../src/utils/shareSpot'
import { colors, spacing, radius, typography } from '../../src/utils/theme'
import type { LocalVendor, LocalReview } from '../../src/types/app'

const HEAT_COLOR: Record<string, string> = {
  mild: '#64B5F6',
  medium: '#FFC107',
  hot: '#FF7043',
  fire: '#FF1744',
  volcano: '#B71C1C',
}

export default function SpotDetailScreen() {
  const insets = useSafeAreaInsets()
  const { localId } = useLocalSearchParams<{ localId: string }>()
  const [vendor, setVendor] = useState<LocalVendor | null>(null)
  const [reviews, setReviews] = useState<LocalReview[]>([])
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const loadForEdit = useReviewFormStore(s => s.loadForEdit)
  const isPro = useProStore(s => s.isPro)
  const session = useAuthStore(s => s.session)
  const [showPaywall, setShowPaywall] = useState(false)
  const [showSpotMenu, setShowSpotMenu] = useState(false)
  const [showDeleteSpotModal, setShowDeleteSpotModal] = useState(false)
  const [reviewToDelete, setReviewToDelete] = useState<LocalReview | null>(null)
  const [lightboxUri, setLightboxUri] = useState<string | null>(null)

  function toggleExpanded(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const v = await localStorageService.getVendorByLocalId(localId)
        setVendor(v)
        if (v) setReviews(await localStorageService.getReviewsForVendor(v.localId))
      }
      load()
    }, [localId])
  )

  function handleEdit(review: LocalReview) {
    if (!vendor) return
    loadForEdit(review, vendor)
    router.push({ pathname: '/review/add', params: { editReviewId: review.localId, vendorLocalId: vendor.localId } })
  }

  function handleDeleteReview(review: LocalReview) {
    setReviewToDelete(review)
  }

  async function confirmDeleteReview() {
    if (!reviewToDelete) return
    await localStorageService.deleteReview(reviewToDelete.localId)
    if (reviewToDelete.supabaseReviewId) {
      reviewRepository.deleteReview(reviewToDelete.supabaseReviewId)
    }
    setReviews(prev => prev.filter(r => r.localId !== reviewToDelete.localId))
    setReviewToDelete(null)
  }

  async function confirmDeleteSpot() {
    if (vendor?.supabaseVendorId) {
      vendorRepository.deletePersonalVendor(vendor.supabaseVendorId)
    }
    await localStorageService.deleteVendor(localId)
    router.replace('/(tabs)/atlas')
  }

  if (!vendor) return null

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.overallRating, 0) / reviews.length
    : null

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/background.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      {/* Fixed header */}
      <View style={[styles.headerWrap, { paddingTop: insets.top }]}>
        <Image source={require('../../images/tacoatlas-logo-horz.png')} style={styles.headerLogo} resizeMode="contain" />
        <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.cream} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.vendorName} numberOfLines={1}>{vendor.name}</Text>
          <View style={styles.vendorMeta}>
            {vendor.spotType && (
              <View style={styles.spotTypeBadge}>
                <Text style={styles.spotTypeText}>{vendor.spotType}</Text>
              </View>
            )}
            {vendor.cityName && (
              <View style={styles.cityRow}>
                <Ionicons name="location-sharp" size={13} color={colors.creamMuted} />
                <Text style={styles.vendorCity}>{vendor.cityName}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => shareSpot(vendor, reviews)}
          accessibilityLabel="Share this spot"
        >
          <Ionicons name="share-outline" size={22} color={colors.amber} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.overflowBtn}
          onPress={() => setShowSpotMenu(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.cream} />
        </TouchableOpacity>
        </View>
      </View>

      <AppBottomSheet
        visible={showSpotMenu}
        title="Spot Options"
        options={[{ label: 'Delete Spot', icon: 'trash-outline', destructive: true, onPress: () => setShowDeleteSpotModal(true) }]}
        onClose={() => setShowSpotMenu(false)}
      />

      <ConfirmModal
        visible={showDeleteSpotModal}
        title="Delete Spot"
        body={<Text style={{ fontSize: 14, color: colors.creamMuted, lineHeight: 20 }}>Remove <Text style={{ color: colors.cream, fontWeight: '700' }}>{vendor?.name}</Text> and all its visits? This can't be undone.</Text>}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDeleteSpot}
        onCancel={() => setShowDeleteSpotModal(false)}
      />

      <ConfirmModal
        visible={!!reviewToDelete}
        title="Delete Visit"
        body="Remove this visit? This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDeleteReview}
        onCancel={() => setReviewToDelete(null)}
      />

      {/* Full-screen image lightbox */}
      <Modal visible={!!lightboxUri} transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity style={styles.lightboxClose} onPress={() => setLightboxUri(null)}>
            <Ionicons name="close" size={28} color={colors.cream} />
          </TouchableOpacity>
          {lightboxUri && (
            <Image source={{ uri: lightboxUri }} style={styles.lightboxImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      <ProPaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* About This Spot note */}
        {vendor.spotNote ? (
          <View style={styles.spotNoteRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.amber} />
            <Text style={styles.spotNoteText}>{vendor.spotNote}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.addSpotNote} onPress={() => {
            Alert.prompt?.('About this spot', 'Add a note visible on all your visits',
              (text) => { if (text !== undefined) localStorageService.updateVendor(vendor.localId, { spotNote: text || null }).then(() => {
                setVendor(prev => prev ? { ...prev, spotNote: text || null } : null)
              }) },
              'plain-text', vendor.spotNote ?? ''
            ) ?? Alert.alert('Coming soon', 'Note editing will be available soon.')
          }}>
            <Text style={styles.addSpotNoteText}>+ About this spot</Text>
          </TouchableOpacity>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statNum}>{reviews.length}</Text>
            <Text style={styles.statLabel}> visit{reviews.length !== 1 ? 's' : ''}</Text>
          </View>
          {avgRating !== null && (
            <View style={styles.statPill}>
              <TacoRating value={Math.round(avgRating)} readonly size={14} />
              <Text style={styles.statLabel}> avg</Text>
            </View>
          )}
        </View>

        {/* Privacy */}
        <Text style={styles.privacyHeading}>Who can see this?</Text>
        <View style={styles.privacyBlock}>
        <PrivacySelector
          value={vendor.privacy ?? 'public'}
          onChange={v => {
            setVendor(prev => (prev ? { ...prev, privacy: v } : prev))
            syncService.updateVendorPrivacy(vendor.localId, v, session?.user.id)
          }}
          isPro={isPro}
          isSignedIn={!!session}
          onUpgradePress={() => session ? setShowPaywall(true) : router.push('/(auth)/sign-up')}
        />
        </View>

        {/* Log Your First Visit CTA */}
        {vendor.isVisited === false && (
          <View style={styles.logVisitCta}>
            <TouchableOpacity
              style={styles.logVisitBtn}
              onPress={() => router.push({ pathname: '/review/add', params: { vendorLocalId: vendor.localId } })}
            >
              <Ionicons name="restaurant" size={20} color={colors.cream} />
              <Text style={styles.logVisitBtnText}>Log Your First Visit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Reviews */}
        {reviews.map((review, i) => {
          const isFirst = i === 0
          const isExpanded = isFirst || expandedIds.has(review.localId)
          const dateStr = new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

          return (
            <View key={review.localId} style={[styles.reviewCard, !isExpanded && styles.reviewCardCollapsed]}>

              {/* Card header — tappable on older reviews to expand/collapse */}
              <TouchableOpacity
                style={[styles.reviewHeader, !isExpanded && { marginBottom: 0 }]}
                onPress={() => !isFirst && toggleExpanded(review.localId)}
                activeOpacity={isFirst ? 1 : 0.6}
              >
                <View style={styles.reviewHeaderLeft}>
                  <Text style={styles.reviewDate}>{dateStr}</Text>
                  {isFirst && <View style={styles.latestBadge}><Text style={styles.latestBadgeText}>LATEST</Text></View>}
                </View>
                <View style={styles.reviewActions}>
                  {isExpanded && (
                    <>
                      <TouchableOpacity style={styles.editBtn} onPress={() => handleEdit(review)}>
                        <Ionicons name="pencil" size={14} color={colors.amber} />
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteReviewBtn} onPress={() => handleDeleteReview(review)}>
                        <Ionicons name="trash-outline" size={14} color={colors.error} />
                      </TouchableOpacity>
                    </>
                  )}
                  {!isFirst && !isExpanded && (
                    <TacoRating value={review.overallRating} readonly size={12} />
                  )}
                  {!isFirst && (
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.creamDim}
                    />
                  )}
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <>
                  {/* Overall rating + intent */}
                  <View style={styles.ratingRow}>
                    <TacoRating value={review.overallRating} readonly size={20} />
                    {review.returnIntent && (
                      <View style={[styles.intentBadge, { backgroundColor: review.returnIntent === 'yes' ? colors.amberSubtle : 'rgba(36,28,22,0.8)' }]}>
                        <Text style={[styles.intentText, { color: review.returnIntent === 'yes' ? colors.amber : colors.creamMuted }]}>
                          {review.returnIntent === 'yes' ? 'Hell yes 🤙' : review.returnIntent === 'maybe' ? 'Maybe' : 'Nah'}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Photos */}
                  {review.photoUris.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                      {review.photoUris.map((uri, pi) => (
                        <TouchableOpacity key={pi} onPress={() => setLightboxUri(uri)} activeOpacity={0.85}>
                          <Image source={{ uri }} style={styles.photo} />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* Tacos */}
                  {review.tacoEntries.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>TACOS</Text>
                      {review.tacoEntries.map((t, ti) => (
                        <View key={ti} style={styles.entryRow}>
                          <Ionicons name="restaurant" size={14} color={colors.amber} style={{ marginRight: 6 }} />
                          <Text style={styles.entryName}>{t.tacoType}</Text>
                          <TacoRating value={t.rating} readonly size={12} />
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Salsas */}
                  {review.salsaEntries.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>SALSAS</Text>
                      {review.salsaEntries.map((s, si) => (
                        <View key={si} style={styles.entryRow}>
                          <Ionicons name="flame" size={14} color={s.heatLevel ? HEAT_COLOR[s.heatLevel] : colors.creamDim} style={{ marginRight: 6 }} />
                          <Text style={styles.entryName}>{s.salsaName}</Text>
                          <TacoRating value={s.flavorRating} readonly size={12} />
                          {s.heatLevel && (
                            <Text style={[styles.heatTag, { color: HEAT_COLOR[s.heatLevel] }]}>{s.heatLevel}</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Condiments */}
                  {review.condiments.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>CONDIMENTS</Text>
                      <View style={styles.chipRow}>
                        {review.condiments.map(c => (
                          <View key={c} style={styles.chip}>
                            <Text style={styles.chipText}>{c}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Notes */}
                  {review.notes && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>NOTES</Text>
                      <Text style={styles.notes}>{review.notes}</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )
        })}

        {/* Add another review */}
        <TouchableOpacity
          style={styles.addReviewBtn}
          onPress={() => router.push({ pathname: '/review/add', params: { vendorLocalId: vendor.localId, vendorName: vendor.name } })}
        >
          <Ionicons name="add" size={18} color={colors.cream} />
          <Text style={styles.addReviewBtnText}>Add Another Visit</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingBottom: spacing.xxl },

  headerWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  headerLogo: { height: 28, width: 160, alignSelf: 'center', marginBottom: spacing.xs },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(36,28,22,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerText: { flex: 1 },
  shareBtn: {
    padding: spacing.sm,
  },
  vendorName: { fontSize: 28, fontWeight: '800', color: colors.cream, letterSpacing: -0.5 },
  vendorMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: 6 },
  spotTypeBadge: { backgroundColor: colors.amberSubtle, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2, borderWidth: 1, borderColor: colors.amberDim },
  spotTypeText: { fontSize: 11, color: colors.amber, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  vendorCity: { fontSize: 13, color: colors.creamMuted },

  statsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(36,28,22,0.85)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  statNum: { color: colors.amber, fontWeight: '700', fontSize: 14 },
  statLabel: { color: colors.creamMuted, fontSize: 13 },

  reviewCard: {
    backgroundColor: 'rgba(36,28,22,0.88)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  reviewCardCollapsed: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  reviewHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  reviewDate: { fontSize: 11, color: colors.creamDim, fontWeight: '500' },
  latestBadge: { backgroundColor: colors.amberSubtle, borderRadius: radius.full, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: colors.amberDim },
  latestBadgeText: { fontSize: 9, fontWeight: '800', color: colors.amber, letterSpacing: 0.8 },
  reviewActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: spacing.sm, backgroundColor: colors.amberSubtle, borderRadius: radius.full },
  editBtnText: { color: colors.amber, fontSize: 12, fontWeight: '700' },
  deleteReviewBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(224,82,82,0.15)', alignItems: 'center', justifyContent: 'center' },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  intentBadge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  intentText: { fontSize: 12, fontWeight: '600' },

  photoRow: { marginBottom: spacing.md },
  photo: { width: 120, height: 90, borderRadius: radius.md, marginRight: spacing.sm },

  lightboxOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  lightboxImage: { width: '100%', height: '85%' },
  lightboxClose: { position: 'absolute', top: 60, right: spacing.lg, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(36,28,22,0.85)', alignItems: 'center', justifyContent: 'center' },

  section: { marginTop: spacing.sm },
  sectionLabel: { fontSize: 10, fontWeight: '700', color: colors.amber, letterSpacing: 1.5, marginBottom: 6 },
  entryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  entryName: { flex: 1, fontSize: 14, color: colors.cream },
  heatTag: { fontSize: 11, fontWeight: '600', marginLeft: spacing.sm, textTransform: 'capitalize' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { backgroundColor: colors.surfaceRaised, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3, borderWidth: 1, borderColor: colors.surfaceBorder },
  chipText: { fontSize: 12, color: colors.creamMuted },

  notes: { fontSize: 14, color: colors.creamMuted, lineHeight: 20, fontStyle: 'italic' },

  addReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.amberDim,
    borderRadius: radius.full,
    paddingVertical: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  addReviewBtnText: { color: colors.cream, fontWeight: '700', fontSize: 15 },

  overflowBtn: { padding: spacing.sm },

  // Bottom sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetCard: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    paddingTop: spacing.md, paddingBottom: spacing.xl + 8, paddingHorizontal: spacing.md,
  },
  sheetTitle: { fontSize: 13, fontWeight: '700', color: colors.creamDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm, textAlign: 'center' },
  sheetOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder },
  sheetOptionText: { fontSize: 15, color: colors.cream, fontWeight: '500' },
  sheetCancel: { marginTop: spacing.sm, paddingVertical: spacing.sm + 4, alignItems: 'center' },
  sheetCancelText: { fontSize: 15, color: colors.creamMuted, fontWeight: '600' },

  // Confirmation modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surfaceBorder, padding: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.cream, marginBottom: spacing.sm },
  modalBody: { fontSize: 14, color: colors.creamMuted, marginBottom: spacing.lg, lineHeight: 20 },
  modalBold: { color: colors.cream, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.full, borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceRaised, alignItems: 'center' },
  modalCancelText: { color: colors.cream, fontWeight: '600', fontSize: 14 },
  modalDeleteBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.full, backgroundColor: colors.error, alignItems: 'center' },
  modalDeleteText: { color: colors.cream, fontWeight: '700', fontSize: 14 },

  privacyHeading: { color: colors.cream, fontSize: 13, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm, marginHorizontal: spacing.md },
  privacyBlock: { marginHorizontal: spacing.md },

  spotNoteRow: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaceRaised, borderRadius: radius.md, marginHorizontal: spacing.md, marginBottom: spacing.sm, alignItems: 'flex-start' },
  spotNoteText: { flex: 1, color: colors.creamMuted, fontSize: 13, lineHeight: 18 },
  addSpotNote: { padding: spacing.md, marginHorizontal: spacing.md, marginBottom: spacing.sm },
  addSpotNoteText: { color: colors.creamDim, fontSize: 13 },

  logVisitCta: { padding: spacing.md },
  logVisitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.amber, borderRadius: radius.full, paddingVertical: 14 },
  logVisitBtnText: { color: colors.cream, fontWeight: '700', fontSize: 15 },
})
