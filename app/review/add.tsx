import { useState, useCallback, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image, Modal, Alert,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useReviewFormStore, FoodCategory } from '../../src/store/reviewFormStore'
import { localStorageService } from '../../src/services/localStorage'
import { photoService } from '../../src/services/photoService'
import { syncService } from '../../src/services/syncService'
import { useAuthStore } from '../../src/store/authStore'
import { useProStore } from '../../src/store/proStore'
import { LocationPicker } from '../../src/components/LocationPicker'
import { FoodIconBar } from '../../src/components/FoodIconBar'
import { ChipScorecard } from '../../src/components/ChipScorecard'
import { colors, spacing, radius } from '../../src/utils/theme'
import { spotNameSchema, notesSchema, firstError } from '../../src/utils/validation'
import type { SpotType, PrivacySetting, HeatLevel } from '../../src/types/app'

const SPOT_TYPES: SpotType[] = ['Truck', 'Food Cart', 'Pop-up', 'Restaurant']

const PRIVACY_OPTIONS: { value: PrivacySetting; label: string; icon: string }[] = [
  { value: 'public', label: 'Public', icon: 'earth-outline' },
  { value: 'friends', label: 'Mi Gente', icon: 'people-outline' },
  { value: 'private', label: 'Just Me', icon: 'lock-closed-outline' },
]

const TACO_TYPES = ['Al Pastor', 'Carne Asada', 'Carnitas', 'Birria', 'Pollo', 'Fish', 'Shrimp', 'Lengua', 'Cabeza', 'Chorizo', 'Veggie', 'Other']
const BURRITO_TYPES = ['California', 'Birria', 'Carne Asada', 'Pollo', 'Chorizo', 'Bean & Cheese', 'Wet', 'Other']
const TORTA_TYPES = ['Milanesa', 'Cubana', 'Pierna', 'Al Pastor', 'Chorizo', 'Other']
const HEAT_LEVELS: HeatLevel[] = ['mild', 'medium', 'hot', 'fire', 'volcano']
const HEAT_ICONS: Record<HeatLevel, string> = {
  mild: '🌶',
  medium: '🌶🌶',
  hot: '🔥',
  fire: '🔥🔥',
  volcano: '🌋',
}

const STEP_NAMES = ['The Spot', "What'd You Have?", 'Your Verdict']

