import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Announcement } from '../types/announcement'
import { colors, spacing, radius } from '../utils/theme'

interface AnnouncementBannerProps {
  announcement: Announcement | null
  onOpen: (id: string) => void
  onDismiss: (id: string) => void
  // Floating mode: distance from the screen bottom (the tab bar height).
  bottomOffset?: number
  // Inline mode: in-flow preview for the Founder editor.
  inline?: boolean
}

export function AnnouncementBanner({
  announcement, onOpen, onDismiss, bottomOffset = 0, inline = false,
}: AnnouncementBannerProps) {
  if (!announcement) return null
  const position = inline ? null : [styles.floating, { bottom: bottomOffset + spacing.sm }]

  return (
    <View testID="announcement-banner" style={[styles.banner, position]}>
      <TouchableOpacity
        testID="announcement-banner-open"
        style={styles.open}
        onPress={() => onOpen(announcement.id)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={announcement.title}
        accessibilityHint="Opens announcements"
      >
        <Ionicons name="megaphone-outline" size={18} color={colors.amber} />
        <Text style={styles.title} numberOfLines={1}>{announcement.title}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="announcement-banner-dismiss"
        style={styles.dismiss}
        onPress={() => onDismiss(announcement.id)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss announcement"
      >
        <Ionicons name="close" size={18} color={colors.creamMuted} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.amberDim,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  floating: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  open: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  dismiss: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.cream },
})
