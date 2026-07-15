import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import TacoGlyph from '../../assets/taco-glyph.svg'
import { colors, spacing, radius, fonts } from '../utils/theme'

interface DotProgressIndicatorProps {
  placesLogged: number
}

const TOTAL_DOTS = 15

// The free tier's 15 spots drawn as a passport page: each logged spot stamps
// a slot. Same mechanic as the old dot meter — the journey is the frame, not
// the paywall.
export function DotProgressIndicator({ placesLogged }: DotProgressIndicatorProps) {
  const filled = Math.min(placesLogged, TOTAL_DOTS)

  return (
    <View style={styles.page}>
      <View style={styles.headerRow}>
        <Text style={styles.passportLabel}>PASSPORT</Text>
        <Text style={styles.countText}>
          <Text style={styles.countNumber}>{filled}</Text>
          <Text style={styles.countOf}> of {TOTAL_DOTS} spots stamped</Text>
        </Text>
      </View>
      <View style={styles.stampRow}>
        {Array.from({ length: TOTAL_DOTS }, (_, i) => {
          const isFilled = i < filled
          // Stamps land slightly askew, like a real passport page.
          const tilt = isFilled ? `${((i % 3) - 1) * 9}deg` : '0deg'
          return (
            <View
              key={i}
              testID="progress-dot"
              accessibilityState={{ selected: isFilled }}
              accessibilityLabel={`Spot ${i + 1} of ${TOTAL_DOTS}${isFilled ? ', stamped' : ', empty'}`}
              style={[styles.stamp, isFilled ? styles.stampFilled : styles.stampEmpty, { transform: [{ rotate: tilt }] }]}
            >
              {isFilled && <TacoGlyph width={14} height={14} />}
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: 'rgba(36, 28, 22, 0.6)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderStyle: 'dashed',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  passportLabel: {
    fontSize: 10,
    fontFamily: fonts.display,
    color: colors.creamDim,
    letterSpacing: 2.5,
  },
  countText: { textAlign: 'right' },
  countNumber: { color: colors.amber, fontWeight: '700', fontSize: 13 },
  countOf: { color: colors.creamMuted, fontSize: 12 },
  stampRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stamp: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  stampEmpty: {
    borderColor: colors.creamDim,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  stampFilled: {
    borderColor: colors.amber,
    backgroundColor: colors.amberSubtle,
  },
})
