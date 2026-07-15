import React from 'react'
import { View, TouchableOpacity } from 'react-native'
import TacoGlyph from '../../assets/taco-glyph.svg'

interface Props {
  value: number
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: number
}

// The brand taco glyph as the rating symbol — full color when earned,
// dimmed when not.
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
          <View style={{ opacity: n <= value ? 1 : 0.22 }}>
            <TacoGlyph width={size} height={size} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  )
}
