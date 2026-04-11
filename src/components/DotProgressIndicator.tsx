import React from 'react'
import { View, StyleSheet } from 'react-native'
import { colors } from '../utils/theme'

interface DotProgressIndicatorProps {
  placesLogged: number
}

const TOTAL_DOTS = 15

export function DotProgressIndicator({ placesLogged }: DotProgressIndicatorProps) {
  const filled = Math.min(placesLogged, TOTAL_DOTS)

  return (
    <View style={styles.container}>
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
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
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
