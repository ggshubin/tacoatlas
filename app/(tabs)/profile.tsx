import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Switch, Linking,
} from 'react-native'
import { useFocusEffect, router } from 'expo-router'
import Constants from 'expo-constants'
import * as Updates from 'expo-updates'
import { Ionicons } from '@expo/vector-icons'
import { AppBottomSheet } from '../../src/components/AppBottomSheet'
import { useAuthStore } from '../../src/store/authStore'
import { useProStore } from '../../src/store/proStore'
import { localStorageService } from '../../src/services/localStorage'
import { proService } from '../../src/services/proService'
import { photoService } from '../../src/services/photoService'
import { getFriends } from '../../src/services/miGenteService'
import { colors, spacing, radius } from '../../src/utils/theme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { passwordSchema, firstError } from '../../src/utils/validation'

interface Stats {
  totalSpots: number
  totalVisits: number
  avgRating: number | null
  friendCount: number
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return (name.trim().slice(0, 2) || '?').toUpperCase()
}

function getOtaLabel(): string | null {
  if (Updates.isEmbeddedLaunch) return null
  const id = Updates.updateId
  if (!id) return null
  return id.replace(/-/g, '').slice(0, 8)
}

export default function ProfileScreen() {
  const { session, profile, loadProfile, updateProfile, changeEmail, changePassword } = useAuthStore()
  const { isPro, checkPro } = useProStore()
  const insets = useSafeAreaInsets()
  const [stats, setStats] = useState<Stats | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [privacySaving, setPrivacySaving] = useState(false)

  // Edit profile state
  const [editMode, setEditMode] = useState(false)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [editUsername, setEditUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Avatar state
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  // Change password state
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordDone, setPasswordDone] = useState(false)
  const [newPasswordTouched, setNewPasswordTouched] = useState(false)

  // Change email state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  useFocusEffect(
    useCallback(() => {
      async function load() {
        if (session) loadProfile()
        const [vendors, reviews, friends] = await Promise.all([
          localStorageService.getVendors(),
          localStorageService.getReviews(),
          session ? getFriends(session.user.id) : Promise.resolve([]),
        ])
        const ratings = reviews.filter(r => r.overallRating > 0).map(r => r.overallRating)
        setStats({
          totalSpots: vendors.length,
          totalVisits: reviews.length,
          avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
          friendCount: friends.length,
        })
      }
      load()
    }, [session])
  )

  function startEdit() {
    setEditDisplayName(profile?.display_name ?? '')
    setEditUsername(profile?.username ?? '')
    setEditError(null)
    setEditMode(true)
  }

  function cancelEdit() {
    setEditMode(false)
    setEditError(null)
  }

  async function handleSaveProfile() {
    setEditError(null)
    const trimmedUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!trimmedUsername) {
      setEditError('Username cannot be empty.')
      return
    }
    setSaving(true)
    const { error } = await updateProfile({
      display_name: editDisplayName.trim() || null,
      username: trimmedUsername,
    })
    setSaving(false)
    if (error) {
      setEditError(error)
    } else {
      setEditMode(false)
    }
  }

  async function handlePickAvatar(source: 'library' | 'camera') {
    if (!session) return
    setShowAvatarPicker(false)
    setAvatarError(null)
    const uri = source === 'library'
      ? await photoService.pickFromLibrary()
      : await photoService.takePhoto()
    if (!uri) return
    setAvatarUploading(true)
    try {
      const url = await photoService.uploadAvatar(uri, session.user.id)
      const { error } = await updateProfile({ avatar_url: url })
      if (error) {
        setAvatarError(error)
        Alert.alert('Avatar Error', error)
      }
    } catch (e: any) {
      const msg = e?.message ?? 'Upload failed'
      setAvatarError(msg)
      Alert.alert('Avatar Upload Error', msg)
    } finally {
      setAvatarUploading(false)
    }
  }

  function openPasswordModal() {
    setNewPassword('')
    setConfirmPassword('')
    setShowNewPw(false)
    setShowConfirmPw(false)
    setPasswordError(null)
    setPasswordDone(false)
    setNewPasswordTouched(false)
    setShowPasswordModal(true)
  }

  async function handleChangePassword() {
    setPasswordError(null)
    const pwResult = passwordSchema.safeParse(newPassword)
    if (!pwResult.success) {
      setPasswordError(firstError(pwResult))
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    setPasswordSaving(true)
    const { error } = await changePassword(newPassword)
    setPasswordSaving(false)
    if (error) {
      setPasswordError(error)
    } else {
      setPasswordDone(true)
    }
  }

  function openEmailModal() {
    setNewEmail('')
    setEmailError(null)
    setEmailSent(false)
    setShowEmailModal(true)
  }

  async function handleChangeEmail() {
    setEmailError(null)
    const trimmed = newEmail.trim().toLowerCase()
    if (!trimmed.includes('@')) {
      setEmailError('Enter a valid email address.')
      return
    }
    setEmailSending(true)
    const { error } = await changeEmail(trimmed)
    setEmailSending(false)
    if (error) {
      setEmailError(error)
    } else {
      setEmailSent(true)
    }
  }

  async function handleSignOut() {
    const { signOut } = useAuthStore.getState()
    await signOut()
    router.replace('/landing')
  }

  async function handlePrivacyToggle(
    field: 'is_profile_public' | 'is_name_public' | 'are_reviews_public',
    value: boolean,
  ) {
    setPrivacySaving(true)
    await updateProfile({ [field]: value })
    setPrivacySaving(false)
  }

  return (
    <View style={styles.container}>
      <Image source={require('../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Image source={require('../../images/tacoatlas-logo-horz.png')} style={styles.headerLogo} resizeMode="contain" />
        <Text style={styles.title}>Profile</Text>

        {/* Identity card */}
        <View style={styles.identityCard}>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => session && setShowAvatarPicker(true)}
            disabled={avatarUploading}
            activeOpacity={0.8}
          >
            {avatarUploading ? (
              <ActivityIndicator color={colors.amber} size="small" />
            ) : profile?.avatar_url ? (
              <>
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                <View style={styles.avatarOverlay}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              </>
            ) : (
              <>
                {session ? (
                  <Text style={styles.avatarInitials}>
                    {getInitials(profile?.display_name || profile?.username || session.user.email?.split('@')[0] || '?')}
                  </Text>
                ) : (
                  <Ionicons name="person" size={32} color={colors.amber} />
                )}
                {session && (
                  <View style={styles.avatarOverlay}>
                    <Ionicons name="camera" size={14} color="#fff" />
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
          {session ? (
            editMode ? (
              <View style={styles.editFields}>
                <TextInput
                  style={styles.editInput}
                  value={editDisplayName}
                  onChangeText={setEditDisplayName}
                  placeholder="Display name"
                  placeholderTextColor={colors.creamDim}
                  autoCapitalize="words"
                />
                <View style={styles.usernameRow}>
                  <Text style={styles.atSign}>@</Text>
                  <TextInput
                    style={[styles.editInput, { flex: 1 }]}
                    value={editUsername}
                    onChangeText={setEditUsername}
                    placeholder="username"
                    placeholderTextColor={colors.creamDim}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {editError && <Text style={styles.fieldError}>{editError}</Text>}
                <View style={styles.editActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={cancelEdit} disabled={saving}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving}>
                    {saving
                      ? <ActivityIndicator color={colors.cream} size="small" />
                      : <Text style={styles.saveBtnText}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.identityInfo}>
                  <Text style={styles.displayName}>{profile?.display_name ?? session.user.email?.split('@')[0] ?? 'Taco Lover'}</Text>
                  {profile?.username && <Text style={styles.username}>@{profile.username}</Text>}
                  <Text style={styles.accountType}>{isPro ? '✦ Pro Member' : 'Free Account'}</Text>
                </View>
                <TouchableOpacity style={styles.editIconBtn} onPress={startEdit}>
                  <Ionicons name="pencil-outline" size={18} color={colors.amber} />
                </TouchableOpacity>
              </>
            )
          ) : (
            <View style={styles.identityInfo}>
              <Text style={styles.displayName}>Guest</Text>
              <Text style={styles.accountType}>No account — your data stays local</Text>
            </View>
          )}
        </View>
        {avatarError && <Text style={styles.avatarError}>{avatarError}</Text>}

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            {stats ? (
              <>
                <Text style={styles.statNumber}>{stats.totalSpots}</Text>
                <Text style={styles.statLabel}>Spots</Text>
              </>
            ) : <ActivityIndicator color={colors.amber} />}
          </View>
          <View style={styles.statCard}>
            {stats ? (
              <>
                <Text style={styles.statNumber}>{stats.totalVisits}</Text>
                <Text style={styles.statLabel}>Visits</Text>
              </>
            ) : <ActivityIndicator color={colors.amber} />}
          </View>
          <View style={styles.statCard}>
            {stats ? (
              <>
                <Text style={styles.statNumber}>{stats.avgRating != null ? stats.avgRating.toFixed(1) : '—'}</Text>
                <Text style={styles.statLabel}>Avg Rating</Text>
              </>
            ) : <ActivityIndicator color={colors.amber} />}
          </View>
          {session && (
            <View style={styles.statCard}>
              {stats ? (
                <>
                  <Text style={styles.statNumber}>{stats.friendCount}</Text>
                  <Text style={styles.statLabel}>Crew</Text>
                </>
              ) : <ActivityIndicator color={colors.amber} />}
            </View>
          )}
        </View>

        {/* Pro upgrade card */}
        {!isPro && (
          <TouchableOpacity
            style={styles.upgradeCard}
            disabled={purchasing}
            onPress={async () => {
              setPurchasing(true)
              try {
                const pkg = await proService.getProPackage()
                if (pkg) {
                  const success = await proService.purchase(pkg)
                  if (success) await checkPro()
                }
              } finally {
                setPurchasing(false)
              }
            }}
          >
            <View style={styles.upgradeCardInner}>
              <Text style={styles.upgradeTitle}>Unlock TacoAtlas Pro</Text>
              <Text style={styles.upgradePrice}>$3.99 one-time</Text>
            </View>
            <Text style={styles.upgradeSubtitle}>Cloud sync · Burritos & Tortas · Mi Gente · Advanced Stats</Text>
            <View style={styles.upgradeBtn}>
              <Text style={styles.upgradeBtnText}>{purchasing ? 'Processing…' : 'Upgrade Now'}</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Account section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {session ? (
            <View style={styles.card}>
              {/* Email row */}
              <View style={[styles.accountRow, styles.accountRowBorder]}>
                <Ionicons name="mail-outline" size={18} color={colors.creamMuted} />
                <View style={styles.accountRowText}>
                  <Text style={styles.accountLabel}>{session.user.email}</Text>
                  <Text style={styles.accountSub}>Current email</Text>
                </View>
                <TouchableOpacity style={styles.changeBtn} onPress={openEmailModal}>
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
              {/* Password row */}
              <View style={[styles.accountRow, styles.accountRowBorder]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.creamMuted} />
                <View style={styles.accountRowText}>
                  <Text style={styles.accountLabel}>Password</Text>
                  <Text style={styles.accountSub}>••••••••</Text>
                </View>
                <TouchableOpacity style={styles.changeBtn} onPress={openPasswordModal}>
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
              {/* Sign out row */}
              <TouchableOpacity style={styles.accountRow} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={18} color={colors.error} />
                <Text style={[styles.accountLabel, { color: colors.error }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.signInCard} onPress={() => router.push('/(auth)/sign-in')}>
              <Ionicons name="cloud-upload-outline" size={22} color={colors.amber} />
              <View style={styles.signInCardText}>
                <Text style={styles.signInTitle}>Back up your atlas</Text>
                <Text style={styles.signInSubtitle}>Create an account to sync across devices</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.creamDim} />
            </TouchableOpacity>
          )}
        </View>

        {/* App section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App</Text>
          <View style={styles.card}>
            <View style={[styles.accountRow, getOtaLabel() ? styles.accountRowBorder : undefined]}>
              <Ionicons name="information-circle-outline" size={18} color={colors.creamMuted} />
              <View style={styles.accountRowText}>
                <Text style={styles.accountLabel}>TacoAtlas v{Constants.expoConfig?.version ?? '1.3.0'}</Text>
                <Text style={styles.accountSub}>App version</Text>
              </View>
            </View>
            {getOtaLabel() && (
              <View style={styles.accountRow}>
                <Ionicons name="cloud-download-outline" size={18} color={colors.creamMuted} />
                <View style={styles.accountRowText}>
                  <Text style={styles.accountLabel}>OTA {getOtaLabel()}</Text>
                  <Text style={styles.accountSub}>
                    Over-the-air update{Updates.createdAt ? ` · ${Updates.createdAt.toLocaleDateString()}` : ''}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Legal section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.accountRow, styles.accountRowBorder]}
              onPress={() => Linking.openURL('https://tacoatlas.app/terms')}
            >
              <Ionicons name="document-text-outline" size={18} color={colors.creamMuted} />
              <Text style={[styles.accountLabel, { flex: 1 }]}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.creamDim} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.accountRow}
              onPress={() => Linking.openURL('https://tacoatlas.app/privacy')}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.creamMuted} />
              <Text style={[styles.accountLabel, { flex: 1 }]}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.creamDim} />
            </TouchableOpacity>
          </View>
        </View>

        {session && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy</Text>
            <View style={styles.card}>
              <View style={[styles.accountRow, styles.accountRowBorder]}>
                <Ionicons name="eye-outline" size={18} color={colors.creamMuted} />
                <View style={styles.accountRowText}>
                  <Text style={styles.accountLabel}>Public Profile</Text>
                  <Text style={styles.accountSub}>Let others find and view your profile</Text>
                </View>
                <Switch
                  value={profile?.is_profile_public ?? true}
                  onValueChange={(v) => handlePrivacyToggle('is_profile_public', v)}
                  disabled={privacySaving}
                  trackColor={{ false: colors.surfaceBorder, true: colors.amberDim }}
                  thumbColor={profile?.is_profile_public ? colors.amber : colors.creamMuted}
                  ios_backgroundColor={colors.surfaceBorder}
                />
              </View>
              <View style={[styles.accountRow, styles.accountRowBorder]}>
                <Ionicons name="person-outline" size={18} color={colors.creamMuted} />
                <View style={styles.accountRowText}>
                  <Text style={styles.accountLabel}>Show Display Name</Text>
                  <Text style={styles.accountSub}>Others see your name instead of @username</Text>
                </View>
                <Switch
                  value={profile?.is_name_public ?? true}
                  onValueChange={(v) => handlePrivacyToggle('is_name_public', v)}
                  disabled={privacySaving}
                  trackColor={{ false: colors.surfaceBorder, true: colors.amberDim }}
                  thumbColor={profile?.is_name_public ? colors.amber : colors.creamMuted}
                  ios_backgroundColor={colors.surfaceBorder}
                />
              </View>
              <View style={styles.accountRow}>
                <Ionicons name="star-outline" size={18} color={colors.creamMuted} />
                <View style={styles.accountRowText}>
                  <Text style={styles.accountLabel}>Public Reviews</Text>
                  <Text style={styles.accountSub}>Allow your reviews to appear in friends' feeds</Text>
                </View>
                <Switch
                  value={profile?.are_reviews_public ?? true}
                  onValueChange={(v) => handlePrivacyToggle('are_reviews_public', v)}
                  disabled={privacySaving}
                  trackColor={{ false: colors.surfaceBorder, true: colors.amberDim }}
                  thumbColor={profile?.are_reviews_public ? colors.amber : colors.creamMuted}
                  ios_backgroundColor={colors.surfaceBorder}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <AppBottomSheet
        visible={showAvatarPicker}
        title="Change Profile Photo"
        options={[
          { label: 'Choose from Library', icon: 'images-outline', onPress: () => handlePickAvatar('library') },
          { label: 'Take Photo', icon: 'camera-outline', onPress: () => handlePickAvatar('camera') },
          ...(profile?.avatar_url ? [{
            label: 'Remove Photo',
            icon: 'trash-outline' as const,
            destructive: true,
            onPress: async () => {
              setAvatarUploading(true)
              await updateProfile({ avatar_url: null })
              setAvatarUploading(false)
            },
          }] : []),
        ]}
        onClose={() => setShowAvatarPicker(false)}
      />

      {/* Change password modal */}
      <Modal visible={showPasswordModal} transparent animationType="fade" onRequestClose={() => setShowPasswordModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            {passwordDone ? (
              <>
                <View style={styles.modalSuccessIcon}>
                  <Ionicons name="checkmark-circle" size={36} color={colors.amber} />
                </View>
                <Text style={styles.modalTitle}>Password updated</Text>
                <Text style={styles.modalBody}>Your password has been changed successfully.</Text>
                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setShowPasswordModal(false)}>
                  <Text style={styles.modalPrimaryBtnText}>Done</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Change Password</Text>
                <Text style={styles.modalBody}>Enter a new password (min 8 characters).</Text>
                <View style={styles.pwInputWrap}>
                  <TextInput
                    style={styles.pwInput}
                    value={newPassword}
                    onChangeText={v => { setNewPassword(v); if (!newPasswordTouched) setNewPasswordTouched(true) }}
                    placeholder="New password"
                    placeholderTextColor={colors.creamDim}
                    secureTextEntry={!showNewPw}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.pwEyeBtn} onPress={() => setShowNewPw(v => !v)}>
                    <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.creamDim} />
                  </TouchableOpacity>
                </View>
                {newPasswordTouched && (
                  <Text style={{
                    fontSize: 12,
                    marginTop: -4,
                    marginBottom: spacing.sm,
                    marginLeft: 2,
                    color: passwordSchema.safeParse(newPassword).success ? '#4CAF50' : colors.error,
                  }}>
                    {passwordSchema.safeParse(newPassword).success
                      ? 'Strong password ✓'
                      : newPassword.length < 8
                        ? 'Too short — minimum 8 characters'
                        : 'Add a number or special character'}
                  </Text>
                )}
                <View style={[styles.pwInputWrap, { marginBottom: spacing.sm }]}>
                  <TextInput
                    style={styles.pwInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.creamDim}
                    secureTextEntry={!showConfirmPw}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity style={styles.pwEyeBtn} onPress={() => setShowConfirmPw(v => !v)}>
                    <Ionicons name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.creamDim} />
                  </TouchableOpacity>
                </View>
                {passwordError && (
                  <View style={styles.modalError}>
                    <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                    <Text style={styles.modalErrorText}>{passwordError}</Text>
                  </View>
                )}
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowPasswordModal(false)} disabled={passwordSaving}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleChangePassword} disabled={passwordSaving}>
                    {passwordSaving
                      ? <ActivityIndicator color={colors.cream} size="small" />
                      : <Text style={styles.modalPrimaryBtnText}>Update</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change email modal */}
      <Modal visible={showEmailModal} transparent animationType="fade" onRequestClose={() => setShowEmailModal(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            {emailSent ? (
              <>
                <View style={styles.modalSuccessIcon}>
                  <Ionicons name="checkmark-circle" size={36} color={colors.amber} />
                </View>
                <Text style={styles.modalTitle}>Check your inbox</Text>
                <Text style={styles.modalBody}>
                  A verification link was sent to{' '}
                  <Text style={styles.modalHighlight}>{newEmail.trim().toLowerCase()}</Text>
                  . Your email will update once you click it.
                </Text>
                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setShowEmailModal(false)}>
                  <Text style={styles.modalPrimaryBtnText}>Done</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Change Email</Text>
                <Text style={styles.modalBody}>Enter your new email. We'll send a verification link to confirm.</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="New email address"
                  placeholderTextColor={colors.creamDim}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {emailError && (
                  <View style={styles.modalError}>
                    <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                    <Text style={styles.modalErrorText}>{emailError}</Text>
                  </View>
                )}
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEmailModal(false)} disabled={emailSending}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleChangeEmail} disabled={emailSending}>
                    {emailSending
                      ? <ActivityIndicator color={colors.cream} size="small" />
                      : <Text style={styles.modalPrimaryBtnText}>Send Link</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  headerLogo: { height: 28, width: 160, alignSelf: 'center', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '800', color: colors.cream, letterSpacing: -0.5 },

  identityCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.surfaceBorder,
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.amberSubtle, borderWidth: 1, borderColor: colors.amberDim,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    overflow: 'hidden',
  },
  avatarImage: { width: 56, height: 56, borderRadius: 28 },
  avatarInitials: { fontSize: 20, fontWeight: '700', color: colors.amber, letterSpacing: 0.5 },
  avatarOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarError: { fontSize: 11, color: colors.error, marginTop: 4, flexShrink: 1 },
  // Bottom sheet picker
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetCard: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    borderWidth: 1, borderColor: colors.surfaceBorder, paddingTop: spacing.md, paddingBottom: spacing.xl + 8,
    paddingHorizontal: spacing.md,
  },
  sheetTitle: { fontSize: 13, fontWeight: '700', color: colors.creamDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm, textAlign: 'center' },
  sheetOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 4, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder },
  sheetOptionText: { fontSize: 15, color: colors.cream, fontWeight: '500' },
  sheetCancel: { marginTop: spacing.sm, paddingVertical: spacing.sm + 4, alignItems: 'center' },
  sheetCancelText: { fontSize: 15, color: colors.creamMuted, fontWeight: '600' },
  identityInfo: { flex: 1 },
  editFields: { flex: 1, gap: spacing.sm },
  editInput: {
    backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.surfaceBorder, paddingHorizontal: spacing.sm,
    paddingVertical: 8, fontSize: 14, color: colors.cream,
  },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  atSign: { fontSize: 14, color: colors.amber, fontWeight: '700' },
  fieldError: { fontSize: 12, color: colors.error },
  editActions: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.full, borderWidth: 1, borderColor: colors.surfaceBorder, alignItems: 'center' },
  cancelBtnText: { fontSize: 13, color: colors.creamMuted, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.amber, alignItems: 'center' },
  saveBtnText: { fontSize: 13, color: colors.cream, fontWeight: '700' },
  editIconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.amberSubtle, borderWidth: 1, borderColor: colors.amberDim,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  displayName: { fontSize: 17, fontWeight: '700', color: colors.cream },
  username: { fontSize: 13, color: colors.amber, fontWeight: '600', marginTop: 1 },
  accountType: { fontSize: 12, color: colors.creamMuted, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderRadius: radius.md,
    padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  statNumber: { fontSize: 22, fontWeight: '800', color: colors.cream },
  statLabel: { fontSize: 11, color: colors.creamMuted, marginTop: 2 },

  upgradeCard: {
    backgroundColor: colors.amberSubtle, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.amberDim, marginBottom: spacing.md,
  },
  upgradeCardInner: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: 4 },
  upgradeTitle: { fontSize: 16, fontWeight: '700', color: colors.cream },
  upgradePrice: { fontSize: 13, color: colors.amber, fontWeight: '600' },
  upgradeSubtitle: { fontSize: 12, color: colors.creamMuted, marginBottom: spacing.sm },
  upgradeBtn: { backgroundColor: colors.amber, borderRadius: radius.full, paddingVertical: 10, alignItems: 'center' },
  upgradeBtnText: { color: colors.cream, fontWeight: '700', fontSize: 14 },

  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.creamDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.surfaceBorder },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2 },
  accountRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder },
  accountRowText: { flex: 1 },
  accountLabel: { fontSize: 14, color: colors.cream },
  accountSub: { fontSize: 11, color: colors.creamMuted, marginTop: 2 },
  changeBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, borderWidth: 1, borderColor: colors.amberDim, backgroundColor: colors.amberSubtle },
  changeBtnText: { fontSize: 12, color: colors.amber, fontWeight: '700' },

  signInCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  signInCardText: { flex: 1 },
  signInTitle: { fontSize: 15, fontWeight: '700', color: colors.cream },
  signInSubtitle: { fontSize: 12, color: colors.creamMuted, marginTop: 2 },

  pwInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.sm,
  },
  pwInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 14,
    color: colors.cream,
  },
  pwEyeBtn: {
    padding: spacing.sm,
  },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
  modalCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surfaceBorder, padding: spacing.lg },
  modalSuccessIcon: { alignItems: 'center', marginBottom: spacing.sm },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.cream, marginBottom: spacing.sm },
  modalBody: { fontSize: 14, color: colors.creamMuted, marginBottom: spacing.md, lineHeight: 20 },
  modalHighlight: { color: colors.cream, fontWeight: '600' },
  modalInput: {
    backgroundColor: colors.bg, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.surfaceBorder, paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2, fontSize: 14, color: colors.cream, marginBottom: spacing.sm,
  },
  modalError: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  modalErrorText: { fontSize: 12, color: colors.error, flex: 1 },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.full, borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surfaceRaised, alignItems: 'center' },
  modalCancelText: { color: colors.cream, fontWeight: '600', fontSize: 14 },
  modalPrimaryBtn: { flex: 1, paddingVertical: 12, borderRadius: radius.full, backgroundColor: colors.amber, alignItems: 'center' },
  modalPrimaryBtnText: { color: colors.cream, fontWeight: '700', fontSize: 14 },
})
