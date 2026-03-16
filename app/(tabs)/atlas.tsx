import { View, Text, StyleSheet } from 'react-native'
import { colors, spacing, typography } from '../../src/utils/theme'

export default function AtlasScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>My Atlas</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: typography.fontSizeLg, color: colors.brown },
})
