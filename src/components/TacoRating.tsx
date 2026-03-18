import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../utils/theme'

interface Props {
  value: number
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: number
}

export function TacoRating({ value, onChange, readonly = false, size = 28 }: Props) {
  const tacos = [1, 2, 3, 4, 5]

  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {tacos.map((n) => (
        <TouchableOpacity
          key={n}
          onPress={() => !readonly && onChange?.(n)}
          disabled={readonly}
          accessibilityLabel={`${n} taco${n > 1 ? 's' : ''}`}
          accessibilityRole="button"
        >
          <Ionicons
            name="restaurant"
            size={size}
            color={n <= value ? colors.amber : colors.surfaceBorder}
          />
        </TouchableOpacity>
      ))}
    </View>
  )
}
