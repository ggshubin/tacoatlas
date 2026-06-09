import { TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../utils/theme'

interface BetaBannerProps {
  onPress: () => void
}

export function BetaBanner({ onPress }: BetaBannerProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]} testID="beta-banner">
      <TouchableOpacity style={styles.banner} onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.text} testID="beta-banner-text">
          🐛 Beta — tap to report a bug or suggest a feature
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#1A0F00',
  },
  banner: {
    backgroundColor: colors.amberDim,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.amber,
  },
  text: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
})
