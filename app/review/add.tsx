import { useState, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useReviewFormStore, FoodCategory } from '../../src/store/reviewFormStore'
import { localStorageService } from '../../src/services/localStorage'
import { LocationPicker } from '../../src/components/LocationPicker'
import { FoodIconBar } from '../../src/components/FoodIconBar'
import { ChipScorecard } from '../../src/components/ChipScorecard'
import { colors, spacing, radius } from '../../src/utils/theme'
import type { SpotType, PrivacySetting, HeatLevel } from '../../src/types/app'

const SPOT_TYPES: SpotType[] = ['Truck', 'Food Cart', 'Street Tent', 'House', 'Brick & Mortar', 'Restaurant']

const PRIVACY_OPTIONS: { value: PrivacySetting; label: string; icon: string }[] = [
  { value: 'public', label: 'Public', icon: '🌎' },
  { value: 'friends', label: 'Mi Gente', icon: '👥' },
  { value: 'private', label: 'Just Me', icon: '🔒' },
]

const TACO_TYPES = ['Al Pastor', 'Carne Asada', 'Carnitas', 'Birria', 'Pollo', 'Fish', 'Shrimp', 'Lengua', 'Cabeza', 'Chorizo', 'Veggie', 'Other']
const BURRITO_TYPES = ['California', 'Birria', 'Carne Asada', 'Pollo', 'Chorizo', 'Bean & Cheese', 'Wet', 'Other']
const TORTA_TYPES = ['Milanesa', 'Cubana', 'Pierna', 'Al Pastor', 'Chorizo', 'Other']
const CONDIMENTS = ['Guacamole', 'Queso', 'Crema', 'Onions', 'Cilantro', 'Radishes', 'Jalapeños', 'Lime', 'Pico de Gallo']
const HEAT_LEVELS: HeatLevel[] = ['mild', 'medium', 'hot', 'fire', 'volcano']

const STEP_NAMES = ['The Spot', "What'd You Have?", 'Your Verdict']

