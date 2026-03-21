import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { router } from 'expo-router'
import { colors, spacing, radius, typography } from '../src/utils/theme'
import { useAuthStore } from '../src/store/authStore'

export default function LandingScreen() {
  function handleSignIn() {
    router.push('/(auth)/sign-in')
  }

  function handleContinueFree() {
    useAuthStore.getState().setHasCompletedOnboarding(true)
    router.replace('/(tabs)/atlas')
  }

  return (
    <View style={styles.container}>
      <Image source={require('../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
      <View style={styles.content}>
        <Text style={styles.appName}>TacoAtlas</Text>
        <Text style={styles.tagline}>Stop forgetting where the good tacos are.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSignIn}>
          <Text style={styles.primaryBtnText}>Sign In / Create Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={handleContinueFree}>
          <Text style={styles.ghostBtnText}>Continue without account</Text>
        </TouchableOpacity>
        <Text style={styles.legal}>
          By continuing you agree to our{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.cream,
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 16,
    color: colors.creamMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 52,
    gap: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.amber,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.cream,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ghostBtn: {
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  ghostBtnText: {
    color: colors.creamMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  legal: {
    color: colors.creamDim,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  legalLink: { color: colors.amber },
})
