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
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85} accessibilityLabel={vendor.name}>
      {vendor.photo_url ? (
        <Image source={{ uri: vendor.photo_url }} style={styles.photo} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoEmoji}>🌮</Text>
        </View>
      )}

      {/* Gradient overlay */}
      <View style={styles.overlay} />

      {/* Content burned into bottom */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          {avgRating !== null && (
            <View style={styles.ratingPill}>
              <Text style={styles.ratingPillText}>🌮 {avgRating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.name} numberOfLines={1}>{vendor.name}</Text>
        {vendor.city && (
          <Text style={styles.city}>
            📍 {vendor.city.name}{vendor.city.state_region ? `, ${vendor.city.state_region}` : ''}
          </Text>
        )}
        {avgRating !== null ? (
          <TacoRating value={Math.round(avgRating)} readonly size={14} />
        ) : (
          <Text style={styles.noRating}>Be the first to review</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    height: 200,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
    width: undefined,
    height: undefined,
  },
  photoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoEmoji: { fontSize: 56 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // Simulate gradient: dark at bottom, transparent at top
    background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    // Fallback gradient via background
    backgroundColor: 'rgba(0,0,0,0.0)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.xs,
  },
  ratingPill: {
    backgroundColor: colors.amber,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  ratingPillText: {
    color: colors.cream,
    fontSize: 12,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.cream,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  city: {
    fontSize: 12,
    color: colors.creamMuted,
    marginTop: 2,
    marginBottom: spacing.xs,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  noRating: {
    fontSize: 12,
    color: colors.creamMuted,
    fontStyle: 'italic',
  },
})
