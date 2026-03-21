import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'

interface ScorecardItem {
  label: string
  rating: number
  notes: string | null
  heatLevel?: string | null
}

interface Props {
  presets?: string[]        // preset chip labels (tacos, burritos, tortas)
  freeform?: boolean        // true for salsas — shows text input instead of chips
  heatLevels?: string[]              // if provided, shows heat picker in freeform add form
  heatLevelIcons?: Record<string, string>  // emoji icons for each heat level
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
  presets, freeform, heatLevels, heatLevelIcons, items, onAdd, onRemove, onUpdate, renderHeatPicker,
}: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')
  const [pendingRating, setPendingRating] = useState(0)
  const [pendingNotes, setPendingNotes] = useState('')
  const [pendingHeatLevel, setPendingHeatLevel] = useState<string | null>(null)
  const [showFreeform, setShowFreeform] = useState(false)

  const addedLabels = new Set(items.filter(i => i?.label).map(i => i.label.toLowerCase()))

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
    onAdd({ label: pendingLabel.trim(), rating: pendingRating, notes: pendingNotes.trim() || null, heatLevel: pendingHeatLevel })
    setPendingLabel('')
    setPendingRating(0)
    setPendingNotes('')
    setPendingHeatLevel(null)
    setShowFreeform(false)
  }

  return (
    <View>
      {items.map((item, idx) => {
        const isExpanded = expandedIndex === idx
        return (
          <View key={idx} style={[styles.itemWrapper, isExpanded && styles.itemWrapperExpanded]}>
            <TouchableOpacity
              style={[styles.ratedChip, isExpanded && styles.ratedChipExpanded]}
              onPress={() => setExpandedIndex(isExpanded ? null : idx)}
            >
              <Text style={styles.ratedChipLabel}>{item.label}</Text>
              <StarRating value={item.rating} readonly size={14} />
              <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.creamDim} style={{ marginLeft: 2 }} />
              <TouchableOpacity onPress={() => { onRemove(idx); setExpandedIndex(null) }}>
                <Ionicons name="close-circle" size={18} color={colors.creamDim} />
              </TouchableOpacity>
            </TouchableOpacity>
            {isExpanded && (
              <View style={styles.expanded}>
                <Text style={styles.expandedLabel}>Rate your {item.label}</Text>
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
        )
      })}

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
          {(!showFreeform && items.length > 0) ? (
            <TouchableOpacity style={styles.addAnotherBtn} onPress={() => setShowFreeform(true)}>
              <Ionicons name="add-circle-outline" size={16} color={colors.amber} />
              <Text style={styles.addAnotherBtnText}>Add another salsa</Text>
            </TouchableOpacity>
          ) : (showFreeform || items.length === 0) && (
            <>
              <TextInput
                style={styles.freeformInput}
                placeholder="Salsa name (e.g. Salsa Verde)"
                placeholderTextColor={colors.creamDim}
                value={pendingLabel}
                onChangeText={setPendingLabel}
              />
              <View style={styles.freeformCard}>
                <Text style={styles.freeformCardLabel}>Flavor Rating</Text>
                <StarRating value={pendingRating} onChange={setPendingRating} />
                {heatLevels && (
                  <>
                    <Text style={[styles.freeformCardLabel, { marginTop: spacing.sm }]}>Heat Level</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {heatLevels.map(h => (
                        <TouchableOpacity
                          key={h}
                          style={[styles.heatChip, pendingHeatLevel === h && styles.heatChipActive]}
                          onPress={() => setPendingHeatLevel(pendingHeatLevel === h ? null : h)}
                        >
                          {heatLevelIcons?.[h] && (
                            <Text style={styles.heatChipIcon}>{heatLevelIcons[h]}</Text>
                          )}
                          <Text style={[styles.heatChipText, pendingHeatLevel === h && styles.heatChipTextActive]}>{h}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
                <TextInput
                  style={[styles.noteInput, { marginTop: spacing.sm }]}
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
            </>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  itemWrapper: {
    borderRadius: radius.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceRaised, overflow: 'hidden',
  },
  itemWrapperExpanded: { borderColor: colors.amberDim },
  ratedChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  ratedChipExpanded: { borderBottomWidth: 1, borderBottomColor: colors.amberDim },
  ratedChipLabel: { flex: 1, color: colors.cream, fontSize: 14, fontWeight: '600' },
  expandedLabel: {
    fontSize: 11, fontWeight: '700', color: colors.amber,
    letterSpacing: 1, marginBottom: spacing.sm,
  },
  expanded: {
    backgroundColor: colors.amberSubtle,
    padding: spacing.md,
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
  freeformCard: {
    backgroundColor: colors.surfaceRaised, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    padding: spacing.md, marginTop: spacing.sm,
  },
  freeformCardLabel: {
    fontSize: 11, fontWeight: '700', color: colors.creamMuted,
    letterSpacing: 0.5, marginBottom: spacing.sm,
  },
  heatChip: {
    alignItems: 'center', gap: 2,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  heatChipActive: { borderColor: colors.amber, backgroundColor: colors.amberSubtle },
  heatChipIcon: { fontSize: 16 },
  heatChipText: { color: colors.creamMuted, fontSize: 10, fontWeight: '600' },
  heatChipTextActive: { color: colors.amber },
  addAnotherBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.amberDim,
    backgroundColor: colors.amberSubtle,
  },
  addAnotherBtnText: { color: colors.amber, fontSize: 14, fontWeight: '600' },
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
