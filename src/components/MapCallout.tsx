import { Text, TouchableOpacity, StyleSheet } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { openMapsNavigation } from '../utils/mapsNavigation'
import { colors, spacing, radius, fonts } from '../utils/theme'

interface Props {
  title: string
  /** Secondary line — spot type, address, or @username. */
  meta?: string | null
  metaColor?: string
  /** Tertiary line — rating or source hint. */
  detail?: string | null
  /** When provided, shows a "navigate" action that opens the maps app. */
  lat?: number
  lng?: number
  onPress: () => void
  /** Distance from screen bottom. */
  bottom?: number
}

// Dark bottom card that springs up when a map pin is selected.
// Replaces the old floating white callout.
export function MapCallout({ title, meta, metaColor, detail, lat, lng, onPress, bottom = 96 }: Props) {
  const canNavigate = lat !== undefined && lng !== undefined && (lat !== 0 || lng !== 0)

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(17).stiffness(180)}
      exiting={FadeOutDown.duration(140)}
      style={[styles.wrap, { bottom }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
        <Animated.View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {meta ? (
            <Text style={[styles.meta, metaColor ? { color: metaColor } : null]} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
          {detail ? <Text style={styles.detail} numberOfLines={1}>{detail}</Text> : null}
        </Animated.View>
        {canNavigate && (
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => openMapsNavigation(lat!, lng!, title)}
            accessibilityLabel={`Navigate to ${title}`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="navigate" size={18} color={colors.bg} />
          </TouchableOpacity>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.creamDim} />
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  body: { flex: 1 },
  title: { fontSize: 16, fontFamily: fonts.display, color: colors.cream, marginBottom: 2 },
  meta: { fontSize: 12, color: colors.creamMuted, marginBottom: 1 },
  detail: { fontSize: 12, color: colors.amber, fontWeight: '600', marginTop: 2 },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
