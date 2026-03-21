import { useState } from 'react'
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import { colors, spacing, radius } from '../../src/utils/theme'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const signIn = useAuthStore(s => s.signIn)

  async function handleSignIn() {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter your email and password.')
      return
    }
    setLoading(true)
    const { error } = await signIn(email.trim().toLowerCase(), password)
    setLoading(false)
    if (error) {
      Alert.alert('Sign In Failed', error)
      return
    }
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
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.creamDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { color: colors.creamMuted, fontSize: 14 },
  link: { color: colors.amber, fontWeight: '700', fontSize: 14 },
})
