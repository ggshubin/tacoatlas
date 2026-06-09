import { useState, useEffect } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'
import { proService } from '../services/proService'
import { useProStore } from '../store/proStore'
import { useAuthStore } from '../store/authStore'
import { syncService } from '../services/syncService'

interface Props {
  visible: boolean
  onClose: () => void
}

export function ProPaywallModal({ visible, onClose }: Props) {
  const { setPro } = useProStore()
  const session = useAuthStore(s => s.session)
  const [purchasing, setPurchasing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [priceString, setPriceString] = useState<string | null>(null)

  useEffect(() => {
    proService.getProPackage().then(pkg => {
      if (pkg) setPriceString(pkg.product.priceString)
    })
  }, [])

  function triggerMigration() {
    if (session) {
      syncService.bulkSyncOnProUpgrade(session.user.id)
    }
  }

  async function handleUpgrade() {
    setPurchasing(true)
    try {
      const pkg = await proService.getProPackage()
      if (!pkg) {
        setErrorMsg('Could not load purchase options. Try again later.')
        return
      }
      const success = await proService.purchase(pkg)
      if (success) {
        setPro(true)
        triggerMigration()
        onClose()
      }
    } catch {
      setErrorMsg('Purchase failed. Please try again.')
    } finally {
      setPurchasing(false)
    }
  }

  async function handleRestore() {
    setPurchasing(true)
    try {
      const success = await proService.restore()
      if (success) {
        setPro(true)
        triggerMigration()
        onClose()
      } else {
        setErrorMsg('No previous TacoAtlas Pro purchase found on this account.')
      }
    } finally {
      setPurchasing(false)
    }
  }

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
          {errorMsg && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade} disabled={purchasing}>
            {purchasing ? (
              <ActivityIndicator color={colors.cream} />
            ) : (
              <Text style={styles.upgradeBtnText}>Upgrade{priceString ? ` for ${priceString}` : ''}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={purchasing}>
            <Text style={styles.cancelBtnText}>Maybe later</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={purchasing}>
            <Text style={styles.restoreBtnText}>Restore purchase</Text>
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
  restoreBtn: { paddingVertical: spacing.xs },
  restoreBtnText: { color: colors.creamMuted, fontSize: 12, textDecorationLine: 'underline' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: '#3A1A1A', borderWidth: 1, borderColor: colors.error,
    borderRadius: radius.md, padding: spacing.sm,
    width: '100%', marginBottom: spacing.sm,
  },
  errorText: { flex: 1, color: colors.error, fontSize: 13 },
})
