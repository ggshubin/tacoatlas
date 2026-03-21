import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'

interface Props {
  visible: boolean
  onClose: () => void
  onLogVisit: () => void
  onDropPin: () => void
}

export function QuickActionSheet({ visible, onClose, onLogVisit, onDropPin }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <TouchableOpacity style={styles.option} onPress={() => { onClose(); onLogVisit() }}>
          <View style={styles.optionIcon}>
            <Ionicons name="restaurant" size={22} color={colors.amber} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Log a Visit</Text>
            <Text style={styles.optionSubtitle}>Rate tacos, salsas, and more</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.creamDim} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={() => { onClose(); onDropPin() }}>
          <View style={styles.optionIcon}>
            <Ionicons name="location" size={22} color={colors.amber} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Drop a Pin</Text>
            <Text style={styles.optionSubtitle}>Save a spot for later</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.creamDim} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  optionIcon: {
    width: 44, height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.amberSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.amberDim,
  },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '700', color: colors.cream },
  optionSubtitle: { fontSize: 13, color: colors.creamMuted, marginTop: 2 },
  cancelBtn: {
    margin: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cancelText: { color: colors.creamMuted, fontWeight: '600', fontSize: 15 },
})
