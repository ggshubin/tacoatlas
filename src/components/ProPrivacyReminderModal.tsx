import React from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'

interface Props {
  visible: boolean
  spotCount: number
  onMakeAllPublic: () => void
  onChoosePerSpot: () => void
  onKeepPrivate: () => void
}

export function ProPrivacyReminderModal({ visible, spotCount, onMakeAllPublic, onChoosePerSpot, onKeepPrivate }: Props) {
  // Early return is load-bearing: the Jest RN Modal mock renders children
  // even when visible=false, and it spares the native modal mount entirely.
  if (!visible) return null

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeepPrivate}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Ionicons name="sparkles" size={28} color={colors.amber} style={styles.sparkle} />
          <Text style={styles.title}>You're Pro!</Text>
          <Text style={styles.message} testID="reminder-message">
            You have {spotCount} spot{spotCount !== 1 ? 's' : ''} saved just for you. Want to share {spotCount !== 1 ? 'them' : 'it'}?
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onMakeAllPublic} testID="reminder-make-public">
            <Text style={styles.primaryBtnText}>Make All Public</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onChoosePerSpot} testID="reminder-per-spot">
            <Text style={styles.secondaryBtnText}>I'll Choose Per Spot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tertiaryBtn} onPress={onKeepPrivate} testID="reminder-keep-private">
            <Text style={styles.tertiaryBtnText}>Keep Private</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.surfaceBorder, padding: spacing.lg, alignItems: 'center',
  },
  sparkle: { marginBottom: spacing.sm },
  title: { color: colors.cream, fontSize: 20, fontWeight: '800', marginBottom: spacing.xs },
  message: { color: colors.creamMuted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: spacing.lg },
  primaryBtn: {
    backgroundColor: colors.amber, borderRadius: radius.md, paddingVertical: 12,
    alignItems: 'center', alignSelf: 'stretch', marginBottom: spacing.sm,
  },
  primaryBtnText: { color: colors.cream, fontWeight: '800', fontSize: 14 },
  secondaryBtn: {
    borderWidth: 1, borderColor: colors.amber, borderRadius: radius.md, paddingVertical: 12,
    alignItems: 'center', alignSelf: 'stretch', marginBottom: spacing.sm,
  },
  secondaryBtnText: { color: colors.amber, fontWeight: '700', fontSize: 14 },
  tertiaryBtn: { paddingVertical: 10, alignItems: 'center', alignSelf: 'stretch' },
  tertiaryBtnText: { color: colors.creamMuted, fontWeight: '600', fontSize: 13 },
})
