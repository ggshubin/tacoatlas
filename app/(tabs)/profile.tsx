import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../../src/utils/theme'

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Profile — coming soon</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: colors.creamMuted, fontSize: 16 },
})