export default function ReviewWizard() {
  const store = useReviewFormStore()
  const [showSpotNote, setShowSpotNote] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const litCategories: FoodCategory[] = []
  if (store.tacoEntries.length > 0) litCategories.push('tacos')
  if (store.burritoEntries.length > 0) litCategories.push('burritos')
  if (store.tortaEntries.length > 0) litCategories.push('tortas')
  if (store.salsaEntries.length > 0) litCategories.push('salsas')

  function handleClose() {
    Alert.alert('Ditch this visit?', 'Your progress will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Ditch it', style: 'destructive', onPress: () => { store.reset(); router.back() } },
    ])
  }

  function handleProGate() {
    Alert.alert('Pro Feature', 'Upgrade to TacoAtlas Pro to rate burritos and tortas!')
  }

  async function handleSubmit() {
    if (!store.vendorName.trim()) {
      Alert.alert('Missing name', 'Give this spot a name.')
      return
    }
    setSubmitting(true)
    try {
      let vendorLocalId = store.editingVendorLocalId

      if (!vendorLocalId) {
        // New vendor
        const vendor = await localStorageService.addVendor({
          name: store.vendorName.trim(),
          spotType: store.spotType,
          lat: store.lat ?? 0,
          lng: store.lng ?? 0,
          address: store.address,
          cityName: store.cityName,
          hours: null,
          photoUri: null,
          privacy: store.privacy,
          spotNote: store.spotNote.trim() || null,
          isVisited: true,
        })
        vendorLocalId = vendor.localId
      } else {
        // Updating existing — update spotNote/privacy if changed
        await localStorageService.updateVendor(vendorLocalId, {
          spotNote: store.spotNote.trim() || null,
          privacy: store.privacy,
          isVisited: true,
        })
      }

      await localStorageService.addReview({
        vendorLocalId,
        overallRating: store.overallRating,
        returnIntent: store.returnIntent,
        notes: store.notes.trim() || null,
        photoUris: store.photoUris,
        tacoEntries: store.tacoEntries.map(e => ({ tacoType: e.tacoType || '', rating: e.rating, notes: e.notes })),
        salsaEntries: store.salsaEntries,
        condiments: store.condiments,
        burritoEntries: store.burritoEntries,
        tortaEntries: store.tortaEntries,
      })

      store.reset()
      router.back()
    } catch (e) {
      Alert.alert('Error', 'Could not save your review. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
          <Ionicons name="close" size={20} color={colors.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log a Visit</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Step indicator */}
      <View style={styles.stepRow}>
        {STEP_NAMES.map((label, i) => {
          const step = i + 1
          const isActive = store.currentStep === step
          return (
            <View key={step} style={styles.stepItem}>
              <View style={[styles.stepDot, isActive && styles.stepDotActive]} />
              <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{label}</Text>
            </View>
          )
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* === STEP 1: The Spot === */}
        {store.currentStep === 1 && (
          <View>
            <TextInput
              style={styles.nameInput}
              placeholder="Taco spot name"
              placeholderTextColor={colors.creamDim}
              value={store.vendorName}
              onChangeText={v => store.setField('vendorName', v)}
              autoFocus
            />

            <Text style={styles.fieldLabel}>Type of Spot</Text>
            <View style={styles.chipGrid}>
              {SPOT_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, store.spotType === t && styles.chipActive]}
                  onPress={() => store.setField('spotType', store.spotType === t ? null : t)}
                >
                  <Text style={[styles.chipText, store.spotType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Location</Text>
            <LocationPicker
              value={store.lat !== null ? { lat: store.lat, lng: store.lng ?? 0, address: store.address, cityName: store.cityName } : null}
              onChange={loc => {
                store.setField('lat', loc?.lat ?? null)
                store.setField('lng', loc?.lng ?? null)
                store.setField('address', loc?.address ?? null)
                store.setField('cityName', loc?.cityName ?? null)
              }}
            />

            <Text style={styles.fieldLabel}>Who can see this?</Text>
            <View style={styles.privacyRow}>
              {PRIVACY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.privacyBtn, store.privacy === opt.value && styles.privacyBtnActive]}
                  onPress={() => store.setField('privacy', opt.value)}
                >
                  <Text style={styles.privacyIcon}>{opt.icon}</Text>
                  <Text style={[styles.privacyLabel, store.privacy === opt.value && styles.privacyLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.noteToggle}
              onPress={() => setShowSpotNote(s => !s)}
            >
              <Ionicons name={showSpotNote ? 'chevron-down' : 'chevron-forward'} size={14} color={colors.creamMuted} />
              <Text style={styles.noteToggleText}>About this spot</Text>
            </TouchableOpacity>
            {showSpotNote && (
              <TextInput
                style={styles.noteInput}
                placeholder="Cash only, opens at 3pm..."
                placeholderTextColor={colors.creamDim}
                value={store.spotNote}
                onChangeText={v => store.setField('spotNote', v)}
                multiline
                numberOfLines={3}
              />
            )}
          </View>
        )}

        {/* === STEP 2: What'd You Have? === */}
        {store.currentStep === 2 && (
          <View>
            <FoodIconBar
              active={store.activeCategory}
              litCategories={litCategories}
              onSelect={store.setActiveCategory}
              onProGate={handleProGate}
            />

            {store.activeCategory === 'tacos' && (
              <ChipScorecard
                presets={TACO_TYPES}
                items={store.tacoEntries.map(e => ({ label: e.tacoType, rating: e.rating, notes: e.notes }))}
                onAdd={item => store.addTacoEntry({ tacoType: item.label, rating: item.rating, notes: item.notes })}
                onRemove={store.removeTacoEntry}
                onUpdate={(idx, updates) => store.updateTacoEntry(idx, {
                  tacoType: updates.label !== undefined ? updates.label : undefined,
                  rating: updates.rating,
                  notes: updates.notes,
                })}
              />
            )}

            {store.activeCategory === 'burritos' && (
              <ChipScorecard
                presets={BURRITO_TYPES}
                items={store.burritoEntries.map(e => ({ label: e.burritoType, rating: e.rating, notes: e.notes }))}
                onAdd={item => store.addBurritoEntry({ burritoType: item.label, rating: item.rating, notes: item.notes })}
                onRemove={store.removeBurritoEntry}
                onUpdate={(idx, updates) => {
                  const current = store.burritoEntries[idx]
                  store.removeBurritoEntry(idx)
                  store.addBurritoEntry({
                    burritoType: updates.label ?? current.burritoType,
                    rating: updates.rating ?? current.rating,
                    notes: updates.notes !== undefined ? updates.notes : current.notes,
                  })
                }}
              />
            )}

            {store.activeCategory === 'tortas' && (
              <ChipScorecard
                presets={TORTA_TYPES}
                items={store.tortaEntries.map(e => ({ label: e.tortaType, rating: e.rating, notes: e.notes }))}
                onAdd={item => store.addTortaEntry({ tortaType: item.label, rating: item.rating, notes: item.notes })}
                onRemove={store.removeTortaEntry}
                onUpdate={(idx, updates) => {
                  const current = store.tortaEntries[idx]
                  store.removeTortaEntry(idx)
                  store.addTortaEntry({
                    tortaType: updates.label ?? current.tortaType,
                    rating: updates.rating ?? current.rating,
                    notes: updates.notes !== undefined ? updates.notes : current.notes,
                  })
                }}
              />
            )}

            {store.activeCategory === 'salsas' && (
              <ChipScorecard
                freeform
                items={store.salsaEntries.map(e => ({ label: e.salsaName, rating: e.flavorRating, notes: e.notes ?? null }))}
                onAdd={item => store.addSalsaEntry({ salsaName: item.label, flavorRating: item.rating, heatLevel: null, notes: item.notes })}
                onRemove={store.removeSalsaEntry}
                onUpdate={(idx, updates) => {
                  // Reconstruct salsa entry on update
                  const entries = [...store.salsaEntries]
                  if (updates.rating !== undefined) entries[idx] = { ...entries[idx], flavorRating: updates.rating }
                  if (updates.notes !== undefined) entries[idx] = { ...entries[idx], notes: updates.notes }
                  store.setField('salsaEntries', entries)
                }}
                renderHeatPicker={(item, idx) => (
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: spacing.sm, flexWrap: 'wrap' }}>
                    {HEAT_LEVELS.map(h => (
                      <TouchableOpacity
                        key={h}
                        style={{
                          paddingHorizontal: 8, paddingVertical: 4,
                          borderRadius: radius.full, borderWidth: 1,
                          borderColor: store.salsaEntries[idx]?.heatLevel === h ? colors.amber : colors.surfaceBorder,
                          backgroundColor: store.salsaEntries[idx]?.heatLevel === h ? colors.amberSubtle : colors.surface,
                        }}
                        onPress={() => {
                          const entries = [...store.salsaEntries]
                          entries[idx] = { ...entries[idx], heatLevel: h }
                          store.setField('salsaEntries', entries)
                        }}
                      >
                        <Text style={{ fontSize: 11, color: store.salsaEntries[idx]?.heatLevel === h ? colors.amber : colors.creamMuted }}>
                          {h}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
            )}

            <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Also available</Text>
            <View style={styles.chipGrid}>
              {CONDIMENTS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, store.condiments.includes(c) && styles.chipActive]}
                  onPress={() => store.toggleCondiment(c)}
                >
                  <Text style={[styles.chipText, store.condiments.includes(c) && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* === STEP 3: Your Verdict === */}
        {store.currentStep === 3 && (
          <View>
            <Text style={styles.fieldLabel}>Overall Rating</Text>
            <View style={{ flexDirection: 'row', gap: 4, marginBottom: spacing.md }}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => store.setField('overallRating', n)}>
                  <Text style={{ fontSize: 32, color: n <= store.overallRating ? colors.amber : colors.creamDim }}>★</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Would you come back?</Text>
            <View style={styles.intentRow}>
              {(['yes', 'maybe', 'no'] as const).map(intent => {
                const label = intent === 'yes' ? 'Hell yes 🤙' : intent === 'maybe' ? 'Maybe' : 'Nah'
                return (
                  <TouchableOpacity
                    key={intent}
                    style={[styles.intentBtn, store.returnIntent === intent && styles.intentBtnActive]}
                    onPress={() => store.setField('returnIntent', intent)}
                  >
                    <Text style={[styles.intentText, store.returnIntent === intent && styles.intentTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Anything else worth remembering..."
              placeholderTextColor={colors.creamDim}
              value={store.notes}
              onChangeText={v => store.setField('notes', v)}
              multiline
              numberOfLines={4}
            />
          </View>
        )}

      </ScrollView>

      {/* Footer nav */}
      <View style={styles.footer}>
        {store.currentStep > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={store.prevStep}>
            <Ionicons name="chevron-back" size={18} color={colors.creamMuted} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {store.currentStep < 3 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={store.nextStep}>
            <Text style={styles.nextBtnText}>Next</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.cream} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
            {submitting
              ? <ActivityIndicator color={colors.cream} />
              : <Text style={styles.submitBtnText}>Save Visit</Text>}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.cream },
  stepRow: {
    flexDirection: 'row', justifyContent: 'center', gap: spacing.lg,
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
  },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceBorder },
  stepDotActive: { backgroundColor: colors.amber },
  stepLabel: { fontSize: 10, color: colors.creamDim, fontWeight: '500' },
  stepLabelActive: { color: colors.amber, fontWeight: '700' },
  scroll: { paddingHorizontal: spacing.md, paddingBottom: 120 },
  nameInput: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, fontSize: 18, fontWeight: '700', color: colors.cream,
    borderWidth: 1, borderColor: colors.surfaceBorder, marginBottom: spacing.md,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.creamMuted, marginBottom: spacing.sm, marginTop: spacing.sm },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceRaised,
  },
  chipActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  chipText: { color: colors.creamMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.cream },
  privacyRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  privacyBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 4,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceRaised,
  },
  privacyBtnActive: { borderColor: colors.amber, backgroundColor: colors.amberSubtle },
  privacyIcon: { fontSize: 18, marginBottom: 4 },
  privacyLabel: { fontSize: 11, color: colors.creamMuted, fontWeight: '600' },
  privacyLabelActive: { color: colors.amber },
  noteToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  noteToggleText: { color: colors.creamMuted, fontSize: 13 },
  noteInput: {
    backgroundColor: colors.surfaceRaised, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    padding: spacing.md, color: colors.cream, fontSize: 14,
    textAlignVertical: 'top', minHeight: 80, marginBottom: spacing.md,
  },
  intentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  intentBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceRaised,
  },
  intentBtnActive: { borderColor: colors.amber, backgroundColor: colors.amberSubtle },
  intentText: { fontSize: 13, color: colors.creamMuted, fontWeight: '600' },
  intentTextActive: { color: colors.amber },
  footer: {
    flexDirection: 'row', alignItems: 'center',
    padding: spacing.md, paddingBottom: 36,
    borderTopWidth: 1, borderTopColor: colors.surfaceBorder,
    backgroundColor: colors.bg,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  backBtnText: { color: colors.creamMuted, fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.amber, borderRadius: radius.full,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 4,
  },
  nextBtnText: { color: colors.cream, fontWeight: '700', fontSize: 15 },
  submitBtn: {
    backgroundColor: colors.amber, borderRadius: radius.full,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm + 4,
  },
  submitBtnText: { color: colors.cream, fontWeight: '700', fontSize: 15 },
})
