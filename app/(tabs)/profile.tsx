import { useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/store/authStore'
import { useProStore } from '../../src/store/proStore'
import { localStorageService } from '../../src/services/localStorage'
import { colors, spacing, radius } from '../../src/utils/theme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface Stats {
  totalSpots: number
  totalVisits: number
  avgRating: number | null
}

export default function ProfileScreen() {
  const { session } = useAuthStore()
  const { isPro } = useProStore()
  const insets = useSafeAreaInsets()
  const [stats, setStats] = useState<Stats | null>(null)

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const vendors = await localStorageService.getVendors()
        const reviews = await localStorageService.getReviews()
        const ratings = reviews.filter(r => r.overallRating > 0).map(r => r.overallRating)
        setStats({
          totalSpots: vendors.length,
          totalVisits: reviews.length,
          avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
        })
      }
      load()
    }, [])
  )

  async function handleSignOut() {
    const { signOut } = useAuthStore.getState()
    await signOut()
    router.replace('/landing')
  }

  return (
    <View style={styles.container}>
    <Image source={require('../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>taco atlas</Text>
          <Text style={styles.title}>Profile</Text>
        </View>
      </View>

      {/* Identity card */}
      <View style={styles.identityCard}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={32} color={colors.amber} />
        </View>
        <View style={styles.identityInfo}>
          {session ? (
            <>
              <Text style={styles.displayName}>{session.user.email?.split('@')[0] ?? 'Taco Lover'}</Text>
              <Text style={styles.accountType}>{isPro ? '✦ Pro Member' : 'Free Account'}</Text>
            </>
          ) : (
            <>
              <Text style={styles.displayName}>Guest</Text>
              <Text style={styles.accountType}>No account — your data stays local</Text>
            </>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          {stats ? (
            <>
              <Text style={styles.statNumber}>{stats.totalSpots}</Text>
              <Text style={styles.statLabel}>Spots</Text>
            </>
          ) : <ActivityIndicator color={colors.amber} />}
        </View>
        <View style={styles.statCard}>
          {stats ? (
            <>
              <Text style={styles.statNumber}>{stats.totalVisits}</Text>
              <Text style={styles.statLabel}>Visits</Text>
            </>
          ) : <ActivityIndicator color={colors.amber} />}
        </View>
        <View style={styles.statCard}>
          {stats ? (
            <>
              <Text style={styles.statNumber}>{stats.avgRating != null ? `★ ${stats.avgRating.toFixed(1)}` : '—'}</Text>
              <Text style={styles.statLabel}>Avg Rating</Text>
            </>
          ) : <ActivityIndicator color={colors.amber} />}
        </View>
      </View>

      {/* Pro upgrade card (free users only) */}
      {!isPro && (
        <TouchableOpacity style={styles.upgradeCard} onPress={() => {}}>
          <View style={styles.upgradeCardInner}>
            <Text style={styles.upgradeTitle}>Unlock TacoAtlas Pro</Text>
            <Text style={styles.upgradePrice}>$3.99 one-time</Text>
          </View>
          <Text style={styles.upgradeSubtitle}>Cloud sync · Burritos & Tortas · Mi Gente · Advanced Stats</Text>
          <View style={styles.upgradeBtn}>
            <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Account section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {session ? (
          <View style={styles.card}>
            <View style={styles.accountRow}>
              <Ionicons name="mail-outline" size={18} color={colors.creamMuted} />
              <View style={styles.accountRowText}>
                <Text style={styles.accountEmail}>{session.user.email}</Text>
                <Text style={styles.accountSub}>Signed in</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.accountRow} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={18} color={colors.error} />
              <Text style={[styles.accountEmail, { color: colors.error }]}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.signInCard} onPress={() => router.push('/(auth)/sign-in')}>
            <Ionicons name="cloud-upload-outline" size={22} color={colors.amber} />
            <View style={styles.signInCardText}>
              <Text style={styles.signInTitle}>Back up your atlas</Text>
              <Text style={styles.signInSubtitle}>Create an account to sync across devices</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.creamDim} />
          </TouchableOpacity>
        )}
      </View>

      {/* App section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App</Text>
        <View style={styles.card}>
          <View style={styles.accountRow}>
            <Ionicons name="information-circle-outline" size={18} color={colors.creamMuted} />
            <Text style={styles.accountEmail}>TacoAtlas v1.0</Text>
          </View>
        </View>
      </View>
    </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  eyebrow: { fontSize: 11, color: colors.creamDim, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '800', color: colors.cream, letterSpacing: -0.5 },
  identityCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.surfaceBorder,
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.amberSubtle, borderWidth: 1, borderColor: colors.amberDim,
    alignItems: 'center', justifyContent: 'center',
  },
  identityInfo: { flex: 1 },
  displayName: { fontSize: 17, fontWeight: '700', color: colors.cream },
  accountType: { fontSize: 12, color: colors.creamMuted, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  statNumber: { fontSize: 22, fontWeight: '800', color: colors.cream },
  statLabel: { fontSize: 11, color: colors.creamMuted, marginTop: 2 },
  upgradeCard: {
    backgroundColor: colors.amberSubtle, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.amberDim, marginBottom: spacing.md,
  },
  upgradeCardInner: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: 4 },
  upgradeTitle: { fontSize: 16, fontWeight: '700', color: colors.cream },
  upgradePrice: { fontSize: 13, color: colors.amber, fontWeight: '600' },
  upgradeSubtitle: { fontSize: 12, color: colors.creamMuted, marginBottom: spacing.sm },
  upgradeBtn: {
    backgroundColor: colors.amber, borderRadius: radius.full,
    paddingVertical: 10, alignItems: 'center',
  },
  upgradeBtnText: { color: colors.cream, fontWeight: '700', fontSize: 14 },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.creamDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.surfaceBorder },
  accountRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  accountRowText: { flex: 1 },
  accountEmail: { fontSize: 14, color: colors.cream },
  accountSub: { fontSize: 11, color: colors.creamMuted, marginTop: 2 },
  signInCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  signInCardText: { flex: 1 },
  signInTitle: { fontSize: 15, fontWeight: '700', color: colors.cream },
  signInSubtitle: { fontSize: 12, color: colors.creamMuted, marginTop: 2 },
})
