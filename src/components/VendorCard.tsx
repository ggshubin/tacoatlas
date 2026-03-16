import React from 'react'
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native'
import { TacoRating } from './TacoRating'
import { colors, spacing, radius, typography } from '../utils/theme'
import type { Vendor } from '../types/database'

interface Props {
  vendor: Vendor
  avgRating: number | null
  onPress: () => void
}

export function VendorCard({ vendor, avgRating, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} accessibilityLabel={vendor.name}>
      {vendor.photo_url ? (
        <Image source={{ uri: vendor.photo_url }} style={styles.photo} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoEmoji}>🌮</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{vendor.name}</Text>
        {vendor.city && (
          <Text style={styles.city}>{vendor.city.name}{vendor.city.state_region ? `, ${vendor.city.state_region}` : ''}</Text>
        )}
        {avgRating !== null ? (
          <View style={styles.ratingRow}>
            <TacoRating value={Math.round(avgRating)} readonly size={16} />
            <Text style={styles.ratingText}>{avgRating.toFixed(1)}</Text>
          </View>
        ) : (
          <Text style={styles.noRating}>No ratings yet</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: colors.brown,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  photo: { width: 80, height: 80 },
  photoPlaceholder: {
    width: 80, height: 80,
    backgroundColor: colors.creamDark,
    justifyContent: 'center', alignItems: 'center',
  },
  photoEmoji: { fontSize: 32 },
  body: { flex: 1, padding: spacing.sm, justifyContent: 'center' },
  name: { fontSize: typography.fontSizeLg, fontWeight: typography.fontWeightBold, color: colors.brown },
  city: { fontSize: typography.fontSizeSm, color: colors.gray500, marginBottom: spacing.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ratingText: { fontSize: typography.fontSizeSm, color: colors.gray700 },
  noRating: { fontSize: typography.fontSizeSm, color: colors.gray300 },
})
