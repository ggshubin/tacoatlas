import { StyleSheet } from 'react-native'
import { colors, spacing, radius } from '../../utils/theme'

// Row styles shared by every Settings card (profile.tsx and extracted sections).
export const settingsStyles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.creamDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.surfaceBorder },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2 },
  accountRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder },
  accountRowText: { flex: 1 },
  accountLabel: { fontSize: 14, color: colors.cream },
  accountSub: { fontSize: 11, color: colors.creamMuted, marginTop: 2 },
})
