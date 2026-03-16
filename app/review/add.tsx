import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useReviewFormStore } from '../../src/store/reviewFormStore'
import { useAuthStore } from '../../src/store/authStore'
import { localStorageService } from '../../src/services/localStorage'
import { locationService } from '../../src/services/locationService'
import { TacoRating } from '../../src/components/TacoRating'
import { colors, spacing, typography, radius } from '../../src/utils/theme'

// Preset options
const TACO_TYPES = [
  'Al Pastor',
  'Carne Asada',
  'Birria',
  'Barbacoa',
  'Pollo',
  'Chorizo',
  'Carnitas',
  'Pescado',
  'Camarón',
  'Lengua',
  'Other',
]
const HEAT_LEVELS = ['mild', 'medium', 'hot', 'fire'] as const
const CONDIMENT_OPTIONS = [
  'Cilantro',
  'Onions',
  'Radishes',
  'Lime',
  'Crema',
  'Guacamole',
  'Pickled Jalapeños',
  'Pickled Onions',
  'Cucumber',
  'Pineapple',
]

export default function AddReviewModal() {
  const params = useLocalSearchParams<{ vendorId?: string; vendorName?: string }>()
  const store = useReviewFormStore()
  const { session } = useAuthStore()

  // Initialize from params if coming from vendor detail
  useState(() => {
    if (params.vendorName && !store.vendorName) {
      store.setField('vendorName', params.vendorName)
    }
  })

  async function handleGpsTag() {
    const coords = await locationService.getCurrentLocation()
    if (coords) {
      store.setField('lat', coords.lat)
      store.setField('lng', coords.lng)
      Alert.alert('Location tagged', `${coords.lat.toFixed(4)}, ${coords.lng?.toFixed(4)}`)
    }
  }

  async function handleSubmit() {
    if (!store.vendorName.trim()) {
      Alert.alert('Missing info', 'Enter the taco spot name.')
      return
    }
    if (store.lat === null || store.lng === null) {
      Alert.alert('Missing location', 'Tag the location before saving.')
      return
    }

    localStorageService.addVendor({
      name: store.vendorName.trim(),
      lat: store.lat,
      lng: store.lng,
      address: store.address,
      cityName: store.cityName,
      hours: null,
      photoUri: null,
    })

    const vendor = localStorageService.getVendors().slice(-1)[0]

    localStorageService.addReview({
      vendorLocalId: vendor.localId,
      overallRating: store.overallRating || 3,
      returnIntent: store.returnIntent,
      notes: store.notes || null,
      photoUris: store.photoUris,
      tacoEntries: store.tacoEntries,
      salsaEntries: store.salsaEntries,
      condiments: store.condiments,
    })

    store.reset()
    router.back()
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Step indicator */}
      <View style={styles.stepRow}>
        {[1, 2, 3, 4, 5].map(n => (
          <View
            key={n}
            style={[styles.stepDot, store.currentStep >= n && styles.stepDotActive]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Step 1: Vendor Info */}
        {store.currentStep === 1 && (
          <View>
            <Text style={styles.stepTitle}>The Spot</Text>
            <TextInput
              style={styles.input}
              placeholder="Taco spot name"
              placeholderTextColor={colors.gray300}
              value={store.vendorName}
              onChangeText={v => store.setField('vendorName', v)}
            />
            <TextInput
              style={styles.input}
              placeholder="City (optional)"
              placeholderTextColor={colors.gray300}
              value={store.cityName ?? ''}
              onChangeText={v => store.setField('cityName', v || null)}
            />
            <TouchableOpacity style={styles.gpsButton} onPress={handleGpsTag}>
              <Text style={styles.gpsButtonText}>
                {store.lat
                  ? `📍 ${store.lat.toFixed(4)}, ${store.lng?.toFixed(4)}`
                  : '📍 Tag Location'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Tacos */}
        {store.currentStep === 2 && (
          <View>
            <Text style={styles.stepTitle}>The Tacos</Text>
            {store.tacoEntries.map((entry, i) => (
              <View key={i} style={styles.entryRow}>
                <Text style={styles.entryLabel}>{entry.tacoType}</Text>
                <TacoRating value={entry.rating} readonly size={16} />
                <TouchableOpacity onPress={() => store.removeTacoEntry(i)}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <AddTacoEntry onAdd={entry => store.addTacoEntry(entry)} />
          </View>
        )}

        {/* Step 3: Salsas */}
        {store.currentStep === 3 && (
          <View>
            <Text style={styles.stepTitle}>The Salsas</Text>
            {store.salsaEntries.map((entry, i) => (
              <View key={i} style={styles.entryRow}>
                <Text style={styles.entryLabel}>{entry.salsaName}</Text>
                <TacoRating value={entry.flavorRating} readonly size={16} />
                <Text style={styles.heatLabel}>{entry.heatLevel ?? ''}</Text>
                <TouchableOpacity onPress={() => store.removeSalsaEntry(i)}>
                  <Text style={styles.removeBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <AddSalsaEntry onAdd={entry => store.addSalsaEntry(entry)} />
          </View>
        )}

        {/* Step 4: Condiments */}
        {store.currentStep === 4 && (
          <View>
            <Text style={styles.stepTitle}>Condiments Available</Text>
            <View style={styles.condimentGrid}>
              {CONDIMENT_OPTIONS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, store.condiments.includes(c) && styles.chipActive]}
                  onPress={() => store.toggleCondiment(c)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      store.condiments.includes(c) && styles.chipTextActive,
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 5: Summary */}
        {store.currentStep === 5 && (
          <View>
            <Text style={styles.stepTitle}>Your Verdict</Text>

            <Text style={styles.fieldLabel}>Overall Rating</Text>
            <TacoRating value={store.overallRating} onChange={v => store.setField('overallRating', v)} size={36} />

            <Text style={styles.fieldLabel}>Would you come back?</Text>
            <View style={styles.intentRow}>
              {(['yes', 'maybe', 'no'] as const).map(intent => (
                <TouchableOpacity
                  key={intent}
                  style={[styles.intentBtn, store.returnIntent === intent && styles.intentBtnActive]}
                  onPress={() => store.setField('returnIntent', intent)}
                >
                  <Text
                    style={[
                      styles.intentText,
                      store.returnIntent === intent && styles.intentTextActive,
                    ]}
                  >
                    {intent === 'yes' ? '✓ Yes' : intent === 'maybe' ? '~ Maybe' : '✗ No'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="What stood out?"
              placeholderTextColor={colors.gray300}
              value={store.notes}
              onChangeText={v => store.setField('notes', v)}
              multiline
              numberOfLines={4}
            />
          </View>
        )}
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navRow}>
        {store.currentStep > 1 ? (
          <TouchableOpacity style={styles.backBtn} onPress={store.prevStep}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        {store.currentStep < 5 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={store.nextStep}>
            <Text style={styles.nextBtnText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={handleSubmit}>
            <Text style={styles.nextBtnText}>Save</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

// Sub-component: add a taco entry
function AddTacoEntry({
  onAdd,
}: {
  onAdd: (entry: { tacoType: string; rating: number; notes: null }) => void
}) {
  const [type, setType] = useState('')
  const [rating, setRating] = useState(0)
  const [showTypes, setShowTypes] = useState(false)

  function handleAdd() {
    if (!type || !rating) return
    onAdd({ tacoType: type, rating, notes: null })
    setType('')
    setRating(0)
    setShowTypes(false)
  }

  return (
    <View style={styles.addEntry}>
      <TouchableOpacity style={styles.typeSelector} onPress={() => setShowTypes(!showTypes)}>
        <Text style={type ? styles.typeSelectorText : styles.typeSelectorPlaceholder}>
          {type || 'Select taco type'}
        </Text>
      </TouchableOpacity>
      {showTypes && (
        <ScrollView style={styles.typeList} nestedScrollEnabled>
          {TACO_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={styles.typeOption}
              onPress={() => {
                setType(t)
                setShowTypes(false)
              }}
            >
              <Text>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <TacoRating value={rating} onChange={setRating} />
      <TouchableOpacity
        style={[styles.addEntryBtn, (!type || !rating) && styles.addEntryBtnDisabled]}
        onPress={handleAdd}
        disabled={!type || !rating}
      >
        <Text style={styles.addEntryBtnText}>Add Taco</Text>
      </TouchableOpacity>
    </View>
  )
}

// Sub-component: add a salsa entry
function AddSalsaEntry({
  onAdd,
}: {
  onAdd: (entry: {
    salsaName: string
    flavorRating: number
    heatLevel: 'mild' | 'medium' | 'hot' | 'fire' | null
  }) => void
}) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [heat, setHeat] = useState<'mild' | 'medium' | 'hot' | 'fire' | null>(null)

  function handleAdd() {
    if (!name.trim() || !rating) return
    onAdd({ salsaName: name.trim(), flavorRating: rating, heatLevel: heat })
    setName('')
    setRating(0)
    setHeat(null)
  }

  return (
    <View style={styles.addEntry}>
      <TextInput
        style={styles.input}
        placeholder="Salsa name (e.g. Salsa Verde)"
        placeholderTextColor={colors.gray300}
        value={name}
        onChangeText={setName}
      />
      <Text style={styles.fieldLabel}>Flavor</Text>
      <TacoRating value={rating} onChange={setRating} />
      <Text style={styles.fieldLabel}>Heat Level</Text>
      <View style={styles.intentRow}>
        {HEAT_LEVELS.map(h => (
          <TouchableOpacity
            key={h}
            style={[styles.intentBtn, heat === h && styles.intentBtnActive]}
            onPress={() => setHeat(h)}
          >
            <Text style={[styles.intentText, heat === h && styles.intentTextActive]}>{h}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.addEntryBtn, (!name.trim() || !rating) && styles.addEntryBtnDisabled]}
        onPress={handleAdd}
        disabled={!name.trim() || !rating}
      >
        <Text style={styles.addEntryBtnText}>Add Salsa</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.creamDark },
  stepDotActive: { backgroundColor: colors.terracotta },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  stepTitle: {
    fontSize: typography.fontSizeXxl,
    fontWeight: typography.fontWeightBold,
    color: colors.brown,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: typography.fontSizeLg,
    color: colors.brown,
    borderWidth: 1,
    borderColor: colors.creamDark,
  },
  notesInput: { height: 100, textAlignVertical: 'top' },
  gpsButton: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.creamDark,
  },
  gpsButtonText: { color: colors.brown, fontSize: typography.fontSizeMd },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  entryLabel: { flex: 1, fontSize: typography.fontSizeMd, color: colors.brown },
  removeBtn: { color: colors.error, fontSize: 16, padding: spacing.xs },
  heatLabel: { fontSize: typography.fontSizeSm, color: colors.terracotta },
  addEntry: { marginTop: spacing.md },
  typeSelector: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.creamDark,
  },
  typeSelectorText: { color: colors.brown, fontSize: typography.fontSizeMd },
  typeSelectorPlaceholder: { color: colors.gray300, fontSize: typography.fontSizeMd },
  typeList: {
    maxHeight: 200,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.creamDark,
    marginBottom: spacing.sm,
  },
  typeOption: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.creamDark },
  fieldLabel: {
    fontSize: typography.fontSizeMd,
    fontWeight: typography.fontWeightMedium,
    color: colors.brown,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  intentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  intentBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  intentBtnActive: { backgroundColor: colors.terracotta, borderColor: colors.terracotta },
  intentText: { color: colors.gray500, fontSize: typography.fontSizeMd },
  intentTextActive: { color: colors.white },
  condimentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.terracotta, borderColor: colors.terracotta },
  chipText: { color: colors.gray500, fontSize: typography.fontSizeMd },
  chipTextActive: { color: colors.white },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.creamDark,
  },
  backBtn: { padding: spacing.md },
  backBtnText: { color: colors.gray500, fontSize: typography.fontSizeLg },
  nextBtn: {
    backgroundColor: colors.terracotta,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  nextBtnText: {
    color: colors.white,
    fontWeight: typography.fontWeightBold,
    fontSize: typography.fontSizeLg,
  },
  addEntryBtn: {
    backgroundColor: colors.terracotta,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addEntryBtnDisabled: { opacity: 0.4 },
  addEntryBtnText: { color: colors.white, fontWeight: typography.fontWeightBold },
})
