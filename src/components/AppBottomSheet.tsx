import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'

export interface SheetOption {
  label: string
  icon?: keyof typeof Ionicons.glyphMap
  destructive?: boolean
  onPress: () => void
}

interface AppBottomSheetProps {
  visible: boolean
  title?: string
  options: SheetOption[]
  onClose: () => void
}

export function AppBottomSheet({ visible, title, options, onClose }: AppBottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.card}>
          {title && <Text style={styles.title}>{title}</Text>}
          {options.map((opt, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.option, i < options.length - 1 && styles.optionBorder]}
              onPress={() => { onClose(); opt.onPress() }}
            >
              {opt.icon && (
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={opt.destructive ? colors.error : colors.cream}
                />
              )}
              <Text style={[styles.optionText, opt.destructive && styles.optionTextDestructive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl + 8,
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.creamDim,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  optionText: {
    fontSize: 15,
    color: colors.cream,
    fontWeight: '500',
  },
  optionTextDestructive: {
    color: colors.error,
  },
  cancelBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: colors.creamMuted,
    fontWeight: '600',
  },
})
