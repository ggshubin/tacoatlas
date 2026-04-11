import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, spacing, radius } from '../utils/theme'

interface ConfirmModalProps {
  visible: boolean
  title: string
  body: string | React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  visible,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {typeof body === 'string'
            ? <Text style={styles.body}>{body}</Text>
            : <View style={styles.bodyWrap}>{body}</View>
          }
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, destructive && styles.confirmBtnDestructive]}
              onPress={onConfirm}
            >
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.cream,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 14,
    color: colors.creamMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  bodyWrap: {
    marginBottom: spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
  },
  cancelText: {
    color: colors.cream,
    fontWeight: '600',
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: colors.amber,
    alignItems: 'center',
  },
  confirmBtnDestructive: {
    backgroundColor: colors.error,
  },
  confirmText: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 14,
  },
})
