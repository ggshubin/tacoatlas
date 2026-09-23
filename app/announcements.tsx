import { useMemo, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAnnouncementStore, selectUnreadCount } from '../src/store/announcementStore'
import { useAuthStore } from '../src/store/authStore'
import { sortNewestFirst } from '../src/utils/announcements'
import type { Announcement } from '../src/types/announcement'
import { colors, spacing, radius, fonts } from '../src/utils/theme'

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''
}

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets()
  const { id: openId } = useLocalSearchParams<{ id?: string }>()
  const items = useAnnouncementStore(s => s.items)
  const readIds = useAnnouncementStore(s => s.readIds)
  const unreadCount = useAnnouncementStore(selectUnreadCount)
  const { setRead, markAllRead, refresh } = useAnnouncementStore.getState()
  const [expandedId, setExpandedId] = useState<string | null>(openId ?? null)
  const [refreshing, setRefreshing] = useState(false)

  const sorted = useMemo(() => sortNewestFirst(items), [items])
  const readSet = useMemo(() => new Set(readIds), [readIds])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh(useAuthStore.getState().session?.user.id ?? null, { force: true })
    setRefreshing(false)
  }, [refresh])

  function toggleExpanded(a: Announcement) {
    const opening = expandedId !== a.id
    setExpandedId(opening ? a.id : null)
    if (opening && !readSet.has(a.id)) setRead(a.id, true)
  }

  function renderItem({ item }: { item: Announcement }) {
    const unread = !readSet.has(item.id)
    const expanded = expandedId === item.id
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => toggleExpanded(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title}`}
      >
        <View style={styles.rowHeader}>
          <View style={[styles.dot, !unread && styles.dotHidden]} />
          <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={expanded ? undefined : 1}>
            {item.title}
          </Text>
          <Text style={styles.date}>{formatDate(item.publishedAt)}</Text>
        </View>
        {expanded && (
          <View style={styles.expanded}>
            <Text style={styles.body}>{item.body}</Text>
            <TouchableOpacity onPress={() => setRead(item.id, unread)} hitSlop={8}>
              <Text style={styles.toggle}>{unread ? 'Mark as read' : 'Mark as unread'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.cream} />
        </TouchableOpacity>
        <Text style={styles.heading}>Announcements</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} hitSlop={8}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 24 }} />}
      </View>
      <FlatList
        data={sorted}
        keyExtractor={a => a.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.lg }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />}
        ListEmptyComponent={<Text style={styles.empty}>No announcements yet.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  heading: { fontFamily: fonts.display, fontSize: 20, color: colors.cream },
  markAll: { fontSize: 13, fontWeight: '600', color: colors.amber },
  row: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.surfaceBorder },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber },
  dotHidden: { backgroundColor: 'transparent' },
  title: { flex: 1, fontSize: 15, color: colors.creamMuted },
  titleUnread: { color: colors.cream, fontWeight: '700' },
  date: { fontSize: 11, color: colors.creamDim },
  expanded: { marginTop: spacing.sm, paddingLeft: 16, gap: spacing.sm },
  body: { fontSize: 14, lineHeight: 20, color: colors.cream },
  toggle: { fontSize: 12, fontWeight: '600', color: colors.amber },
  separator: { height: spacing.sm },
  empty: { textAlign: 'center', color: colors.creamDim, marginTop: spacing.xl },
})
