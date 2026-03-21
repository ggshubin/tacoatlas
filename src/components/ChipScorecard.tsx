import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'

interface ScorecardItem {
  label: string
  rating: number
  notes: string | null
}

interface Props {
  presets?: string[]        // preset chip labels (tacos, burritos, tortas)
  freeform?: boolean        // true for salsas — shows text input instead of chips
  items: ScorecardItem[]
  onAdd: (item: ScorecardItem) => void
  onRemove: (index: number) => void
  onUpdate: (index: number, updates: Partial<ScorecardItem>) => void
  renderHeatPicker?: (item: ScorecardItem, index: number) => React.ReactNode
}

function StarRating({ value, onChange, readonly, size = 20 }: {
  value: number
  onChange?: (v: number) => void
  readonly?: boolean
  size?: number
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(n => (
        <TouchableOpacity
          key={n}
          onPress={() => !readonly && onChange?.(n)}
          disabled={readonly}
        >
          <Text style={{ fontSize: size, color: n <= value ? colors.amber : colors.creamDim }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

export function ChipScorecard({
  presets, freeform, items, onAdd, onRemove, onUpdate, renderHeatPicker,
}: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')
  const [pendingRating, setPendingRating] = useState(0)
  const [pendingNotes, setPendingNotes] = useState('')

  const addedLabels = new Set(items.map(i => i.label.toLowerCase()))

  function handlePresetTap(label: string) {
    if (addedLabels.has(label.toLowerCase())) {
      const idx = items.findIndex(i => i.label.toLowerCase() === label.toLowerCase())
      setExpandedIndex(idx === expandedIndex ? null : idx)
    } else {
      onAdd({ label, rating: 0, notes: null })
      setExpandedIndex(items.length)
    }
  }

  function handleFreeformAdd() {
    if (!pendingLabel.trim() || !pendingRating) return
    onAdd({ label: pendingLabel.trim(), rating: pendingRating, notes: pendingNotes.trim() || null })
    setPendingLabel('')
    setPendingRating(0)
    setPendingNotes('')
  }

  return (
    <View>
      {items.map((item, idx) => (
        <View key={idx}>
          <TouchableOpacity
            style={styles.ratedChip}
            onPress={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
          >
            <Text style={styles.ratedChipLabel}>{item.label}</Text>
            <StarRating value={item.rating} readonly size={14} />
            <TouchableOpacity onPress={() => { onRemove(idx); setExpandedIndex(null) }}>
              <Ionicons name="close-circle" size={18} color={colors.creamDim} />
            </TouchableOpacity>
          </TouchableOpacity>
          {expandedIndex === idx && (
            <View style={styles.expanded}>
              <StarRating value={item.rating} onChange={r => onUpdate(idx, { rating: r })} />
              {renderHeatPicker?.(item, idx)}
              <TextInput
                style={styles.noteInput}
                placeholder="Quick note..."
                placeholderTextColor={colors.creamDim}
                value={item.notes ?? ''}
                onChangeText={t => onUpdate(idx, { notes: t || null })}
              />
            </View>
          )}
        </View>
      ))}

      {presets && (
        <View style={styles.presetGrid}>
          {presets.map(label => {
            const isAdded = addedLabels.has(label.toLowerCase())
            return (
              <TouchableOpacity
                key={label}
                style={[styles.presetChip, isAdded && styles.presetChipAdded]}
                onPress={() => handlePresetTap(label)}
              >
                <Text style={[styles.presetChipText, isAdded && styles.presetChipTextAdded]}>
                  {label}
                </Text>
                {isAdded && <Ionicons name="checkmark" size={12} color={colors.amber} />}
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {freeform && (
        <View style={styles.freeformEntry}>
          <TextInput
            style={styles.freeformInput}
            placeholder="Salsa name (e.g. Salsa Verde)"
            placeholderTextColor={colors.creamDim}
            value={pendingLabel}
            onChangeText={setPendingLabel}
          />
          <StarRating value={pendingRating} onChange={setPendingRating} />
          <TextInput
            style={styles.noteInput}
            placeholder="Quick note..."
            placeholderTextColor={colors.creamDim}
            value={pendingNotes}
            onChangeText={setPendingNotes}
          />
          <TouchableOpacity
            style={[styles.addBtn, (!pendingLabel.trim() || !pendingRating) && styles.addBtnDisabled]}
            onPress={handleFreeformAdd}
            disabled={!pendingLabel.trim() || !pendingRating}
          >
            <Text style={styles.addBtnText}>Add Salsa</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  ratedChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.amberSubtle,
    borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.amberDim, marginBottom: spacing.sm,
  },
  ratedChipLabel: { flex: 1, color: colors.cream, fontSize: 14, fontWeight: '600' },
  expanded: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  presetChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceRaised,
  },
  presetChipAdded: { borderColor: colors.amber, backgroundColor: colors.amberSubtle },
  presetChipText: { color: colors.creamMuted, fontSize: 13, fontWeight: '600' },
  presetChipTextAdded: { color: colors.amber },
  freeformEntry: { marginTop: spacing.sm },
  freeformInput: {
    backgroundColor: colors.surfaceRaised, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    padding: spacing.md, color: colors.cream, fontSize: 14, marginBottom: spacing.sm,
  },
  noteInput: {
    backgroundColor: colors.surface, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    color: colors.creamMuted, fontSize: 13, marginTop: spacing.sm,
  },
  addBtn: {
    backgroundColor: colors.amber, borderRadius: radius.md,
    padding: spacing.sm + 2, alignItems: 'center', marginTop: spacing.sm,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: colors.cream, fontWeight: '700', fontSize: 14 },
})
