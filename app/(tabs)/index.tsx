import { useEffect, useState } from 'react'
import { View, FlatList, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { locationService } from '../../src/services/locationService'
import { vendorRepository } from '../../src/services/vendorRepository'
import { reviewRepository } from '../../src/services/reviewRepository'
import { VendorCard } from '../../src/components/VendorCard'
import { colors, spacing, typography } from '../../src/utils/theme'
import type { Vendor } from '../../src/types/database'

export default function HomeScreen() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [ratings, setRatings] = useState<Record<string, number | null>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadNearbyVendors()
  }, [])

  async function loadNearbyVendors(isRefresh = false) {
    if (!isRefresh) setLoading(true)
    setError(null)
    try {
      const coords = await locationService.getCurrentLocation()
      // If no location, use a global radius so all vendors load
      const nearby = await vendorRepository.getNearbyVendors(
        coords?.lat ?? 0,
        coords?.lng ?? 0,
        coords ? 25 : 20000
      )
      setVendors(nearby)
      const ratingMap: Record<string, number | null> = {}
      await Promise.all(
        nearby.map(async (v) => {
          ratingMap[v.id] = await reviewRepository.getAverageRating(v.id)
        })
      )
      setRatings(ratingMap)
    } catch {
      setError('Could not load vendors. Pull down to try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Image source={require('../../assets/taco-icon.png')} style={styles.centerIcon} resizeMode="contain" />
        <ActivityIndicator size="large" color={colors.amber} style={{ marginTop: spacing.md }} />
        <Text style={styles.loadingText}>Finding tacos near you...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Image source={require('../../assets/taco-icon.png')} style={[styles.centerIcon, { opacity: 0.5 }]} resizeMode="contain" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/map-background.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <FlatList
        data={vendors}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => (
          <VendorCard
            vendor={item}
            avgRating={ratings[item.id] ?? null}
            onPress={() => router.push(`/vendor/${item.id}`)}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerEyebrow}>TACO ATLAS</Text>
            <Text style={styles.headerTitle}>Find My Tacos</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Image source={require('../../assets/taco-icon.png')} style={styles.emptyIcon} resizeMode="contain" />
            <Text style={styles.emptyTitle}>No spots found nearby.</Text>
            <Text style={styles.emptySubtext}>Be the first to put one on the map.</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => router.push('/review/add')}>
              <Text style={styles.addButtonText}>+ Add a Spot</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadNearbyVendors(true) }}
            tintColor={colors.amber}
          />
        }
        contentContainerStyle={styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { paddingBottom: spacing.xl, flexGrow: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing.xl,
  },
  centerIcon: { width: 80, height: 80, marginBottom: spacing.md },
  loadingText: {
    color: colors.creamMuted,
    fontSize: 14,
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  errorText: {
    color: colors.creamMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.md,
  },
  headerEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.amber,
    letterSpacing: 2,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.cream,
    letterSpacing: -0.5,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    minHeight: 400,
  },
  emptyIcon: { width: 100, height: 100, marginBottom: spacing.md },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.cream,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.creamMuted,
    marginBottom: spacing.lg,
  },
  addButton: {
    backgroundColor: colors.amber,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: 999,
  },
  addButtonText: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
})
