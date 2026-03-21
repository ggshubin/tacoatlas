import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import type { FoodCategory } from '../store/reviewFormStore'
import { colors, spacing, radius } from '../utils/theme'
import { useProStore } from '../store/proStore'

// Icon representations — will use SVG assets when available
// For now using emoji fallback since SVG assets are pending
const ICONS: Record<FoodCategory, { emoji: string; proOnly?: boolean }> = {
  tacos:    { emoji: '🌮' },
  burritos: { emoji: '🌯', proOnly: true },
  tortas:   { emoji: '🥪', proOnly: true },
  salsas:   { emoji: '🌶️' },
}

const CATEGORIES: FoodCategory[] = ['tacos', 'burritos', 'tortas', 'salsas']

interface Props {
  active: FoodCategory
  litCategories: FoodCategory[]   // categories with at least one rated item
  onSelect: (cat: FoodCategory) => void
  onProGate: () => void           // called when a Pro-locked category is tapped by free user
}

export function FoodIconBar({ active, litCategories, onSelect, onProGate }: Props) {
  const { isPro } = useProStore()

  return (
    <View style={styles.bar}>
      {CATEGORIES.map(cat => {
        const cfg = ICONS[cat]
        const isLit = litCategories.includes(cat) || active === cat
        const isLocked = cfg.proOnly && !isPro
        const isActive = active === cat

        return (
          <TouchableOpacity
            key={cat}
            style={[styles.iconBtn, isActive && styles.iconBtnActive, !isLit && styles.iconBtnDim]}
            onPress={() => isLocked ? onProGate() : onSelect(cat)}
          >
            <Text style={[styles.iconEmoji, !isLit && styles.iconDim]}>{cfg.emoji}</Text>
            {isLocked && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>Pro</Text>
              </View>
            )}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    position: 'relative',
    flex: 1,
  },
  iconBtnActive: {
    backgroundColor: colors.amberSubtle,
    borderWidth: 1,
    borderColor: colors.amberDim,
  },
  iconBtnDim: {
    opacity: 0.4,
  },
  iconEmoji: { fontSize: 28 },
  iconDim: { opacity: 0.5 },
  proBadge: {
    position: 'absolute',
    top: 2, right: 2,
    backgroundColor: colors.amber,
    borderRadius: radius.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  proBadgeText: { fontSize: 8, fontWeight: '800', color: colors.bg },
})
