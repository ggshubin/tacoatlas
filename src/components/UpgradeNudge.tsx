import React from 'react'
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'

interface UpgradeNudgeProps {
  visible: boolean
  onDismiss: () => void
  onUpgrade: () => void
}

export function UpgradeNudge({ visible, onDismiss, onUpgrade }: UpgradeNudgeProps) {
  if (!visible) return null

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color={colors.amber} />
        <Text style={styles.message} testID="nudge-message">
          Unlock unlimited spots and see what your friends are eating
        </Text>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade} testID="nudge-upgrade-btn">
          <Text style={styles.upgradeBtnText}>Upgrade</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} testID="nudge-dismiss-btn">
          <Text style={styles.dismissBtnText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(36, 28, 22, 0.9)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.amberDim,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: colors.cream,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  upgradeBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: colors.amber,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  upgradeBtnText: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: '700',
  },
  dismissBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: 'rgba(61, 46, 34, 0.5)',
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  dismissBtnText: {
    color: colors.creamMuted,
    fontSize: 13,
    fontWeight: '500',
  },
})
