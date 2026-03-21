import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Image as RNImage,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { useAuthStore } from '../../src/store/authStore'
import { useProStore } from '../../src/store/proStore'
import { supabase } from '../../src/services/supabase'
import { colors, spacing, radius, typography } from '../../src/utils/theme'

export default function SettingsScreen() {
  const { session, profile, signOut, updateProfile, changePassword, deleteAccount } = useAuthStore()
  const { isPro } = useProStore()

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [homeCity, setHomeCity] = useState('')
  const [favoriteTaco, setFavoriteTaco] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '')
      setBio(profile.bio ?? '')
      setHomeCity(profile.home_city ?? '')
      setFavoriteTaco(profile.favorite_taco ?? '')
      setAvatarUrl(profile.avatar_url ?? null)
    }
  }, [profile])

  async function handlePickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })
    if (result.canceled || !result.assets[0]) return
    if (!session) return

    setUploadingAvatar(true)
    try {
      const uri = result.assets[0].uri
      const ext = uri.split('.').pop() ?? 'jpg'
      const path = `avatars/${session.user.id}.${ext}`

      const response = await fetch(uri)
      const blob = await response.blob()
      const arrayBuffer = await new Response(blob).arrayBuffer()

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { upsert: true, contentType: `image/${ext}` })

      if (uploadError) {
        Alert.alert('Upload failed', uploadError.message)
        return
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      await updateProfile({ avatar_url: url })
      setAvatarUrl(url)
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleSaveProfile() {
    setProfileError(null)
    setProfileSuccess(false)
    setSaving(true)
    const { error } = await updateProfile({
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      home_city: homeCity.trim() || null,
      favorite_taco: favoriteTaco.trim() || null,
    })
    setSaving(false)
    if (error) {
      setProfileError(error)
    } else {
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 2500)
    }
  }

  async function handleChangePassword() {
    setPasswordError(null)
    setPasswordSuccess(false)
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    setChangingPassword(true)
    const { error } = await changePassword(newPassword)
    setChangingPassword(false)
    if (error) {
      setPasswordError(error)
    } else {
      setPasswordSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 2500)
    }
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await signOut(); router.replace('/landing') } },
    ])
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and profile. Your reviews and spots will remain in the atlas. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteAccount()
            if (!error) { router.replace('/landing'); return }
            if (error) Alert.alert('Error', error)
          },
        },
      ]
    )
  }

  if (!session) {
    return (
      <View style={styles.centered}>
        <RNImage source={require('../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <Text style={styles.screenTitle}>SETTINGS</Text>
        <TouchableOpacity style={styles.upgradeCard} onPress={() => router.push('/(auth)/sign-in')}>
          <View style={styles.upgradeCardInner}>
            <Text style={styles.upgradeTitle}>Unlock TacoAtlas Pro</Text>
            <Text style={styles.upgradePrice}>$3.99 one-time</Text>
          </View>
          <Text style={styles.upgradeSubtitle}>Cloud sync · Burritos & Tortas · Mi Gente · Advanced Stats</Text>
          <View style={styles.upgradeBtn}>
            <Text style={styles.upgradeBtnText}>Sign Up & Upgrade</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.signInLink} onPress={() => router.push('/(auth)/sign-in')}>
          <Text style={styles.signInLinkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const initials = (profile?.display_name ?? session.user.email ?? '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <View style={styles.container}>
    <RNImage source={require('../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <Text style={styles.screenTitle}>SETTINGS</Text>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarWrap} onPress={handlePickAvatar} disabled={uploadingAvatar}>
          {uploadingAvatar ? (
            <ActivityIndicator color={colors.amber} />
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
          ) : (
            <Text style={styles.avatarInitials}>{initials}</Text>
          )}
          <View style={styles.avatarEdit}>
            <Ionicons name="camera" size={14} color={colors.cream} />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to change photo</Text>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PROFILE</Text>

        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={colors.creamDim}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about yourself..."
          placeholderTextColor={colors.creamDim}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Home City</Text>
        <TextInput
          style={styles.input}
          value={homeCity}
          onChangeText={setHomeCity}
          placeholder="Where are you based?"
          placeholderTextColor={colors.creamDim}
        />

        <Text style={styles.label}>Favorite Taco</Text>
        <TextInput
          style={styles.input}
          value={favoriteTaco}
          onChangeText={setFavoriteTaco}
          placeholder="e.g. Al pastor, Birria..."
          placeholderTextColor={colors.creamDim}
        />

        {profileError && <Text style={styles.errorText}>{profileError}</Text>}
        {profileSuccess && <Text style={styles.successText}>Profile saved!</Text>}

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveProfile} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.cream} size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Save Profile</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Change Password */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SECURITY</Text>

        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Min. 6 characters"
          placeholderTextColor={colors.creamDim}
          secureTextEntry
        />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat new password"
          placeholderTextColor={colors.creamDim}
          secureTextEntry
        />

        {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
        {passwordSuccess && <Text style={styles.successText}>Password updated!</Text>}

        <TouchableOpacity style={styles.primaryBtn} onPress={handleChangePassword} disabled={changingPassword}>
          {changingPassword ? (
            <ActivityIndicator color={colors.cream} size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Change Password</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Account */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <Text style={styles.accountEmail}>{session.user.email}</Text>

        <TouchableOpacity style={styles.secondaryBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color={colors.cream} />
          <Text style={styles.secondaryBtnText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerBtn} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={18} color={colors.error} />
          <Text style={styles.dangerBtnText}>Delete Account</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 48 }} />
    </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingTop: Platform.OS === 'android' ? 56 : 60,
    paddingHorizontal: spacing.md,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  upgradeCard: {
    width: '100%',
    backgroundColor: colors.amberSubtle, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.amberDim,
    marginBottom: spacing.sm,
  },
  upgradeCardInner: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: 4 },
  upgradeTitle: { fontSize: 16, fontWeight: '700', color: colors.cream },
  upgradePrice: { fontSize: 13, color: colors.amber, fontWeight: '600' },
  upgradeSubtitle: { fontSize: 12, color: colors.creamMuted, marginBottom: spacing.sm },
  upgradeBtn: {
    backgroundColor: colors.amber, borderRadius: radius.full,
    paddingVertical: 10, alignItems: 'center',
  },
  upgradeBtnText: { color: colors.cream, fontWeight: '700', fontSize: 14 },
  signInLink: { marginTop: spacing.sm, paddingVertical: spacing.sm },
  signInLinkText: { color: colors.creamMuted, fontSize: 13 },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.cream,
    letterSpacing: 2,
    marginBottom: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.amberDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.amber,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.cream,
  },
  avatarEdit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.amberDim,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  avatarHint: {
    color: colors.creamMuted,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.amber,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.creamMuted,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.cream,
    fontSize: typography.fontSizeMd,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  primaryBtn: {
    backgroundColor: colors.amber,
    borderRadius: radius.full,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  primaryBtnText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: typography.fontSizeMd,
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  secondaryBtnText: {
    color: colors.cream,
    fontWeight: '600',
    fontSize: typography.fontSizeMd,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(224, 82, 82, 0.08)',
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(224, 82, 82, 0.3)',
  },
  dangerBtnText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: typography.fontSizeMd,
  },
  accountEmail: {
    color: colors.creamMuted,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  successText: {
    color: colors.success,
    fontSize: 13,
    marginTop: spacing.sm,
  },
})
