import { useState } from 'react'
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/store/authStore'
import { colors, spacing, radius } from '../../src/utils/theme'
import { passwordSchema, usernameSchema, firstError } from '../../src/utils/validation'

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSent, setResendSent] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [passwordTouched, setPasswordTouched] = useState(false)

  const { signUp, resendConfirmation } = useAuthStore()

  async function handleSignUp() {
    setErrorMsg(null)
    if (!displayName.trim() || !username.trim() || !email.trim() || !password) {
      setErrorMsg('Fill in all fields to create your account.')
      return
    }
    const usernameResult = usernameSchema.safeParse(username.trim().toLowerCase())
    if (!usernameResult.success) {
      setErrorMsg(firstError(usernameResult) ?? 'Invalid username')
      return
    }
    const pwResult = passwordSchema.safeParse(password)
    if (!pwResult.success) {
      setErrorMsg(firstError(pwResult) ?? 'Invalid password')
      return
    }
    setLoading(true)
    const { error, needsConfirmation } = await signUp(email.trim().toLowerCase(), password, displayName.trim(), username.trim().toLowerCase())
    setLoading(false)
    if (error) {
      setErrorMsg(error)
      return
    }
    if (needsConfirmation) {
      setPendingEmail(email.trim().toLowerCase())
      return
    }
    router.replace('/(tabs)/atlas')
  }

  async function handleResend() {
    if (!pendingEmail) return
    setResendLoading(true)
    setResendSent(false)
    setResendError(null)
    const { error } = await resendConfirmation(pendingEmail)
    setResendLoading(false)
    if (error) {
      setResendError(error)
    } else {
      setResendSent(true)
    }
  }

  function handleChangeEmail() {
    setPendingEmail(null)
    setResendSent(false)
  }

  // ── Confirmation pending screen ──────────────────────────────────────────
  if (pendingEmail) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Image source={require('../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
          <Image source={require('../../assets/header.png')} style={styles.heroBanner} resizeMode="cover" />

          <View style={styles.form}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="mail-outline" size={40} color={colors.amber} />
            </View>
            <Text style={styles.formTitle}>Check your inbox</Text>
            <Text style={styles.confirmBody}>
              We sent a confirmation link to:
            </Text>
            <View style={styles.emailPill}>
              <Text style={styles.emailPillText}>{pendingEmail}</Text>
            </View>
            <Text style={styles.confirmHint}>
              Open the link to activate your account, then come back and sign in.
            </Text>

            {resendError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorText}>{resendError}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, resendLoading && styles.buttonDisabled]}
              onPress={handleResend}
              disabled={resendLoading}
            >
              <Text style={styles.buttonText}>
                {resendLoading ? 'Sending...' : resendSent ? 'Email sent!' : 'Resend Email'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.changeEmailBtn} onPress={handleChangeEmail}>
              <Ionicons name="pencil-outline" size={14} color={colors.amber} />
              <Text style={styles.changeEmailText}>Change email address</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already confirmed? </Text>
              <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in')}>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  // ── Sign-up form ─────────────────────────────────────────────────────────
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
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Image
          source={require('../../assets/header.png')}
          style={styles.heroBanner}
          resizeMode="cover"
        />

        <View style={styles.form}>
          <Text style={styles.formTitle}>Create your account</Text>

          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.creamDim}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.input}
            placeholder="Username (e.g. taco_king)"
            placeholderTextColor={colors.creamDim}
            value={username}
            onChangeText={v => setUsername(v.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.creamDim}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password (min 8 characters)"
              placeholderTextColor={colors.creamDim}
              value={password}
              onChangeText={v => { setPassword(v); if (!passwordTouched) setPasswordTouched(true) }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.creamDim} />
            </TouchableOpacity>
          </View>
          {passwordTouched && (
            <Text style={[
              styles.strengthHint,
              passwordSchema.safeParse(password).success ? styles.strengthGood : styles.strengthBad,
            ]}>
              {passwordSchema.safeParse(password).success
                ? 'Strong password ✓'
                : password.length < 8
                  ? 'Too short — minimum 8 characters'
                  : 'Add a number or special character'}
            </Text>
          )}

          {errorMsg && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in')}>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flexGrow: 1 },
  heroBanner: {
    width: Dimensions.get('window').width,
    height: 220,
  },
  form: {
    padding: spacing.xl,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.cream,
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: 16,
    color: colors.cream,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.md,
  },
  passwordInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: 16,
    color: colors.cream,
  },
  eyeBtn: {
    padding: spacing.md,
  },
  button: {
    backgroundColor: colors.amber,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#3A1A1A',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: { flex: 1, color: colors.error, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { color: colors.creamMuted, fontSize: 14 },
  link: { color: colors.amber, fontWeight: '700', fontSize: 14 },
  // Confirmation screen
  confirmIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.amberSubtle,
    borderWidth: 1, borderColor: colors.amberDim,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: spacing.md,
  },
  confirmBody: {
    color: colors.creamMuted, fontSize: 14,
    textAlign: 'center', marginBottom: spacing.sm,
  },
  emailPill: {
    alignSelf: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  emailPillText: { color: colors.cream, fontWeight: '600', fontSize: 14 },
  confirmHint: {
    color: colors.creamMuted, fontSize: 13,
    textAlign: 'center', marginBottom: spacing.lg,
    lineHeight: 20,
  },
  changeEmailBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: spacing.md,
  },
  changeEmailText: { color: colors.amber, fontSize: 14, fontWeight: '600' },
  strengthHint: {
    fontSize: 12,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  strengthBad: { color: colors.error },
  strengthGood: { color: '#4CAF50' },
})
