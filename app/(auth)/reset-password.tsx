import { useEffect, useState } from 'react'
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../src/services/supabase'
import { colors, spacing, radius } from '../../src/utils/theme'

export default function ResetPasswordScreen() {
  const { access_token, refresh_token } = useLocalSearchParams<{
    access_token?: string
    refresh_token?: string
  }>()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    async function establishSession() {
      if (!access_token || !refresh_token) {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
          setSessionReady(true)
        } else {
          setErrorMsg('This reset link is invalid or has expired. Request a new one.')
        }
        return
      }
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      })
      if (error) {
        setErrorMsg('This reset link is invalid or has expired. Request a new one.')
        return
      }
      setSessionReady(true)
    }
    establishSession()
  }, [access_token, refresh_token])

  async function handleSubmit() {
    setErrorMsg(null)
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setErrorMsg(error.message)
      return
    }
    setDone(true)
  }

  function goToAtlas() {
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
        <Image
          source={require('../../assets/header.png')}
          style={styles.heroBanner}
          resizeMode="cover"
        />

        <View style={styles.form}>
          <Text style={styles.formTitle}>Choose a new password</Text>

          {done ? (
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle-outline" size={32} color={colors.amber} />
              <Text style={styles.successTitle}>Password updated</Text>
              <Text style={styles.successBody}>
                You're signed in with your new password.
              </Text>
              <TouchableOpacity style={styles.button} onPress={goToAtlas}>
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          ) : !sessionReady && !errorMsg ? (
            <Text style={styles.helper}>Verifying your reset link...</Text>
          ) : !sessionReady ? (
            <>
              {errorMsg && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace('/(auth)/forgot-password')}
              >
                <Text style={styles.buttonText}>Request a new link</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="New password"
                  placeholderTextColor={colors.creamDim}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="password-new"
                />
                <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.creamDim} />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                placeholderTextColor={colors.creamDim}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={!showPassword}
                autoComplete="password-new"
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
                  {loading ? 'Saving...' : 'Save Password'}
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
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.cream,
    marginBottom: spacing.lg,
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
  eyeBtn: { padding: spacing.md },
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
