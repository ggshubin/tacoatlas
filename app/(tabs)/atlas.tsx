import { useState, useCallback, useEffect } from 'react'
import { View, FlatList, Text, StyleSheet, TouchableOpacity, Image, TextInput, BackHandler } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/authStore'
import { localStorageService } from '../../src/services/localStorage'
import { TacoRating } from '../../src/components/TacoRating'
import { AtlasMapView } from '../../src/components/AtlasMapView'
import { QuickActionSheet } from '../../src/components/QuickActionSheet'
import { getFriends, getFriendActivity } from '../../src/services/miGenteService'
import { colors, spacing, radius } from '../../src/utils/theme'
import type { LocalVendor, SpotType } from '../../src/types/app'
import type { ActivityStub } from '../../src/data/mi-gente-stubs'

interface VendorRow {
  vendor: LocalVendor
  visitCount: number
  avgRating: number | null
  firstPhotoUri: string | null
}

export default function MyTacosScreen() {
  const insets = useSafeAreaInsets()
  const { session, profile } = useAuthStore()
  const [rows, setRows] = useState<VendorRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<SpotType | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [friendSpots, setFriendSpots] = useState<ActivityStub[]>([])

  useEffect(() => {
    if (viewMode !== 'map' || !session) return
    async function loadFriendSpots() {
      const friends = await getFriends(session!.user.id)
      if (friends.length === 0) return
      const spots = await getFriendActivity(friends.map(f => f.userId))
      setFriendSpots(spots.filter(s => s.lat !== 0 && s.lng !== 0))
    }
    loadFriendSpots()
  }, [viewMode, session])

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
      <View style={[styles.staticHeader, { paddingTop: insets.top }]}>
        <Image source={require('../../images/tacoatlas-logo-horz.png')} style={styles.headerLogo} resizeMode="contain" />
        <Text style={styles.headerTitle}>
          {profile?.display_name ? `${profile.display_name}'s Atlas` : 'My Atlas'}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statNumber}>{rows.length}</Text>
            <Text style={styles.statLabel}> spot{rows.length !== 1 ? 's' : ''} tracked</Text>
          </View>
        </View>
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

      {viewMode === 'map' ? (
        <AtlasMapView rows={rows} friendSpots={friendSpots} />
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={r => r.vendor.localId}
          renderItem={({ item: { vendor, visitCount, avgRating, firstPhotoUri } }) => (
            <TouchableOpacity style={[styles.card, vendor.isVisited === false && styles.cardUnvisited]} onPress={() => router.push(`/spot/${vendor.localId}`)}>
              <View style={styles.cardLeft}>
                <View style={styles.tacoIcon}>
                  {firstPhotoUri ? (
                    <Image source={{ uri: firstPhotoUri }} style={{ width: 48, height: 48, borderRadius: 6 }} resizeMode="cover" />
                  ) : (
                    <Image source={require('../../assets/taco-icon.png')} style={{ width: 32, height: 32, borderRadius: 6 }} resizeMode="contain" />
                  )}
                </View>
              </View>
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
            </TouchableOpacity>
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
        onPress={() => setShowActionSheet(true)}
        accessibilityLabel="Quick actions"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <QuickActionSheet
        visible={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        onLogVisit={() => router.push('/review/add')}
        onDropPin={() => router.push('/pin/add')}
      />

      {/* Sign up nudge */}
      {!session && (
        <View style={styles.signUpBanner}>
          <Text style={styles.bannerText}>Create an account to share your atlas</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={styles.bannerLink}>Sign Up →</Text>
          </TouchableOpacity>
        </View>
      )}
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
  headerLogo: { height: 28, width: 160, alignSelf: 'center', marginBottom: 4 },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
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
  name: { fontSize: 16, fontWeight: '700', color: colors.cream },
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.amberDim,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.amber,
  },
  bannerText: { color: colors.cream, fontSize: 13, flex: 1 },
  bannerLink: { color: colors.amber, fontWeight: '700', fontSize: 13 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(36, 28, 22, 0.88)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(61, 46, 34, 0.7)',
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
