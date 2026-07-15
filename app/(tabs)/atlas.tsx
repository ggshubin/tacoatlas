import { useState, useCallback, useEffect } from 'react'
import { View, FlatList, Text, StyleSheet, TouchableOpacity, Image, TextInput, BackHandler } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/authStore'
import { useProStore } from '../../src/store/proStore'
import { localStorageService } from '../../src/services/localStorage'
import { photoService } from '../../src/services/photoService'
import { distanceMeters } from '../../src/utils/geo'
import { TacoRating } from '../../src/components/TacoRating'
import { AtlasMapView } from '../../src/components/AtlasMapView'
import { QuickActionSheet } from '../../src/components/QuickActionSheet'
import { DotProgressIndicator } from '../../src/components/DotProgressIndicator'
import { UpgradeNudge } from '../../src/components/UpgradeNudge'
import { ProPaywallModal } from '../../src/components/ProPaywallModal'
import { colors, spacing, radius, fonts } from '../../src/utils/theme'
import type { LocalVendor, SpotType } from '../../src/types/app'

interface VendorRow {
  vendor: LocalVendor
  visitCount: number
  avgRating: number | null
  firstPhotoUri: string | null
}

export default function MyTacosScreen() {
  const insets = useSafeAreaInsets()
  const { session, profile } = useAuthStore()
  const isPro = useProStore(s => s.isPro)
  const [rows, setRows] = useState<VendorRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<SpotType | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const [showPaywall, setShowPaywall] = useState(false)
  const [nearbySpot, setNearbySpot] = useState<LocalVendor | null>(null)

  // Location-first logging: when the sheet opens, quietly look for a saved
  // spot within walking-up-to-the-window distance and lead with it.
  const NEARBY_RADIUS_M = 150
  async function openQuickActions() {
    setNearbySpot(null)
    setShowActionSheet(true)
    try {
      const { status } = await Location.getForegroundPermissionsAsync()
      if (status !== 'granted') return
      const pos =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }))
      if (!pos) return
      let best: { vendor: LocalVendor; d: number } | null = null
      for (const { vendor } of rows) {
        if (vendor.lat === 0 && vendor.lng === 0) continue
        const d = distanceMeters(pos.coords.latitude, pos.coords.longitude, vendor.lat, vendor.lng)
        if (d <= NEARBY_RADIUS_M && (!best || d < best.d)) best = { vendor, d }
      }
      if (best) setNearbySpot(best.vendor)
    } catch {
      // location is best-effort; the sheet works without it
    }
  }

  // Camera-first logging: photo first, details after.
  async function handleSnapIt() {
    try {
      const uri = await photoService.takePhoto()
      if (!uri) return
      router.push({
        pathname: '/review/add',
        params: {
          prefillPhotoUri: uri,
          ...(nearbySpot ? { vendorLocalId: nearbySpot.localId } : {}),
        },
      })
    } catch {
      // camera cancelled or unavailable — stay put
    }
  }

  const filteredRows = rows
    .filter(({ vendor }) => {
      const matchesSearch = vendor.name.toLowerCase().includes(search.toLowerCase())
      const matchesType = filterType === null || vendor.spotType === filterType
      return matchesSearch && matchesType
    })
    .sort((a, b) => new Date(b.vendor.createdAt).getTime() - new Date(a.vendor.createdAt).getTime())

  // Intercept Android back button: map view → switch to list; list view → minimize app (not navigate back)
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (viewMode === 'map') {
          setViewMode('list')
          return true
        }
        return false
      })
      return () => sub.remove()
    }, [viewMode])
  )

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const vendors = await localStorageService.getVendors()
        const result: VendorRow[] = await Promise.all(
          vendors.map(async (vendor) => {
            const reviews = await localStorageService.getReviewsForVendor(vendor.localId)
            const avgRating = reviews.length
              ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
              : null
            const firstPhotoUri = reviews.flatMap(r => r.photoUris).find(Boolean) ?? null
            return { vendor, visitCount: reviews.length, avgRating, firstPhotoUri }
          })
        )
        setRows(result)
        setLoaded(true)
      }
      load()
    }, [])
  )

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/background.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      {/* Static header — always visible */}
      <View style={[styles.staticHeader, { paddingTop: insets.top }, viewMode === 'map' && styles.staticHeaderMapOverlay]}>
        <Text style={styles.headerTitle}>
          {profile?.display_name ? `${profile.display_name}'s Atlas` : 'My Atlas'}
        </Text>
        {isPro ? (
          <View style={styles.statsRow}>
            <View style={styles.statPill}>
              <Text style={styles.statNumber}>{rows.length}</Text>
              <Text style={styles.statLabel}> spot{rows.length !== 1 ? 's' : ''} tracked</Text>
            </View>
          </View>
        ) : (
          <>
            <DotProgressIndicator placesLogged={rows.length} />
            <UpgradeNudge
              visible={!nudgeDismissed && rows.length >= 5}
              onDismiss={() => setNudgeDismissed(true)}
              onUpgrade={() => setShowPaywall(true)}
            />
          </>
        )}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <Ionicons name="list" size={16} color={viewMode === 'list' ? colors.cream : colors.creamMuted} />
            <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            onPress={() => setViewMode('map')}
          >
            <Ionicons name="map" size={16} color={viewMode === 'map' ? colors.cream : colors.creamMuted} />
            <Text style={[styles.toggleBtnText, viewMode === 'map' && styles.toggleBtnTextActive]}>Map</Text>
          </TouchableOpacity>
        </View>
        {viewMode === 'list' && (
          <>
            <View style={styles.searchRow}>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color={colors.creamMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search spots..."
                  placeholderTextColor={colors.creamMuted}
                  value={search}
                  onChangeText={setSearch}
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={16} color={colors.creamMuted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        )}
      </View>

      {/* Sign up nudge — inline so the bottom zone stays clear for the FAB */}
      {!session && viewMode === 'list' && (
        <View style={styles.signUpBanner}>
          <Text style={styles.bannerText}>Create an account to share your atlas</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={styles.bannerLink}>Sign Up →</Text>
          </TouchableOpacity>
        </View>
      )}

      {viewMode === 'map' ? (
        <AtlasMapView rows={rows} />
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={r => r.vendor.localId}
          renderItem={({ item: { vendor, visitCount, avgRating, firstPhotoUri }, index }) => (
            <Animated.View entering={FadeInDown.duration(280).delay(Math.min(index * 45, 360))}>
            <TouchableOpacity style={[styles.card, vendor.isVisited === false && styles.cardUnvisited]} onPress={() => router.push(`/spot/${vendor.localId}`)}>
              {firstPhotoUri && (
                <Image source={{ uri: firstPhotoUri }} style={styles.cardPhoto} resizeMode="cover" />
              )}
              <View style={styles.cardRow}>
              {!firstPhotoUri && (
                <View style={styles.cardLeft}>
                  <View style={styles.tacoIcon}>
                    <Image source={require('../../assets/taco-icon.png')} style={{ width: 32, height: 32, borderRadius: 6 }} resizeMode="contain" />
                  </View>
                </View>
              )}
              <View style={styles.cardBody}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{vendor.name}</Text>
                </View>
                {vendor.cityName && (
                  <View style={styles.cityRow}>
                    <Ionicons name="location-sharp" size={12} color={colors.creamMuted} />
                    <Text style={styles.city}>{vendor.cityName}</Text>
                  </View>
                )}
                {vendor.spotType && (
                  <Text style={styles.spotType}>{vendor.spotType}</Text>
                )}
                {avgRating !== null ? (
                  <TacoRating value={Math.round(avgRating)} readonly size={14} />
                ) : (
                  <Text style={styles.noReviews}>No visits yet</Text>
                )}
              </View>
              <View style={styles.cardRight}>
                {vendor.isVisited === false ? (
                  <Text style={styles.nVisitLabel}>pin</Text>
                ) : (
                  <>
                    <Text style={styles.reviewCount}>{visitCount}</Text>
                    <Text style={styles.reviewLabel}>visit{visitCount !== 1 ? 's' : ''}</Text>
                  </>
                )}
                <Ionicons
                  name={vendor.privacy === 'public' ? 'earth-outline' : vendor.privacy === 'friends' ? 'people-outline' : 'lock-closed-outline'}
                  size={13}
                  color={colors.amber}
                  style={{ marginTop: 4 }}
                />
              </View>
              </View>
            </TouchableOpacity>
            </Animated.View>
          )}
          ListEmptyComponent={
            loaded ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Your atlas is empty</Text>
                <Text style={styles.emptySubtitle}>Tap + to log your first spot.</Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.list}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openQuickActions}
        accessibilityLabel="Quick actions"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <QuickActionSheet
        visible={showActionSheet}
        suggestion={nearbySpot ? {
          name: nearbySpot.name,
          onPress: () => router.push({ pathname: '/review/add', params: { vendorLocalId: nearbySpot.localId } }),
        } : null}
        onClose={() => setShowActionSheet(false)}
        onLogVisit={() => router.push('/review/add')}
        onDropPin={() => router.push('/pin/add')}
        onSnapIt={handleSnapIt}
      />

      <ProPaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { paddingBottom: 120, flexGrow: 1 },

  staticHeader: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    zIndex: 10,
  },
  staticHeaderMapOverlay: {
    backgroundColor: 'rgba(18,12,8,0.72)',
  },
  headerTitle: {
    fontSize: 36,
    fontFamily: fonts.displayBold,
    color: colors.cream,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  statsRow: { flexDirection: 'row', marginBottom: spacing.sm },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: 'rgba(36, 28, 22, 0.6)',
  },
  toggleBtnActive: {
    backgroundColor: colors.amberDim,
    borderColor: colors.amber,
  },
  toggleBtnText: { color: colors.creamMuted, fontSize: 13, fontWeight: '600' },
  toggleBtnTextActive: { color: colors.cream },
  searchRow: {
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  searchInput: {
    flex: 1,
    color: colors.cream,
    fontSize: 14,
  },
  statPill: {
    backgroundColor: 'rgba(36, 28, 22, 0.85)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  statNumber: { color: colors.amber, fontWeight: '700', fontSize: 14 },
  statLabel: { color: colors.creamMuted, fontSize: 13 },

  cardLeft: { marginRight: spacing.sm },
  tacoIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.amberSubtle,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.amberDim,
  },
  cardBody: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name: { fontSize: 16, fontFamily: fonts.display, color: colors.cream },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 },
  city: { fontSize: 12, color: colors.creamMuted },
  spotType: { fontSize: 11, color: colors.amberDim, fontWeight: '600', letterSpacing: 0.3, marginBottom: 4, textTransform: 'uppercase' },
  noReviews: { fontSize: 12, color: colors.creamDim, fontStyle: 'italic' },
  cardRight: { alignItems: 'center', marginLeft: spacing.sm },
  reviewCount: { fontSize: 22, fontWeight: '800', color: colors.amber },
  reviewLabel: { fontSize: 10, color: colors.creamDim, textTransform: 'uppercase', letterSpacing: 0.5 },

  fab: {
    position: 'absolute',
    bottom: 80,
    right: spacing.lg,
    backgroundColor: colors.amber,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.amber,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: { color: colors.cream, fontSize: 30, lineHeight: 34, fontWeight: '300' },

  signUpBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.amberSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.amberDim,
  },
  bannerText: { color: colors.cream, fontSize: 13, flex: 1 },
  bannerLink: { color: colors.amber, fontWeight: '700', fontSize: 13 },

  card: {
    backgroundColor: 'rgba(36, 28, 22, 0.88)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(61, 46, 34, 0.7)',
    overflow: 'hidden',
  },
  cardPhoto: {
    width: '100%',
    height: 150,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  cardUnvisited: {
    borderStyle: 'dashed',
    borderColor: colors.amberDim,
  },

  nVisitLabel: { fontSize: 12, color: colors.creamDim, fontStyle: 'italic' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.cream, marginBottom: spacing.xs },
  emptySubtitle: { fontSize: 14, color: colors.creamMuted },
})
