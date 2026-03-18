import { useState, useCallback, useEffect } from 'react'
import { View, FlatList, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, router } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import { localStorageService } from '../../src/services/localStorage'
import { TacoRating } from '../../src/components/TacoRating'
import { colors, spacing, radius } from '../../src/utils/theme'
import type { LocalVendor } from '../../src/types/app'


export default function MyTacosScreen() {
  const { session } = useAuthStore()
  const [vendors, setVendors] = useState<LocalVendor[]>([])
  const [loaded, setLoaded] = useState(false)

  useFocusEffect(
    useCallback(() => {
      const v = localStorageService.getVendors()
      setVendors(v)
      setLoaded(true)
    }, [])
  )

  // Auto-redirect to Find My Tacos if empty
  useEffect(() => {
    if (loaded && vendors.length === 0) {
      router.replace('/(tabs)/')
    }
  }, [loaded, vendors.length])

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/background.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      {/* Content */}
      <FlatList
        data={vendors}
        keyExtractor={v => v.localId}
        renderItem={({ item }) => {
          const reviews = localStorageService.getReviewsForVendor(item.localId)
          const avgRating = reviews.length
            ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
            : null

          return (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/spot/${item.localId}`)}>
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
                <Text style={styles.name}>{item.name}</Text>
                {item.cityName && (
                  <View style={styles.cityRow}>
                    <Ionicons name="location-sharp" size={12} color={colors.creamMuted} />
                    <Text style={styles.city}>{item.cityName}</Text>
                  </View>
                )}
                {item.spotType && (
                  <Text style={styles.spotType}>{item.spotType}</Text>
                )}
                {avgRating !== null ? (
                  <TacoRating value={Math.round(avgRating)} readonly size={14} />
                ) : (
                  <Text style={styles.noReviews}>No visits yet</Text>
                )}
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.reviewCount}>{reviews.length}</Text>
                <Text style={styles.reviewLabel}>visit{reviews.length !== 1 ? 's' : ''}</Text>
              </View>
            </TouchableOpacity>
          )
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerEyebrow}>YOUR COLLECTION</Text>
            <Text style={styles.headerTitle}>My Tacos</Text>
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Text style={styles.statNumber}>{vendors.length}</Text>
                <Text style={styles.statLabel}> spot{vendors.length !== 1 ? 's' : ''} tracked</Text>
              </View>
            </View>
          </View>
        }
        contentContainerStyle={styles.list}
      />

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

  header: {
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.lg,
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
  statsRow: { flexDirection: 'row' },
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
})
