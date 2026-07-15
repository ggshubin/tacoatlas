import { View, StyleSheet } from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import TacoGlyph from '../../assets/taco-glyph.svg'
import { colors } from '../utils/theme'

interface Props {
  /** Overall rendered height in px. Width scales proportionally. */
  size?: number
}

// Teardrop marker reserved for the user's own spots — friend and community
// locations use SpotDot instead, so the personal atlas always reads loudest.
// The inset disc carries the brand taco glyph (assets/taco-glyph.svg).
export function TacoPin({ size = 44 }: Props) {
  const width = (size * 40) / 48
  const glyphSize = size * 0.42
  const discCenterY = size * (19 / 48)

  return (
    <View style={{ width, height: size }}>
      <Svg width={width} height={size} viewBox="0 0 40 48">
        {/* Teardrop body */}
        <Path
          d="M20 2 C10.6 2 3 9.6 3 19 C3 30.5 17 43.5 19.2 45.5 C19.65 45.9 20.35 45.9 20.8 45.5 C23 43.5 37 30.5 37 19 C37 9.6 29.4 2 20 2 Z"
          fill={colors.amber}
          stroke={colors.bg}
          strokeWidth={1.5}
        />
        <Circle cx={20} cy={19} r={11.5} fill={colors.bg} />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.glyphWrap]} pointerEvents="none">
        <TacoGlyph
          width={glyphSize}
          height={glyphSize}
          style={{ marginTop: discCenterY - glyphSize / 2 }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  glyphWrap: { alignItems: 'center' },
})
