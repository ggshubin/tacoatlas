'use client'

import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { STUB_FRIENDS, STUB_ACTIVITY } from '../../../src/data/mi-gente-stubs'
import { openMapsNavigation } from '../../../src/utils/mapsNavigation'
import { colors, spacing, radius } from '../../../src/utils/theme'

const MAX_PINS_VISIBLE = 5

export default function FriendProfileScreen() {
  const insets = useSafeAreaInsets()
  const { username } = useLocalSearchParams<{ username: string }>()
  const [showAll, setShowAll] = useState(false)

  const friend = STUB_FRIENDS.find(f => f.username === username)
  const activity = STUB_ACTIVITY.filter(a => a.friend.username === username)
  const visible = showAll ? activity : activity.slice(0, MAX_PINS_VISIBLE)

  if (!friend) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.errorText}>Friend not found.</Text>
      </View>
    )
  }

  function renderStars(rating: number) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating)
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
    >
      {/* Back */}
      <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={18} color={colors.amber} />
        <Text style={styles.backText}>Mi Gente</Text>
      </TouchableOpacity>

      {/* Hero card */}
      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <View style={[styles.av, friend.isActive && styles.avActive]}>
            <Text style={styles.avText}>{friend.initials}</Text>
          </View>
          <View>
            <Text style={styles.heroName}>{friend.username}</Text>
            <Text style={styles.heroStatus}>
              {friend.isActive ? '🟢 Active' : 'Last seen recently'}
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statN}>{friend.pinCount}</Text>
            <Text style={styles.statL}>Pins</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statN}>{friend.reviewCount}</Text>
            <Text style={styles.statL}>Reviews</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statN}>★ {friend.avgRating.toFixed(1)}</Text>
            <Text style={styles.statL}>Avg</Text>
          </View>
        </View>
      </View>

      {/* Map CTA */}
      <TouchableOpacity
        style={styles.mapCta}
        onPress={() => router.push(`/mi-gente/map/${friend.username}`)}
      >
        <Ionicons name="map-outline" size={18} color={colors.amber} />
        <Text style={styles.mapCtaText}>See {friend.username}'s Pins on Map →</Text>
      </TouchableOpacity>

      {/* Drops list */}
      <Text style={styles.sectionLabel}>Their Drops ({activity.length})</Text>
      {visible.map(item => (
        <View key={item.id} style={styles.pinRow}>
          <Text style={styles.pinEmoji}>{item.type === 'reviewed' ? '🌮' : '📍'}</Text>
          <View style={styles.pinInfo}>
            <Text style={styles.pinName}>{item.spotName}</Text>
            <Text style={styles.pinMeta}>
              {item.spotType}
              {item.rating ? ` · ${renderStars(item.rating)}` : ' · Pinned — not yet reviewed'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.goBtn}
            onPress={() => openMapsNavigation(item.lat, item.lng, item.spotName)}
          >
            <Text style={styles.goBtnText}>🌮 Go</Text>
          </TouchableOpacity>
        </View>
      ))}
      {activity.length > MAX_PINS_VISIBLE && !showAll && (
        <TouchableOpacity onPress={() => setShowAll(true)} style={styles.moreRow}>
          <Text style={styles.moreText}>＋ {activity.length - MAX_PINS_VISIBLE} more →</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  backText: { fontSize: 14, color: colors.amber },
  errorText: { color: colors.creamMuted, fontSize: 14, padding: spacing.md },
  hero: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceBorder, padding: spacing.md, marginBottom: spacing.sm },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  av: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.amberSubtle, borderWidth: 2, borderColor: colors.amberDim, alignItems: 'center', justifyContent: 'center' },
  avActive: { borderColor: colors.green },
  avText: { fontSize: 16, fontWeight: '700', color: colors.amber },
  heroName: { fontSize: 17, fontWeight: '800', color: colors.cream },
  heroStatus: { fontSize: 12, color: colors.creamMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statBox: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.surfaceBorder, padding: spacing.sm, alignItems: 'center' },
  statN: { fontSize: 16, fontWeight: '800', color: colors.cream },
  statL: { fontSize: 10, color: colors.creamMuted, marginTop: 2 },
  mapCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.amberSubtle, borderWidth: 1, borderColor: colors.amberDim, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  mapCtaText: { fontSize: 13, fontWeight: '700', color: colors.amber, flex: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.creamDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  pinRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: spacing.sm },
  pinEmoji: { fontSize: 18 },
  pinInfo: { flex: 1 },
  pinName: { fontSize: 13, fontWeight: '600', color: colors.cream },
  pinMeta: { fontSize: 11, color: colors.creamMuted, marginTop: 2 },
  goBtn: { backgroundColor: colors.amber, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  goBtnText: { fontSize: 11, fontWeight: '800', color: colors.bg },
  moreRow: { alignItems: 'center', paddingVertical: spacing.sm },
  moreText: { fontSize: 12, color: colors.creamMuted, textDecorationLine: 'underline' },
})
