import { useState, useCallback } from 'react'
import { View, FlatList, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import { localStorageService } from '../../src/services/localStorage'
import { TacoRating } from '../../src/components/TacoRating'
import { colors, spacing, typography, radius } from '../../src/utils/theme'
import type { LocalVendor } from '../../src/types/app'

export default function AtlasScreen() {
  const { session } = useAuthStore()
  const [vendors, setVendors] = useState<LocalVendor[]>([])

  useFocusEffect(
    useCallback(() => {
      setVendors(localStorageService.getVendors())
    }, [])
  )

  return (
    <View style={styles.container}>
      <FlatList
        data={vendors}
        keyExtractor={v => v.localId}
        renderItem={({ item }) => {
          const reviews = localStorageService.getReviewsForVendor(item.localId)
          const avgRating = reviews.length
            ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
            : null

          return (
            <View style={styles.card}>
              <View style={styles.cardBody}>
                <Text style={styles.name}>{item.name}</Text>
                {item.cityName && <Text style={styles.city}>{item.cityName}</Text>}
                {item.hours && <Text style={styles.hours}>{item.hours}</Text>}
                {avgRating !== null ? (
                  <TacoRating value={Math.round(avgRating)} readonly size={16} />
                ) : (
                  <Text style={styles.noReviews}>No reviews yet</Text>
                )}
              </View>
              <Text style={styles.reviewCount}>
                {reviews.length} review{reviews.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>My Atlas</Text>
            <Text style={styles.headerSubtitle}>
              {vendors.length} spot{vendors.length !== 1 ? 's' : ''} tracked
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🗺️</Text>
            <Text style={styles.emptyText}>Your atlas is empty.</Text>
            <Text style={styles.emptySubtext}>Start tracking taco spots!</Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/review/add')}
        accessibilityLabel="Add a taco spot"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {!session && (
        <View style={styles.signUpBanner}>
          <Text style={styles.bannerText}>Create an account to share your atlas</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
            <Text style={styles.bannerLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  list: { paddingBottom: 100, flexGrow: 1 },
  header: { padding: spacing.md, paddingTop: spacing.xl },
  headerTitle: {
    fontSize: typography.fontSizeXxl,
    fontWeight: typography.fontWeightBold,
    color: colors.brown,
  },
  headerSubtitle: { fontSize: typography.fontSizeMd, color: colors.gray500, marginTop: spacing.xs },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
    shadowColor: colors.brown,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardBody: { flex: 1 },
  name: {
    fontSize: typography.fontSizeLg,
    fontWeight: typography.fontWeightBold,
    color: colors.brown,
  },
  city: { fontSize: typography.fontSizeSm, color: colors.gray500, marginBottom: spacing.xs },
  hours: { fontSize: typography.fontSizeSm, color: colors.gray500 },
  noReviews: { fontSize: typography.fontSizeSm, color: colors.gray300, marginTop: spacing.xs },
  reviewCount: { fontSize: typography.fontSizeSm, color: colors.gray500 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    minHeight: 300,
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyText: {
    fontSize: typography.fontSizeLg,
    fontWeight: typography.fontWeightBold,
    color: colors.brown,
  },
  emptySubtext: { fontSize: typography.fontSizeMd, color: colors.gray500, marginTop: spacing.xs },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: spacing.lg,
    backgroundColor: colors.terracotta,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.brown,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: colors.white, fontSize: 28, lineHeight: 32 },
  signUpBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.terracottaLight,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerText: { color: colors.white, fontSize: typography.fontSizeSm, flex: 1 },
  bannerLink: { color: colors.white, fontWeight: typography.fontWeightBold, marginLeft: spacing.sm },
})
