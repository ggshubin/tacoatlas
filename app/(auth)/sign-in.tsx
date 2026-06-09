import { useState, useEffect, useRef } from 'react'
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/store/authStore'
import { colors, spacing, radius } from '../../src/utils/theme'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [countdown, setCountdown] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const signIn = useAuthStore(s => s.signIn)

  useEffect(() => {
    if (lockedUntil === null) return
    const tick = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
      if (remaining <= 0) {
        setLockedUntil(null)
        setFailedAttempts(0)
        setCountdown(0)
        if (countdownRef.current) clearInterval(countdownRef.current)
      } else {
        setCountdown(remaining)
      }
    }
    tick()
    countdownRef.current = setInterval(tick, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [lockedUntil])

  async function handleSignIn() {
    setErrorMsg(null)

    if (lockedUntil !== null && Date.now() < lockedUntil) return

    if (!email.trim() || !password) {
      setErrorMsg('Enter your email and password.')
      return
    }
    setLoading(true)
    const { error } = await signIn(email.trim().toLowerCase(), password)
    setLoading(false)

    if (error) {
      const next = failedAttempts + 1
      setFailedAttempts(next)
      if (next >= 5) {
        setLockedUntil(Date.now() + 30_000)
        setErrorMsg('Too many attempts. Try again in 30 seconds.')
      } else {
        setErrorMsg(error)
      }
      return
    }

    setFailedAttempts(0)
    setLockedUntil(null)
    router.replace('/(tabs)/atlas')
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
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Hero banner */}
        <Image
          source={require('../../assets/header.png')}
          style={styles.heroBanner}
          resizeMode="cover"
        />

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome back</Text>

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
              placeholder="Password"
              placeholderTextColor={colors.creamDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.creamDim} />
            </TouchableOpacity>
          </View>

          {errorMsg && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={colors.error} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, (loading || lockedUntil !== null) && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading || lockedUntil !== null}
          >
            <Text style={styles.buttonText}>
              {loading
                ? 'Signing in...'
                : lockedUntil !== null
                  ? `Try again in ${countdown}s`
                  : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotRow}
            onPress={() => router.push('/(auth)/forgot-password')}
          >
            <Text style={styles.link}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>No account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
              <Text style={styles.link}>Sign Up</Text>
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
  forgotRow: { alignItems: 'center', marginTop: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { color: colors.creamMuted, fontSize: 14 },
  link: { color: colors.amber, fontWeight: '700', fontSize: 14 },
})