export default function ReviewWizard() {
  const insets = useSafeAreaInsets()
  const store = useReviewFormStore()
  const session = useAuthStore(s => s.session)
  const isPro = useProStore(s => s.isPro)
  const params = useLocalSearchParams<{
    vendorLocalId?: string
    editReviewId?: string
    prefillName?: string
    prefillAddress?: string
    prefillLat?: string
    prefillLng?: string
    prefillCity?: string
  }>()
  const [showSpotNote, setShowSpotNote] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showDitchModal, setShowDitchModal] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pickingPhoto, setPickingPhoto] = useState(false)

  // Reset form on mount for new reviews (not edits)
  useEffect(() => {
    if (!params.editReviewId) {
      store.reset()
    }
  }, [])

  // Auto-expand spot note when entering edit mode if notes exist
  useEffect(() => {
    if (params.editReviewId && store.spotNote) setShowSpotNote(true)
  }, [params.editReviewId])

  // Pre-fill from a Google Places suggestion passed via router params
  useEffect(() => {
    const { prefillName, prefillAddress, prefillLat, prefillLng, prefillCity, vendorLocalId, editReviewId } = params
    if (!prefillName || vendorLocalId || editReviewId) return
    if (store.vendorName === prefillName) return // already loaded
    store.setField('vendorName', prefillName)
    if (prefillAddress) store.setField('address', prefillAddress)
    if (prefillLat) store.setField('lat', parseFloat(prefillLat))
    if (prefillLng) store.setField('lng', parseFloat(prefillLng))
    if (prefillCity) store.setField('cityName', prefillCity)
  }, [params.prefillName])

  // Pre-fill Step 1 from an existing pinned vendor when logging first visit
  useEffect(() => {
    const { vendorLocalId, editReviewId } = params
    if (!vendorLocalId || editReviewId) return // edit mode handled elsewhere
    if (store.editingVendorLocalId === vendorLocalId) return // already loaded

    localStorageService.getVendors().then(vendors => {
      const vendor = vendors.find(v => v.localId === vendorLocalId)
      if (!vendor) return
      store.setField('vendorName', vendor.name)
      store.setField('spotType', vendor.spotType ?? null)
      store.setField('lat', vendor.lat ?? null)
      store.setField('lng', vendor.lng ?? null)
      store.setField('address', vendor.address ?? null)
      store.setField('cityName', vendor.cityName ?? null)
      store.setField('privacy', vendor.privacy ?? 'public')
      store.setField('spotNote', vendor.spotNote ?? '')
      store.setField('editingVendorLocalId', vendorLocalId)
      if (vendor.spotNote) setShowSpotNote(true)
    })
  }, [params.vendorLocalId])

  const litCategories: FoodCategory[] = []
  if (store.tacoEntries.length > 0) litCategories.push('tacos')
  if (store.burritoEntries.length > 0) litCategories.push('burritos')
  if (store.tortaEntries.length > 0) litCategories.push('tortas')
  if (store.salsaEntries.length > 0) litCategories.push('salsas')

  function handleClose() {
    setShowDitchModal(true)
  }

  function handleProGate() {
    setErrorMsg('Upgrade to TacoAtlas Pro to rate burritos and tortas!')
  }

  async function handleAddPhoto(source: 'library' | 'camera') {
    setPickingPhoto(true)
    try {
      const uri = source === 'library'
        ? await photoService.pickFromLibrary()
        : await photoService.takePhoto()
      if (uri) store.addPhoto(uri)
    } catch (e) {
      Alert.alert('Photo Error', 'Could not add photo. Try again.')
    } finally {
      setPickingPhoto(false)
    }
  }

  async function handleSubmit() {
    setErrorMsg(null)
    const nameResult = spotNameSchema.safeParse(store.vendorName)
    if (!nameResult.success) {
      setErrorMsg(firstError(nameResult) ?? 'Give this spot a name.')
      return
    }
    const notesResult = notesSchema.safeParse(store.spotNote || undefined)
    if (!notesResult.success) {
      setErrorMsg(firstError(notesResult) ?? 'Notes too long.')
      return
    }
    setSubmitting(true)
    try {
      let vendorLocalId = store.editingVendorLocalId

      const effectivePrivacy = isPro ? store.privacy : 'private'

      if (!vendorLocalId) {
        // New vendor
        const vendor = await localStorageService.addVendor({
          name: nameResult.data,
          spotType: store.spotType,
          lat: store.lat ?? 0,
          lng: store.lng ?? 0,
          address: store.address,
          cityName: store.cityName,
          hours: null,
          photoUri: null,
          privacy: effectivePrivacy,
          spotNote: store.spotNote.trim() || null,
          isVisited: true,
        })
        vendorLocalId = vendor.localId
      } else {
        // Updating existing vendor — persist all editable fields
        await localStorageService.updateVendor(vendorLocalId, {
          name: nameResult.data,
          spotType: store.spotType,
          lat: store.lat ?? undefined,
          lng: store.lng ?? undefined,
          address: store.address,
          cityName: store.cityName,
          spotNote: store.spotNote.trim() || null,
          privacy: effectivePrivacy,
          isVisited: true,
        })
      }

      // Upload any local photos to Supabase before saving (signed-in users only)
      let finalPhotoUris = store.photoUris
      if (session && store.photoUris.length > 0) {
        finalPhotoUris = await Promise.all(
          store.photoUris.map(uri =>
            uri.startsWith('http') ? Promise.resolve(uri) : photoService.uploadPhoto(uri, session.user.id)
          )
        )
      }

      const reviewPayload = {
        vendorLocalId,
        overallRating: store.overallRating,
        returnIntent: store.returnIntent,
        notes: store.notes.trim() || null,
        photoUris: finalPhotoUris,
        tacoEntries: store.tacoEntries.map(e => ({ tacoType: e.tacoType || '', rating: e.rating, notes: e.notes })),
        salsaEntries: store.salsaEntries,
        condiments: store.condiments,
        burritoEntries: store.burritoEntries,
        tortaEntries: store.tortaEntries,
      }

      let savedReview
      if (store.editingReviewLocalId) {
        await localStorageService.updateReview(store.editingReviewLocalId, reviewPayload)
        const all = await localStorageService.getReviews()
        savedReview = all.find(r => r.localId === store.editingReviewLocalId) ?? null
      } else {
        savedReview = await localStorageService.addReview(reviewPayload)
      }

      // Background sync to Supabase (Pro only — free reviews stay local until upgrade)
      if (session && savedReview && isPro) {
        syncService.liveSync(vendorLocalId, savedReview, session.user.id)
      }

      store.reset()
      router.back()
    } catch (e) {
      setErrorMsg('Could not save your review. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Image source={require('../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

      {/* Ditch confirmation modal */}
      <Modal visible={showDitchModal} transparent animationType="fade" onRequestClose={() => setShowDitchModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ditch this visit?</Text>
            <Text style={styles.modalBody}>Your progress will be lost.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalKeepBtn} onPress={() => setShowDitchModal(false)}>
                <Text style={styles.modalKeepText}>Keep Editing</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDitchBtn} onPress={() => { setShowDitchModal(false); store.reset(); router.back() }}>
                <Text style={styles.modalDitchText}>Ditch It</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Image source={require('../../images/tacoatlas-logo-horz.png')} style={styles.headerLogo} resizeMode="contain" />
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <Ionicons name="close" size={20} color={colors.cream} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log a Visit</Text>
          <View style={{ width: 36 }} />
        </View>
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

      {errorMsg && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color={colors.error} />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

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
            {isPro ? (
              <View style={styles.privacyRow}>
                {PRIVACY_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.privacyBtn, store.privacy === opt.value && styles.privacyBtnActive]}
                    onPress={() => store.setField('privacy', opt.value)}
                  >
                    <Ionicons name={opt.icon as any} size={22} color={store.privacy === opt.value ? colors.amber : colors.creamMuted} style={styles.privacyIcon} />
                    <Text style={[styles.privacyLabel, store.privacy === opt.value && styles.privacyLabelActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.privacyLockedRow}>
                <Ionicons name="lock-closed-outline" size={16} color={colors.creamMuted} />
                <Text style={styles.privacyLockedText}>Just Me — upgrade to Pro to share your atlas</Text>
              </View>
            )}

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

            {store.activeCategory === null && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>🌮</Text>
                <Text style={styles.emptyStateTitle}>What did you eat?</Text>
                <Text style={styles.emptyStateSubtitle}>Tap a category above, then pick what you had.</Text>
              </View>
            )}

            {store.activeCategory === 'tacos' && (
              <ChipScorecard
                presets={TACO_TYPES}
                items={store.tacoEntries.map(e => ({ label: e.tacoType, rating: e.rating, notes: e.notes }))}
                onAdd={item => store.addTacoEntry({ tacoType: item.label, rating: item.rating, notes: item.notes })}
                onRemove={store.removeTacoEntry}
                onUpdate={(idx, updates) => store.updateTacoEntry(idx, {
                  ...(updates.label !== undefined && { tacoType: updates.label }),
                  ...(updates.rating !== undefined && { rating: updates.rating }),
                  ...(updates.notes !== undefined && { notes: updates.notes }),
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
                heatLevels={HEAT_LEVELS}
                heatLevelIcons={HEAT_ICONS}
                items={store.salsaEntries.map(e => ({ label: e.salsaName, rating: e.flavorRating, notes: e.notes ?? null, heatLevel: e.heatLevel }))}
                onAdd={item => store.addSalsaEntry({ salsaName: item.label, flavorRating: item.rating, heatLevel: item.heatLevel ?? null, notes: item.notes })}
                onRemove={store.removeSalsaEntry}
                onUpdate={(idx, updates) => {
                  // Reconstruct salsa entry on update
                  const entries = [...store.salsaEntries]
                  if (updates.rating !== undefined) entries[idx] = { ...entries[idx], flavorRating: updates.rating }
                  if (updates.notes !== undefined) entries[idx] = { ...entries[idx], notes: updates.notes }
                  store.setField('salsaEntries', entries)
                }}
                renderHeatPicker={(item, idx) => (
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: spacing.sm, flexWrap: 'wrap' }}>
                    {HEAT_LEVELS.map(h => {
                      const isActive = store.salsaEntries[idx]?.heatLevel === h
                      return (
                        <TouchableOpacity
                          key={h}
                          style={{
                            alignItems: 'center', gap: 2,
                            paddingHorizontal: 10, paddingVertical: 6,
                            borderRadius: radius.md, borderWidth: 1,
                            borderColor: isActive ? colors.amber : colors.surfaceBorder,
                            backgroundColor: isActive ? colors.amberSubtle : colors.surface,
                          }}
                          onPress={() => {
                            const entries = [...store.salsaEntries]
                            entries[idx] = { ...entries[idx], heatLevel: h }
                            store.setField('salsaEntries', entries)
                          }}
                        >
                          <Text style={{ fontSize: 16 }}>{HEAT_ICONS[h as HeatLevel]}</Text>
                          <Text style={{ fontSize: 10, fontWeight: '600', color: isActive ? colors.amber : colors.creamMuted }}>
                            {h}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                )}
              />
            )}

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

            <Text style={styles.fieldLabel}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll} contentContainerStyle={styles.photoScrollContent}>
              {store.photoUris.map((uri, idx) => (
                <View key={uri} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.thumbImg} />
                  <TouchableOpacity style={styles.removePhotoBtn} onPress={() => store.removePhoto(uri)}>
                    <Ionicons name="close-circle" size={20} color={colors.cream} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addPhotoBtn} onPress={() => handleAddPhoto('library')} disabled={pickingPhoto}>
                {pickingPhoto
                  ? <ActivityIndicator size="small" color={colors.amber} />
                  : <Ionicons name="image-outline" size={24} color={colors.amber} />}
                <Text style={styles.addPhotoText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addPhotoBtn} onPress={() => handleAddPhoto('camera')} disabled={pickingPhoto}>
                <Ionicons name="camera-outline" size={24} color={colors.amber} />
                <Text style={styles.addPhotoText}>Camera</Text>
              </TouchableOpacity>
            </ScrollView>
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
    paddingHorizontal: spacing.md, paddingBottom: spacing.sm,
  },
  headerLogo: { height: 28, width: 160, alignSelf: 'center', marginBottom: spacing.xs },
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
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
  privacyLockedRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceRaised, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  privacyLockedText: { color: colors.creamMuted, fontSize: 13, flex: 1 },
  privacyBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 4,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceRaised,
  },
  privacyBtnActive: { borderColor: colors.amber, backgroundColor: colors.amberSubtle },
  privacyIcon: { marginBottom: 4 },
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
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyStateEmoji: { fontSize: 48 },
  emptyStateTitle: {
    fontSize: 20, fontWeight: '700', color: colors.cream, marginTop: spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: 14, color: colors.creamMuted, textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    width: '100%', backgroundColor: colors.surface,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surfaceBorder,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: 18, fontWeight: '800', color: colors.cream,
    marginBottom: spacing.sm,
  },
  modalBody: {
    fontSize: 14, color: colors.creamMuted, marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row', gap: spacing.sm,
  },
  modalKeepBtn: {
    flex: 1, paddingVertical: 12, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceRaised, alignItems: 'center',
  },
  modalKeepText: {
    color: colors.cream, fontWeight: '600', fontSize: 14,
  },
  modalDitchBtn: {
    flex: 1, paddingVertical: 12, borderRadius: radius.full,
    backgroundColor: colors.amber, alignItems: 'center',
  },
  modalDitchText: {
    color: colors.bg, fontWeight: '700', fontSize: 14,
  },
  photoScroll: { marginBottom: spacing.md },
  photoScrollContent: { gap: spacing.sm, paddingVertical: 4 },
  photoThumb: { width: 80, height: 80, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: 80, height: 80 },
  removePhotoBtn: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10,
  },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.amberDim, borderStyle: 'dashed',
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  addPhotoText: { fontSize: 10, color: colors.amber, fontWeight: '600' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: '#3A1A1A', borderWidth: 1, borderColor: colors.error,
    borderRadius: radius.md, padding: spacing.sm,
    marginHorizontal: spacing.md, marginBottom: spacing.xs,
  },
  errorText: { flex: 1, color: colors.error, fontSize: 13 },
})
