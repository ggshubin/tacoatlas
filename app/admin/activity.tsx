import { useCallback, useState } from 'react'
import {
  View, Text, SectionList, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/authStore'
import {
  getUserRoster, getRecentActivity,
  type RosterEntry, type AdminActivityEntry,
} from '../../src/services/adminService'
import { colors, spacing, radius, fonts, typography } from '../../src/utils/theme'

function relativeTime(iso: string | null): string {
  if (!iso) return 'never'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function nameOf(username: string | null, displayName: string | null): string {
  return displayName || (username ? `@${username}` : 'Unknown')
}

type Row =
  | { type: 'roster'; entry: RosterEntry }
  | { type: 'activity'; entry: AdminActivityEntry }

export default function FounderActivityScreen() {
  const { profile } = useAuthStore()
  const insets = useSafeAreaInsets()
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [activity, setActivity] = useState<AdminActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [r, a] = await Promise.all([getUserRoster(), getRecentActivity(100)])
      setRoster(r)
      setActivity(a)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load activity')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    if (profile?.is_admin) load()
    else setLoading(false)
  }, [profile?.is_admin, load]))

  if (!profile?.is_admin) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.unauthorized}>Admin access required</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.amber} size="large" />
      </View>
    )
  }

  const contributors = roster.filter(r => r.spotCount > 0 || r.reviewCount > 0).length
  const sections: { title: string; subtitle: string; data: Row[] }[] = [
    {
      title: 'People',
      subtitle: `${roster.length} account${roster.length !== 1 ? 's' : ''} · ${contributors} contributing`,
      data: roster.map(entry => ({ type: 'roster', entry }) as Row),
    },
    {
      title: 'Recent activity',
      subtitle: `${activity.length} across everyone`,
      data: activity.map(entry => ({ type: 'activity', entry }) as Row),
    },
  ]

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Founder View</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.type}-${item.entry.id}`}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load() }}
            tintColor={colors.amber}
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionSub}>{section.subtitle}</Text>
          </View>
        )}
        renderItem={({ item }) =>
          item.type === 'roster'
            ? <RosterRow entry={item.entry} />
            : <ActivityRow entry={item.entry} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Nothing yet.</Text>
        }
      />
    </View>
  )
}

function RosterRow({ entry }: { entry: RosterEntry }) {
  const idle = entry.spotCount === 0 && entry.reviewCount === 0
  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        <View style={styles.nameLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {nameOf(entry.username, entry.displayName)}
          </Text>
          {entry.isFounder && (
            <View style={styles.founderTag}><Text style={styles.founderTagText}>you</Text></View>
          )}
        </View>
        <Text style={styles.rowMeta}>
          joined {relativeTime(entry.joinedAt)} · last active {relativeTime(entry.lastActive)}
        </Text>
      </View>
      <View style={styles.counts}>
        <Text style={[styles.countNum, idle && styles.countIdle]}>{entry.spotCount}</Text>
        <Text style={styles.countLabel}>spots</Text>
      </View>
      <View style={styles.counts}>
        <Text style={[styles.countNum, idle && styles.countIdle]}>{entry.reviewCount}</Text>
        <Text style={styles.countLabel}>revs</Text>
      </View>
    </View>
  )
}

function ActivityRow({ entry }: { entry: AdminActivityEntry }) {
  return (
    <View style={styles.row}>
      <View style={styles.kindIcon}>
        <Ionicons
          name={entry.kind === 'review' ? 'create-outline' : 'location-outline'}
          size={16}
          color={colors.amber}
        />
      </View>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>{entry.title}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {nameOf(entry.username, entry.displayName)}
          {entry.rating != null ? ` · ${entry.rating}/5` : ''}
          {` · ${relativeTime(entry.createdAt)}`}
        </Text>
        {!!entry.detail && (
          <Text style={styles.rowDetail} numberOfLines={1}>{entry.detail}</Text>
        )}
      </View>
      {entry.privacy && entry.privacy !== 'public' && (
        <View style={styles.privacyTag}>
          <Text style={styles.privacyTagText}>{entry.privacy}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { justifyContent: 'center', alignItems: 'center' },
  unauthorized: { color: colors.creamMuted, fontSize: typography.fontSizeLg },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  backBtn: { marginRight: spacing.sm },
  headerTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.cream },

  errorBox: {
    marginHorizontal: spacing.md, marginBottom: spacing.sm,
    padding: spacing.sm, borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.error,
  },
  errorText: { color: colors.error, fontSize: typography.fontSizeSm },

  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg, paddingBottom: spacing.sm,
  },
  sectionTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.cream },
  sectionSub: { color: colors.creamDim, fontSize: typography.fontSizeSm, marginTop: 2 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.md, marginBottom: spacing.xs,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  rowMain: { flex: 1, minWidth: 0 },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  rowTitle: { color: colors.cream, fontSize: typography.fontSizeMd, fontWeight: typography.fontWeightMedium },
  rowMeta: { color: colors.creamDim, fontSize: typography.fontSizeSm, marginTop: 2 },
  rowDetail: { color: colors.creamMuted, fontSize: typography.fontSizeSm, marginTop: 2, fontStyle: 'italic' },

  counts: { alignItems: 'center', width: 46 },
  countNum: { color: colors.amber, fontSize: typography.fontSizeLg, fontWeight: typography.fontWeightBold },
  countIdle: { color: colors.creamDim },
  countLabel: { color: colors.creamDim, fontSize: 10 },

  kindIcon: {
    width: 28, height: 28, borderRadius: 14, marginRight: spacing.sm,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.amberSubtle,
  },

  founderTag: {
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.sm,
    backgroundColor: colors.amberSubtle, borderWidth: 1, borderColor: colors.amberDim,
  },
  founderTagText: { color: colors.amber, fontSize: 10 },

  privacyTag: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm,
    backgroundColor: colors.surfaceRaised, marginLeft: spacing.xs,
  },
  privacyTagText: { color: colors.creamDim, fontSize: 10 },

  empty: { color: colors.creamDim, textAlign: 'center', padding: spacing.xl },
})
