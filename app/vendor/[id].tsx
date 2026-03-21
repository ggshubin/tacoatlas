import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { vendorRepository } from '../../src/services/vendorRepository'
import { reviewRepository } from '../../src/services/reviewRepository'
import { TacoRating } from '../../src/components/TacoRating'
import { colors, spacing, typography, radius } from '../../src/utils/theme'
import type { Vendor, Review } from '../../src/types/database'

export default function VendorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [v, r, avg] = await Promise.all([
        vendorRepository.getVendorById(id),
        reviewRepository.getReviewsForVendor(id),
        reviewRepository.getAverageRating(id),
      ])
      setVendor(v)
      setReviews(r)
      setAvgRating(avg)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <ActivityIndicator style={styles.loader} color={colors.terracotta} size="large" />
  if (!vendor) return <View style={styles.center}><Text style={styles.notFound}>Vendor not found</Text></View>

  // Aggregate taco type ratings across all reviews
  const tacoSummary: Record<string, number[]> = {}
  reviews.forEach(r =>
    r.taco_entries?.forEach(t => {
      if (!tacoSummary[t.taco_type]) tacoSummary[t.taco_type] = []
      tacoSummary[t.taco_type].push(t.rating)
    })
  )

  // Aggregate salsa ratings
  const salsaSummary: Record<string, { ratings: number[], heatLevels: string[] }> = {}
  reviews.forEach(r =>
    r.salsa_entries?.forEach(s => {
      if (!salsaSummary[s.salsa_name]) salsaSummary[s.salsa_name] = { ratings: [], heatLevels: [] }
      salsaSummary[s.salsa_name].ratings.push(s.flavor_rating)
      if (s.heat_level) salsaSummary[s.salsa_name].heatLevels.push(s.heat_level)
    })
  )

  // Return intent summary
  const returnCounts = reviews.reduce((acc, r) => {
    if (r.return_intent) acc[r.return_intent] = (acc[r.return_intent] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Zone 1 — The Spot */}
      {vendor.photo_url && (
        <Image source={{ uri: vendor.photo_url }} style={styles.heroPhoto} />
      )}

      <View style={styles.header}>
        <Text style={styles.name}>{vendor.name}</Text>
        {vendor.city && (
          <Text style={styles.city}>{vendor.city.name}{vendor.city.state_region ? `, ${vendor.city.state_region}` : ''}</Text>
        )}
        {vendor.hours && <Text style={styles.hours}>🕐 {vendor.hours}</Text>}
      </View>

      {avgRating !== null && (
        <View style={styles.ratingSection}>
          <TacoRating value={Math.round(avgRating)} readonly size={32} />
          <Text style={styles.avgText}>{avgRating.toFixed(1)} / 5 · {reviews.length} review{reviews.length !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {/* Zone 2 — The Verdict */}
      {Object.keys(returnCounts).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Would Come Back?</Text>
          <View style={styles.returnRow}>
            {returnCounts.yes && <Text style={styles.returnYes}>Hell yes 🤙 ({returnCounts.yes})</Text>}
            {returnCounts.maybe && <Text style={styles.returnMaybe}>Maybe ({returnCounts.maybe})</Text>}
            {returnCounts.no && <Text style={styles.returnNo}>Nah ({returnCounts.no})</Text>}
          </View>
        </View>
      )}

      {Object.keys(tacoSummary).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tacos</Text>
          {Object.entries(tacoSummary).map(([type, ratings]) => {
            const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
            return (
              <View key={type} style={styles.tacoRow}>
                <Text style={styles.tacoType}>{type}</Text>
                <TacoRating value={Math.round(avg)} readonly size={14} />
                <Text style={styles.tacoAvg}>{avg.toFixed(1)} ({ratings.length})</Text>
              </View>
            )
          })}
        </View>
      )}

      {Object.keys(salsaSummary).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salsas</Text>
          {Object.entries(salsaSummary).map(([name, data]) => {
            const avg = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length
            const heat = data.heatLevels[0] ?? ''
            return (
              <View key={name} style={styles.tacoRow}>
                <Text style={styles.tacoType}>{name}</Text>
                <TacoRating value={Math.round(avg)} readonly size={14} />
                {heat ? <Text style={styles.heatBadge}>{heat}</Text> : null}
              </View>
            )
          })}
        </View>
      )}

      <TouchableOpacity
        style={styles.reviewButton}
        onPress={() => router.push({ pathname: '/review/add', params: { vendorId: id, vendorName: vendor.name } })}
      >
        <Text style={styles.reviewButtonText}>Add Your Review</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xxl },
  loader: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notFound: { color: colors.gray500 },
  heroPhoto: { width: '100%', height: 200 },
  header: { padding: spacing.md },
  name: { fontSize: typography.fontSizeXxl, fontWeight: typography.fontWeightBold, color: colors.cream },
  city: { fontSize: typography.fontSizeMd, color: colors.creamMuted, marginTop: spacing.xs },
  hours: { fontSize: typography.fontSizeMd, color: colors.creamMuted, marginTop: spacing.xs },
  ratingSection: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, alignItems: 'flex-start', gap: spacing.xs },
  avgText: { fontSize: typography.fontSizeMd, color: colors.cream },
  section: { marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md },
  sectionTitle: { fontSize: typography.fontSizeLg, fontWeight: typography.fontWeightBold, color: colors.cream, marginBottom: spacing.sm },
  returnRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  returnYes: { color: colors.success, fontWeight: typography.fontWeightMedium },
  returnMaybe: { color: colors.warning, fontWeight: typography.fontWeightMedium },
  returnNo: { color: colors.error, fontWeight: typography.fontWeightMedium },
  tacoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  tacoType: { flex: 1, fontSize: typography.fontSizeMd, color: colors.cream },
  tacoAvg: { fontSize: typography.fontSizeSm, color: colors.creamMuted },
  heatBadge: { fontSize: typography.fontSizeSm, color: colors.terracotta, fontWeight: typography.fontWeightMedium },
  reviewButton: {
    margin: spacing.md,
    backgroundColor: colors.terracotta,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
  reviewButtonText: { color: colors.cream, fontWeight: typography.fontWeightBold, fontSize: typography.fontSizeLg },
})
