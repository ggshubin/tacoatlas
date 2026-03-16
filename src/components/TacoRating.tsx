import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

interface Props {
  value: number
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: number
}

export function TacoRating({ value, onChange, readonly = false, size = 28 }: Props) {
  const tacos = [1, 2, 3, 4, 5]

  return (
    <View style={styles.row}>
      {tacos.map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => !readonly && onChange?.(n)}
          disabled={readonly}
          accessibilityLabel={`${n} taco${n > 1 ? 's' : ''}`}
          accessibilityRole="button"
        >
          <Text style={{ fontSize: size, opacity: n <= value ? 1 : 0.25 }}>🌮</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
})
