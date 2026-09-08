import { View } from 'react-native'
import Svg, { Circle, G, Path, Rect } from 'react-native-svg'
import TacoGlyph from '../../../assets/taco-glyph.svg'
import { colors, radius } from '../../utils/theme'

// Three small scenes for the quick-start guide. Drawn rather than iconified
// so the steps read as one illustrated set: same 96×72 stage, same stroke
// weight, amber reserved for the thing the user actually touches.

const W = 96
const H = 72
const STROKE = 2

interface ArtProps {
  size?: number
}

function stage(size: number) {
  return { width: size, height: (size * H) / W, viewBox: `0 0 ${W} ${H}` }
}

/** Step 1 — a map with one glowing "add" button. */
export function ArtDropPin({ size = 96 }: ArtProps) {
  return (
    <Svg {...stage(size)}>
      {/* map plate */}
      <Rect x={6} y={8} width={84} height={56} rx={8}
        fill={colors.surfaceRaised} stroke={colors.surfaceBorder} strokeWidth={STROKE} />
      {/* roads */}
      <Path d="M6 30 H90" stroke={colors.surfaceBorder} strokeWidth={STROKE} />
      <Path d="M38 8 V64" stroke={colors.surfaceBorder} strokeWidth={STROKE} />
      <Path d="M62 8 V64" stroke={colors.surfaceBorder} strokeWidth={STROKE} />
      {/* the tap target */}
      <Circle cx={62} cy={30} r={16} fill={colors.amberSubtle} />
      <Circle cx={62} cy={30} r={11} fill={colors.amber} />
      <Path d="M62 24.5 V35.5 M56.5 30 H67.5"
        stroke={colors.bg} strokeWidth={2.6} strokeLinecap="round" />
      {/* tap ripple */}
      <Circle cx={62} cy={30} r={21} fill="none"
        stroke={colors.amberDim} strokeWidth={1.5} opacity={0.7} />
    </Svg>
  )
}

/**
 * Step 2 — the rating control itself, three of five earned.
 *
 * Uses the brand glyph at the same opacity ramp as TacoRating rather than a
 * drawn stand-in, so the guide shows the control the user is about to tap.
 */
export function ArtRate({ size = 96 }: ArtProps) {
  const glyph = size * 0.15
  return (
    // Same inset plate as the two map scenes (6/8 margins on the 96×72 stage)
    // so all three steps sit on an identically sized surface.
    <View style={{ width: size, height: (size * H) / W, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * (84 / W),
          height: ((size * H) / W) * (56 / H),
          borderRadius: radius.sm,
          backgroundColor: colors.surfaceRaised,
          borderWidth: STROKE / 2,
          borderColor: colors.surfaceBorder,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: size * 0.025,
        }}
      >
        {[1, 2, 3, 4, 5].map(n => (
          <View key={n} style={{ opacity: n <= 3 ? 1 : 0.22 }}>
            <TacoGlyph width={glyph} height={glyph} />
          </View>
        ))}
      </View>
    </View>
  )
}

/** Step 3 — the atlas filling in: pins scattered, one still landing. */
export function ArtAtlas({ size = 96 }: ArtProps) {
  const pins: [number, number][] = [[22, 26], [46, 18], [70, 30], [34, 46], [62, 50]]
  return (
    <Svg {...stage(size)}>
      <Rect x={6} y={8} width={84} height={56} rx={8}
        fill={colors.surfaceRaised} stroke={colors.surfaceBorder} strokeWidth={STROKE} />
      <Path d="M6 44 Q30 34 52 42 T90 36"
        stroke={colors.surfaceBorder} strokeWidth={STROKE} fill="none" />
      {pins.map(([x, y], i) => (
        <G key={`${x}-${y}`}>
          <Path
            d={`M${x} ${y + 11} C${x - 7} ${y + 3} ${x - 6} ${y - 6} ${x} ${y - 6} C${x + 6} ${y - 6} ${x + 7} ${y + 3} ${x} ${y + 11} Z`}
            fill={i === 1 ? colors.green : colors.amber}
          />
          <Circle cx={x} cy={y - 1} r={2.4} fill={colors.bg} />
        </G>
      ))}
    </Svg>
  )
}
