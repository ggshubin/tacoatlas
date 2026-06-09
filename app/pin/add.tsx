import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { localStorageService } from '../../src/services/localStorage'
import { useAuthStore } from '../../src/store/authStore'
import { useProStore } from '../../src/store/proStore'
import { syncService } from '../../src/services/syncService'
import { LocationPicker } from '../../src/components/LocationPicker'
import { PrivacySelector } from '../../src/components/PrivacySelector'
import { ProPaywallModal } from '../../src/components/ProPaywallModal'
import { colors, spacing, radius } from '../../src/utils/theme'
import { spotNameSchema, firstError } from '../../src/utils/validation'
import type { SpotType, PrivacySetting } from '../../src/types/app'
import type { LocationResult } from '../../src/components/LocationPicker'

const SPOT_TYPES: SpotType[] = ['Truck', 'Food Cart', 'Pop-up', 'Restaurant']

export default function DropPinScreen() {
  const insets = useSafeAreaInsets()
  const { session } = useAuthStore()
  const isPro = useProStore(s => s.isPro)
  const [name, setName] = useState('')
  const [spotType, setSpotType] = useState<SpotType | null>(null)
  const [location, setLocation] = useState<LocationResult | null>(null)
  const [privacy, setPrivacy] = useState<PrivacySetting>(isPro ? 'public' : 'private')
  const [spotNote, setSpotNote] = useState('')
  const [showSpotNote, setShowSpotNote] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)

  async function handleSave() {
    setErrorMsg(null)
    const nameResult = spotNameSchema.safeParse(name)
    if (!nameResult.success) {
      setErrorMsg(firstError(nameResult) ?? 'Give this spot a name.')
      return
    }
    if (!isPro && await localStorageService.isAtFreeLimit()) {
      Alert.alert(
        'Upgrade to Pro',
        "You've reached your 15-spot limit. Upgrade to TacoAtlas Pro for unlimited spots.",
        [
          { text: 'Maybe Later', style: 'cancel' },
          { text: 'Upgrade Now', onPress: () => router.push('/(tabs)/profile') },
        ]
      )
      return
    }
    setSaving(true)
    try {
      const savedVendor = await localStorageService.addVendor({
        name: nameResult.data,
        spotType,
        lat: location?.lat ?? 0,
        lng: location?.lng ?? 0,
        address: location?.address ?? null,
        cityName: location?.cityName ?? null,
        hours: null,
        photoUri: null,
        privacy: isPro ? privacy : 'private',
        spotNote: spotNote.trim() || null,
        isVisited: false,
      })
      // Fire-and-forget: sync pin to Supabase immediately if signed in
      if (session?.user.id) {
        syncService.syncVendorOnly(savedVendor, session.user.id)
      }
      router.back()
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Image source={require('../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Image source={require('../../images/tacoatlas-logo-horz.png')} style={styles.headerLogo} resizeMode="contain" />
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={20} color={colors.cream} />
          </TouchableOpacity>
          <Text style={styles.title}>Drop a Pin</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.nameInput}
          placeholder="Taco spot name"
          placeholderTextColor={colors.creamDim}
          value={name}
          onChangeText={setName}
          autoFocus
        />
        {errorMsg && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <Text style={styles.fieldLabel}>Type of Spot</Text>
        <View style={styles.chipGrid}>
          {SPOT_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, spotType === t && styles.chipActive]}
              onPress={() => setSpotType(prev => prev === t ? null : t)}
            >
              <Text style={[styles.chipText, spotType === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Location</Text>
        <LocationPicker value={location} onChange={setLocation} />

        <Text style={styles.fieldLabel}>Who can see this?</Text>
        <PrivacySelector
          value={privacy}
          onChange={setPrivacy}
          isPro={isPro}
          isSignedIn={!!session}
          onUpgradePress={() => session ? setShowPaywall(true) : router.push('/(auth)/sign-up')}
        />

        <TouchableOpacity
          style={styles.noteToggle}
          onPress={() => setShowSpotNote(s => !s)}
        >
          <Ionicons name={showSpotNote ? 'chevron-down' : 'chevron-forward'} size={14} color={colors.creamMuted} />
          <Text style={styles.noteToggleText}>Add a note about this spot</Text>
        </TouchableOpacity>
        {showSpotNote && (
          <TextInput
            style={styles.noteInput}
            placeholder="Cash only, opens at 3pm, park on Valencia..."
            placeholderTextColor={colors.creamDim}
            value={spotNote}
            onChangeText={setSpotNote}
            multiline
            numberOfLines={3}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Pin'}</Text>
        </TouchableOpacity>
      </View>
      <ProPaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
  },
  headerLogo: { height: 28, width: 160, alignSelf: 'center', marginBottom: spacing.xs },
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(36,28,22,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.cream },
  scroll: { padding: spacing.md, paddingBottom: 100 },
  nameInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 18, fontWeight: '700', color: colors.cream,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    marginBottom: spacing.md,
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
  noteToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  noteToggleText: { color: colors.creamMuted, fontSize: 13 },
  noteInput: {
    backgroundColor: colors.surfaceRaised, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    padding: spacing.md, color: colors.cream, fontSize: 14,
    textAlignVertical: 'top', minHeight: 80,
  },
  footer: { padding: spacing.md, paddingBottom: 36 },
  saveBtn: {
    backgroundColor: colors.amber, borderRadius: radius.full,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnText: { color: colors.cream, fontWeight: '700', fontSize: 16 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: '#3A1A1A', borderWidth: 1, borderColor: colors.error,
    borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md,
  },
  errorText: { flex: 1, color: colors.error, fontSize: 13 },
})
