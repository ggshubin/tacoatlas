import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'

interface Props {
  visible: boolean
  onClose: () => void
}

export function ProPaywallModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Image
            source={require('../../assets/taco-icon.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <Text style={styles.title}>You've hit 15 spots</Text>
          <Text style={styles.subtitle}>
            Upgrade to TacoAtlas Pro for unlimited spots, cloud backup, map view, and more.
          </Text>
          <View style={styles.featureList}>
            {[
              'Unlimited spots',
              'Cloud sync + backup',
              'Social atlas & public profile',
              'Statistics dashboard',
              'Home screen widget',
            ].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.amber} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.upgradeBtn} onPress={onClose}>
            <Text style={styles.upgradeBtnText}>Upgrade for $3.99</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  icon: { width: 64, height: 64, marginBottom: spacing.md },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.cream,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.creamMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  featureList: { width: '100%', marginBottom: spacing.xl },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  featureText: { color: colors.cream, fontSize: 14 },
  upgradeBtn: {
    backgroundColor: colors.amber,
    borderRadius: radius.full,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  upgradeBtnText: { color: colors.cream, fontWeight: '700', fontSize: 16 },
  cancelBtn: { paddingVertical: spacing.sm },
  cancelBtnText: { color: colors.creamMuted, fontSize: 14 },
})
