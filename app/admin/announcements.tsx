import { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/authStore'
import { listAll } from '../../src/services/announcementService'
import type { Announcement } from '../../src/types/announcement'
import { colors, spacing, radius, fonts } from '../../src/utils/theme'

export default function FounderAnnouncementsScreen() {
  const { profile } = useAuthStore()
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setItems(await listAll())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load announcements')
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
    return <View style={[styles.container, styles.center]}><Text style={styles.muted}>Admin access required</Text></View>
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerSlotLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.cream} />
          </TouchableOpacity>
        </View>
        <Text style={styles.heading}>Announcements</Text>
        <View style={styles.headerSlotRight}>
          <TouchableOpacity
            onPress={() => router.push('/admin/announcement-edit')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="New announcement"
            style={styles.iconBtn}
          >
            <Ionicons name="add" size={26} color={colors.amber} />
          </TouchableOpacity>
        </View>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.amber} size="large" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={a => a.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.lg }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.amber} />}
          ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
          ListEmptyComponent={<Text style={[styles.muted, { textAlign: 'center', marginTop: spacing.xl }]}>No announcements yet. Tap + to write one.</Text>}
          renderItem={({ item }) => {
            const sent = item.publishedAt !== null
            const status = sent ? `Sent ${new Date(item.publishedAt!).toLocaleDateString()}` : `Edited ${new Date(item.updatedAt).toLocaleDateString()}`
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push({ pathname: '/admin/announcement-edit', params: { id: item.id } })}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${sent ? 'Sent' : 'Draft'}. ${item.title}. ${status}`}
              >
                <View style={[styles.chip, sent ? styles.chipSent : styles.chipDraft]}>
                  <Text style={[styles.chipText, sent && { color: colors.bg }]}>{sent ? 'Sent' : 'Draft'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.muted}>{status}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.creamDim} />
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  headerSlotLeft: { width: 96, alignItems: 'flex-start' },
  headerSlotRight: { width: 96, alignItems: 'flex-end' },
  iconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontFamily: fonts.display, fontSize: 20, color: colors.cream, textAlign: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  chipDraft: { borderWidth: 1, borderColor: colors.creamDim },
  chipSent: { backgroundColor: colors.amber },
  chipText: { fontSize: 11, fontWeight: '700', color: colors.creamMuted },
  title: { fontSize: 15, color: colors.cream, fontWeight: '600' },
  muted: { fontSize: 12, color: colors.creamDim, marginTop: 2 },
  error: { color: colors.error, marginBottom: spacing.sm },
})
