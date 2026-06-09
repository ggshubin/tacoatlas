import { useState } from 'react'
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/store/authStore'
import { colors, spacing, radius } from '../../src/utils/theme'

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const sendPasswordReset = useAuthStore(s => s.sendPasswordReset)

  async function handleSubmit() {
    setErrorMsg(null)
    if (!email.trim()) {
      setErrorMsg('Enter your email.')
      return
    }
    setLoading(true)
    const { error } = await sendPasswordReset(email.trim().toLowerCase())
    setLoading(false)
    if (error) {
      setErrorMsg(error)
      return
    }
    setSent(true)
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
        <Image
          source={require('../../assets/header.png')}
          style={styles.heroBanner}
          resizeMode="cover"
        />

        <View style={styles.form}>
          <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={colors.cream} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.formTitle}>Reset your password</Text>

          {sent ? (
            <View style={styles.successCard}>
              <Ionicons name="mail-outline" size={28} color={colors.amber} />
              <Text style={styles.successTitle}>Check your email</Text>
              <Text style={styles.successBody}>
                If an account exists for {email.trim().toLowerCase()}, we sent a link to reset your password. Open it on this device to continue.
              </Text>
              <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)/sign-in')}>
                <Text style={styles.buttonText}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.helper}>
                Enter the email on your account and we'll send a reset link.
              </Text>

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

              {errorMsg && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </TouchableOpacity>
            </>
          )}
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
  form: { padding: spacing.xl },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  backText: { color: colors.cream, fontSize: 14, marginLeft: 2 },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.cream,
    marginBottom: spacing.sm,
  },
  helper: { color: colors.creamMuted, fontSize: 14, marginBottom: spacing.lg },
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
  successCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    gap: spacing.sm,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.cream,
  },
  successBody: {
    color: colors.creamMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
})
