import { useState, useCallback } from 'react'
import { View, FlatList, Text, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, router } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import { localStorageService } from '../../src/services/localStorage'
import { TacoRating } from '../../src/components/TacoRating'
import { AtlasMapView } from '../../src/components/AtlasMapView'
import { colors, spacing, radius } from '../../src/utils/theme'
import type { LocalVendor, SpotType } from '../../src/types/app'

interface VendorRow {
  vendor: LocalVendor
  visitCount: number
  avgRating: number | null
}

export default function MyTacosScreen() {
  const { session, profile } = useAuthStore()
  const [rows, setRows] = useState<VendorRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<SpotType | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')

  const filteredRows = rows.filter(({ vendor }) => {
    const matchesSearch = vendor.name.toLowerCase().includes(search.toLowerCase())
    const matchesType = filterType === null || vendor.spotType === filterType
    return matchesSearch && matchesType
  })

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
            return { vendor, visitCount: reviews.length, avgRating }
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
      <View style={styles.staticHeader}>
        <Text style={styles.headerEyebrow}>
          {profile?.display_name ? `${profile.display_name.toUpperCase()}'S COLLECTION` : 'YOUR COLLECTION'}
        </Text>
        <Text style={styles.headerTitle}>
          {profile?.display_name ? `${profile.display_name}'s Tacos` : 'My Tacos'}
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
        )}
      </View>

      {viewMode === 'map' ? (
        <AtlasMapView rows={rows} />
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={r => r.vendor.localId}
          renderItem={({ item: { vendor, visitCount, avgRating } }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/spot/${vendor.localId}`)}>
              <View style={styles.cardLeft}>
                <View style={styles.tacoIcon}>
                  <Image
                    source={require('../../assets/taco-icon.png')}
                    style={{ width: 32, height: 32, borderRadius: 6 }}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{vendor.name}</Text>
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
                <Text style={styles.reviewCount}>{visitCount}</Text>
                <Text style={styles.reviewLabel}>visit{visitCount !== 1 ? 's' : ''}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            loaded ? (
              <View style={styles.emptyState}>
                <Image
                  source={require('../../assets/taco-icon.png')}
                  style={styles.emptyIcon}
                  resizeMode="contain"
                />
                <Text style={styles.emptyTitle}>No taco spots yet</Text>
                <Text style={styles.emptySubtitle}>Start building your taco atlas by logging your first spot.</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/review/add')}>
                  <Ionicons name="add" size={20} color={colors.cream} />
                  <Text style={styles.emptyBtnText}>Log Your First Spot</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          contentContainerStyle={styles.list}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/review/add')}
        accessibilityLabel="Add a taco spot"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

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
    paddingTop: 60,
    paddingBottom: spacing.sm,
    zIndex: 10,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.amber,
    letterSpacing: 2,
    marginBottom: 4,
  },
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
  name: { fontSize: 16, fontWeight: '700', color: colors.cream, marginBottom: 2 },
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

  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  emptyIcon: { width: 80, height: 80, marginBottom: spacing.lg, opacity: 0.6 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: colors.cream, marginBottom: spacing.sm, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: colors.creamMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.amber,
    borderRadius: radius.full,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xl,
  },
  emptyBtnText: { color: colors.cream, fontWeight: '700', fontSize: 16 },
})
