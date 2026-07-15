import { useEffect } from 'react'
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeIn,
  FadeInUp,
} from 'react-native-reanimated'
import { TacoPin } from './TacoPin'
import { colors, spacing, fonts } from '../utils/theme'

interface Props {
  visible: boolean
  /** Big line, e.g. "Spot #12" or "Visit logged". */
  title: string
  /** Spot name shown under the title. */
  subtitle?: string | null
  onDone: () => void
}

const DISMISS_AFTER_MS = 1800

// The moment after saving: the user's new pin drops onto their atlas with a
// spring, a ripple settles, and the count fades up. Quiet, quick, earned.
export function SaveCelebration({ visible, title, subtitle, onDone }: Props) {
  const drop = useSharedValue(-160)
  const ripple = useSharedValue(0)

  useEffect(() => {
    if (!visible) return
    drop.value = -160
    ripple.value = 0
    drop.value = withSpring(0, { damping: 14, stiffness: 160, mass: 0.9 })
    ripple.value = withDelay(220, withTiming(1, { duration: 650 }))
    const t = setTimeout(onDone, DISMISS_AFTER_MS)
    return () => clearTimeout(t)
  }, [visible])

  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: drop.value }],
  }))

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - ripple.value),
    transform: [{ scale: 0.4 + ripple.value * 1.4 }],
  }))

  if (!visible) return null

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <Pressable style={styles.backdrop} onPress={onDone}>
        <Animated.View entering={FadeIn.duration(150)} style={styles.stage}>
          <View style={styles.pinArea}>
            <Animated.View style={[styles.ripple, rippleStyle]} />
            <Animated.View style={pinStyle}>
              <TacoPin size={72} />
            </Animated.View>
          </View>
          <Animated.Text
            entering={FadeInUp.delay(320).duration(350)}
            style={styles.title}
          >
            {title}
          </Animated.Text>
          {subtitle ? (
            <Animated.Text
              entering={FadeInUp.delay(430).duration(350)}
              style={styles.subtitle}
              numberOfLines={1}
            >
              {subtitle}
            </Animated.Text>
          ) : null}
        </Animated.View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(24, 20, 15, 0.97)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: { alignItems: 'center', paddingHorizontal: spacing.xl },
  pinArea: {
    height: 130,
    width: 130,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: spacing.lg,
  },
  ripple: {
    position: 'absolute',
    bottom: -22,
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.amber,
  },
  title: {
    fontSize: 34,
    fontFamily: fonts.displayBold,
    color: colors.cream,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subtitle: { fontSize: 15, color: colors.creamMuted },
})
