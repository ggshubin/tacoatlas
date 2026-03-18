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
  Image,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { useReviewFormStore } from '../../src/store/reviewFormStore'
import { useAuthStore } from '../../src/store/authStore'
import { localStorageService } from '../../src/services/localStorage'
import { locationService } from '../../src/services/locationService'
import { Ionicons } from '@expo/vector-icons'
import { TacoRating } from '../../src/components/TacoRating'
import { colors, spacing, typography, radius } from '../../src/utils/theme'

const HEAT_CONFIG: Record<string, { icon: 'thermometer-outline' | 'thermometer'; color: string; label: string; flame?: boolean; volcano?: boolean }> = {
  mild:    { icon: 'thermometer-outline', color: '#64B5F6', label: 'Mild' },
  medium:  { icon: 'thermometer-outline', color: '#FFC107', label: 'Medium' },
  hot:     { icon: 'thermometer',         color: '#FF7043', label: 'Hot' },
  fire:    { icon: 'thermometer',         color: '#FF1744', label: 'Fire',    flame: true },
  volcano: { icon: 'thermometer',         color: '#B71C1C', label: 'Volcano', volcano: true },
}

function HeatIcon({ level, size = 24 }: { level: string; size?: number }) {
  const cfg = HEAT_CONFIG[level]
  if (!cfg) return null

  if (cfg.volcano) {
    return (
      <View style={{ width: size * 1.4, height: size * 1.4, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="bonfire" size={size * 1.2} color="#B71C1C" style={{ position: 'absolute', opacity: 0.6 }} />
        <Ionicons name={cfg.icon} size={size * 0.75} color={cfg.color} />
      </View>
    )
  }

  if (cfg.flame) {
    return (
      <View style={{ width: size * 1.4, height: size * 1.4, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="flame" size={size * 1.2} color="#FF6D00" style={{ position: 'absolute', opacity: 0.7 }} />
        <Ionicons name={cfg.icon} size={size * 0.75} color={cfg.color} />
      </View>
    )
  }

  return <Ionicons name={cfg.icon} size={size} color={cfg.color} />
}

const SPOT_TYPES = ['Truck', 'Food Cart', 'Street Tent', 'House', 'Brick & Mortar', 'Restaurant'] as const

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
const HEAT_LEVELS = ['mild', 'medium', 'hot', 'fire', 'volcano'] as const
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
  const params = useLocalSearchParams<{ vendorId?: string; vendorName?: string; editReviewId?: string; vendorLocalId?: string }>()
  const store = useReviewFormStore()
  const { session } = useAuthStore()
  const isEditing = !!store.editingReviewLocalId

  // Initialize from params if coming from vendor detail (new review only)
  useState(() => {
    if (params.vendorName && !store.vendorName && !store.editingReviewLocalId) {
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

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take photos.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    })
    if (!result.canceled && result.assets[0]) {
      store.addPhoto(result.assets[0].uri)
    }
  }

  async function handlePickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 6,
    })
    if (!result.canceled) {
      result.assets.forEach(a => store.addPhoto(a.uri))
    }
  }

  async function handleSubmit() {
    if (!store.vendorName.trim() && !isEditing) {
      Alert.alert('Missing info', 'Enter the taco spot name.')
      return
    }

    if (isEditing && store.editingReviewLocalId) {
      await localStorageService.updateReview(store.editingReviewLocalId, {
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
      return
    }

    const vendor = await localStorageService.addVendor({
      name: store.vendorName.trim(),
      spotType: store.spotType,
      lat: store.lat ?? 0,
      lng: store.lng ?? 0,
      address: store.address,
      cityName: store.cityName,
      hours: null,
      photoUri: null,
    })

    await localStorageService.addReview({
      vendorLocalId: params.vendorLocalId ?? vendor.localId,
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
      <Image
        source={require('../../assets/background.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

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
              placeholderTextColor={colors.creamDim}
              value={store.vendorName}
              onChangeText={v => store.setField('vendorName', v)}
            />
            <TextInput
              style={styles.input}
              placeholder="City (optional)"
              placeholderTextColor={colors.creamDim}
              value={store.cityName ?? ''}
              onChangeText={v => store.setField('cityName', v || null)}
            />
            <Text style={styles.fieldLabel}>Type of Spot</Text>
            <View style={styles.spotTypeGrid}>
              {SPOT_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.spotTypeChip, store.spotType === t && styles.spotTypeChipActive]}
                  onPress={() => store.setField('spotType', store.spotType === t ? null : t)}
                >
                  <Text style={[styles.spotTypeText, store.spotType === t && styles.spotTypeTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.gpsButton} onPress={handleGpsTag}>
              <Text style={styles.gpsButtonText}>
                {store.lat
                  ? `📍 ${store.lat.toFixed(4)}, ${store.lng?.toFixed(4)}`
                  : '📍 Tag Location (optional)'}
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
                {entry.heatLevel ? (
                  <HeatIcon level={entry.heatLevel} size={16} />
                ) : null}
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
              placeholderTextColor={colors.creamDim}
              value={store.notes}
              onChangeText={v => store.setField('notes', v)}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.fieldLabel}>Photos</Text>
            <View style={styles.photoGrid}>
              {store.photoUris.map((uri, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.photoThumbImg} />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => store.removePhoto(uri)}>
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={20} color={colors.amber} />
                <Text style={styles.photoBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
                <Ionicons name="images" size={20} color={colors.amber} />
                <Text style={styles.photoBtnText}>Library</Text>
              </TouchableOpacity>
            </View>
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
              <Text style={styles.typeOptionText}>{t}</Text>
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
    heatLevel: 'mild' | 'medium' | 'hot' | 'fire' | 'volcano' | null
  }) => void
}) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [heat, setHeat] = useState<'mild' | 'medium' | 'hot' | 'fire' | 'volcano' | null>(null)

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
        placeholderTextColor={colors.creamDim}
        value={name}
        onChangeText={setName}
      />
      <Text style={styles.fieldLabel}>Flavor</Text>
      <TacoRating value={rating} onChange={setRating} />
      <Text style={styles.fieldLabel}>Heat Level</Text>
      <View style={styles.heatRow}>
        {HEAT_LEVELS.map(h => {
          const cfg = HEAT_CONFIG[h]
          const active = heat === h
          return (
            <TouchableOpacity
              key={h}
              style={[styles.heatBtn, active && { borderColor: cfg.color, backgroundColor: 'rgba(0,0,0,0.3)' }]}
              onPress={() => setHeat(h)}
            >
              <HeatIcon level={h} size={28} />
              <Text style={[styles.heatBtnLabel, active && { color: cfg.color }]}>{cfg.label}</Text>
            </TouchableOpacity>
          )
        })}
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
  container: { flex: 1, backgroundColor: colors.bg },
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.surfaceBorder },
  stepDotActive: { backgroundColor: colors.amber },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
  stepTitle: {
    fontSize: typography.fontSizeXxl,
    fontWeight: typography.fontWeightBold,
    color: colors.cream,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: 'rgba(36, 28, 22, 0.85)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: typography.fontSizeLg,
    color: colors.cream,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  notesInput: { height: 100, textAlignVertical: 'top' },
  gpsButton: {
    backgroundColor: 'rgba(36, 28, 22, 0.85)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  gpsButtonText: { color: colors.creamMuted, fontSize: typography.fontSizeMd },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: 'rgba(36, 28, 22, 0.85)',
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  entryLabel: { flex: 1, fontSize: typography.fontSizeMd, color: colors.cream },
  removeBtn: { color: colors.error, fontSize: 16, padding: spacing.xs },
  heatLabel: { fontSize: typography.fontSizeSm, color: colors.amber },
  addEntry: { marginTop: spacing.md },
  typeSelector: {
    backgroundColor: 'rgba(36, 28, 22, 0.85)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  typeSelectorText: { color: colors.cream, fontSize: typography.fontSizeMd },
  typeSelectorPlaceholder: { color: colors.creamDim, fontSize: typography.fontSizeMd },
  typeList: {
    maxHeight: 200,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.sm,
  },
  typeOption: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder },
  typeOptionText: { color: colors.cream, fontSize: typography.fontSizeMd },
  fieldLabel: {
    fontSize: typography.fontSizeMd,
    fontWeight: typography.fontWeightMedium,
    color: colors.creamMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  intentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, flexWrap: 'wrap' },
  intentBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  intentBtnActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  intentText: { color: colors.creamMuted, fontSize: typography.fontSizeMd },
  intentTextActive: { color: colors.cream, fontWeight: typography.fontWeightBold },
  condimentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: 'rgba(36, 28, 22, 0.7)',
  },
  chipActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  chipText: { color: colors.creamMuted, fontSize: typography.fontSizeMd },
  chipTextActive: { color: colors.cream, fontWeight: typography.fontWeightBold },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    backgroundColor: 'rgba(24, 20, 15, 0.9)',
  },
  backBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  backBtnText: { color: colors.creamMuted, fontSize: typography.fontSizeLg },
  nextBtn: {
    backgroundColor: colors.amber,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  nextBtnText: {
    color: colors.cream,
    fontWeight: typography.fontWeightBold,
    fontSize: typography.fontSizeLg,
  },
  spotTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  spotTypeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: 'rgba(36,28,22,0.6)',
  },
  spotTypeChipActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  spotTypeText: { color: colors.creamMuted, fontSize: 13, fontWeight: '600' },
  spotTypeTextActive: { color: colors.cream },

  heatRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  heatBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: 'rgba(36, 28, 22, 0.6)',
    minWidth: 58,
  },
  heatBtnLabel: {
    color: colors.creamMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  addEntryBtn: {
    backgroundColor: colors.amber,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addEntryBtnDisabled: { opacity: 0.4 },
  addEntryBtnText: { color: colors.cream, fontWeight: typography.fontWeightBold },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  photoThumb: { position: 'relative' },
  photoThumbImg: { width: 90, height: 90, borderRadius: radius.md },
  photoRemove: { position: 'absolute', top: -6, right: -6 },
  photoActions: { flexDirection: 'row', gap: spacing.sm },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(36,28,22,0.85)',
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.amberDim,
  },
  photoBtnText: { color: colors.amber, fontWeight: '600', fontSize: 14 },
})
