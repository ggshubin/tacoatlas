import { View, StyleSheet } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { colors } from '../utils/theme'

interface Props {
  kind: 'friend' | 'public'
  /** Spot type from local or Supabase data; unknown values fall back to a generic marker. */
  spotType?: string | null
  /** Ring color for friend dots (the friend's identity color). */
  color?: string
  size?: number
}

type Glyph =
  | { family: 'ion'; name: keyof typeof Ionicons.glyphMap }
  | { family: 'mci'; name: keyof typeof MaterialCommunityIcons.glyphMap }

const GLYPHS: Record<string, Glyph> = {
  'Truck': { family: 'mci', name: 'truck-outline' },
  'Food Cart': { family: 'ion', name: 'cart-outline' },
  'Pop-up': { family: 'mci', name: 'tent' },
  'Restaurant': { family: 'ion', name: 'restaurant-outline' },
  'House': { family: 'ion', name: 'home-outline' },
  'Brick & Mortar': { family: 'ion', name: 'storefront-outline' },
}

const FALLBACK: Glyph = { family: 'ion', name: 'location-outline' }

function glyphFor(spotType?: string | null): Glyph {
  if (!spotType) return FALLBACK
  if (GLYPHS[spotType]) return GLYPHS[spotType]
  // Legacy/DB values like "taco_truck" — match loosely.
  const lower = spotType.toLowerCase()
  if (lower.includes('truck')) return GLYPHS['Truck']
  if (lower.includes('cart')) return GLYPHS['Food Cart']
  if (lower.includes('pop')) return GLYPHS['Pop-up']
  if (lower.includes('restaurant')) return GLYPHS['Restaurant']
  return FALLBACK
}

// Round locator for spots that are NOT the user's own: friends' spots carry
// the friend's color as a ring, community spots stay muted. The icon says
// what kind of place it is (truck, pop-up, restaurant, ...).
export function SpotDot({ kind, spotType, color, size = 28 }: Props) {
  const glyph = glyphFor(spotType)
  const iconSize = Math.round(size * 0.5)
  const ringColor = kind === 'friend' ? (color ?? colors.amber) : colors.amberDim
  const iconColor = kind === 'friend' ? colors.cream : colors.creamMuted

  const IconComponent = glyph.family === 'ion' ? Ionicons : MaterialCommunityIcons

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: ringColor,
          borderWidth: kind === 'friend' ? 2 : 1.5,
          backgroundColor: kind === 'friend' ? colors.surface : colors.surfaceRaised,
        },
      ]}
    >
      <IconComponent name={glyph.name as never} size={iconSize} color={iconColor} />
    </View>
  )
}

const styles = StyleSheet.create({
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },
})
