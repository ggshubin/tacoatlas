import { useEffect, useState, useCallback } from 'react'
import { View, FlatList, Text, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
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
      if (!coords) {
        setError('Location access is needed to find nearby taco spots.')
        return
      }

      const nearby = await vendorRepository.getNearbyVendors(coords.lat, coords.lng)
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
        <ActivityIndicator size="large" color={colors.terracotta} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
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
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌮</Text>
            <Text style={styles.emptyText}>No taco vendors found nearby.</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/review/add')}
            >
              <Text style={styles.addButtonText}>Add a Spot</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadNearbyVendors(true) }}
            tintColor={colors.terracotta}
          />
        }
        contentContainerStyle={styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  list: { paddingVertical: spacing.sm, flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cream },
  errorText: { color: colors.gray500, fontSize: typography.fontSizeMd, textAlign: 'center', padding: spacing.lg },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { color: colors.gray500, fontSize: typography.fontSizeMd, marginBottom: spacing.lg },
  addButton: { backgroundColor: colors.terracotta, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 20 },
  addButtonText: { color: colors.white, fontWeight: typography.fontWeightBold },
})
