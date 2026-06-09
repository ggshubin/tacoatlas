import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing } from '../utils/theme'

interface DotProgressIndicatorProps {
  placesLogged: number
}

const TOTAL_DOTS = 15

export function DotProgressIndicator({ placesLogged }: DotProgressIndicatorProps) {
  const filled = Math.min(placesLogged, TOTAL_DOTS)

  return (
    <View style={styles.container}>
      <Text style={styles.countText}>
        <Text style={styles.countNumber}>{filled}</Text>
        <Text style={styles.countOf}> of </Text>
        <Text style={styles.countNumber}>{TOTAL_DOTS}</Text>
        <Text style={styles.countLabel}> spots tracked</Text>
      </Text>
      <View style={styles.dotRow}>
        {Array.from({ length: TOTAL_DOTS }, (_, i) => {
          const isFilled = i < filled
          return (
            <View
              key={i}
              testID="progress-dot"
              accessibilityState={{ selected: isFilled }}
              accessibilityLabel={`Spot ${i + 1} of ${TOTAL_DOTS}${isFilled ? ', filled' : ', empty'}`}
              style={[styles.dot, isFilled ? styles.dotFilled : styles.dotEmpty]}
            />
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: 6,
  },
  countText: {
    textAlign: 'center',
  },
  countNumber: {
    color: colors.amber,
    fontWeight: '700',
    fontSize: 14,
  },
  countOf: {
    color: colors.creamMuted,
    fontSize: 13,
  },
  countLabel: {
    color: colors.creamMuted,
    fontSize: 13,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  dotEmpty: {
    borderColor: colors.creamDim,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    borderColor: colors.amber,
    backgroundColor: colors.amber,
  },
})
