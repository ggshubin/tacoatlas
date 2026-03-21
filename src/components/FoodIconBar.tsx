import { View, TouchableOpacity, Text, StyleSheet } from 'react-native'
import type { FoodCategory } from '../store/reviewFormStore'
import { colors, spacing, radius } from '../utils/theme'
import { useProStore } from '../store/proStore'

// SVG icon assets — dk = active/lit variant, lt = inactive/dim variant
import TacoDk   from '../../assets/taco-dk.svg'
import TacoLt   from '../../assets/taco-lt.svg'
import BurritoDk from '../../assets/burrito-dk.svg'
import BurritoLt from '../../assets/burrito-lt.svg'
import TortaDk  from '../../assets/torta-dk.svg'
import TortaLt  from '../../assets/torta-lt.svg'
import SalsaDk  from '../../assets/salsa-dk.svg'
import SalsaLt  from '../../assets/salsa-lt.svg'

type IconPair = {
  Dk: React.FC<{ width?: number; height?: number }>
  Lt: React.FC<{ width?: number; height?: number }>
  proOnly?: boolean
}

const ICONS: Record<FoodCategory, IconPair> = {
  tacos:    { Dk: TacoDk,    Lt: TacoLt },
  burritos: { Dk: BurritoDk, Lt: BurritoLt, proOnly: true },
  tortas:   { Dk: TortaDk,   Lt: TortaLt,   proOnly: true },
  salsas:   { Dk: SalsaDk,   Lt: SalsaLt },
}

const CATEGORIES: FoodCategory[] = ['tacos', 'burritos', 'tortas', 'salsas']

const ICON_SIZE = 36

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
        const Icon = isLit ? cfg.Dk : cfg.Lt

        return (
          <TouchableOpacity
            key={cat}
            style={[styles.iconBtn, isActive && styles.iconBtnActive, !isLit && styles.iconBtnDim]}
            onPress={() => isLocked ? onProGate() : onSelect(cat)}
          >
            <Icon width={ICON_SIZE} height={ICON_SIZE} />
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
