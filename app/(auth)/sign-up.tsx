import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import { colors, spacing, typography, radius } from '../../src/utils/theme'

export default function SignUpScreen() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const signUp = useAuthStore(s => s.signUp)

  async function handleSignUp() {
    if (!displayName.trim() || !email.trim() || !password) {
      Alert.alert('Missing fields', 'Fill in all fields to create your account.')
      return
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.')
      return
    }
    setLoading(true)
    const { error } = await signUp(email.trim().toLowerCase(), password, displayName.trim())
    setLoading(false)
    if (error) {
      Alert.alert('Sign Up Failed', error)
      return
    }
    router.replace('/(tabs)')
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join the TacoAtlas community</Text>

        <TextInput
          style={styles.input}
          placeholder="Your name"
          placeholderTextColor={colors.gray300}
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={colors.gray300}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          placeholderTextColor={colors.gray300}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Creating account...' : 'Create Account'}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: spacing.xl, justifyContent: 'center', flexGrow: 1 },
  title: { fontSize: typography.fontSizeXxl, fontWeight: typography.fontWeightBold, color: colors.brown, marginBottom: spacing.xs },
  subtitle: { fontSize: typography.fontSizeMd, color: colors.gray500, marginBottom: spacing.xl },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: typography.fontSizeLg,
    color: colors.brown,
    borderWidth: 1,
    borderColor: colors.creamDark,
  },
  button: {
    backgroundColor: colors.terracotta,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontWeight: typography.fontWeightBold, fontSize: typography.fontSizeLg },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.lg },
  footerText: { color: colors.gray500 },
  link: { color: colors.terracotta, fontWeight: typography.fontWeightBold },
})
