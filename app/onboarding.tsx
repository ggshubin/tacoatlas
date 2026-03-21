import { View, Text, Image, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../src/utils/theme'

const FEATURES = [
  {
    icon: 'location' as const,
    title: 'Find Tacos Near You',
    desc: 'Discover spots reviewed by real taco nerds in your area.',
  },
  {
    icon: 'map' as const,
    title: 'Build Your Atlas',
    desc: 'Track every spot you visit. Rate the tacos, salsas, and more.',
  },
  {
    icon: 'star' as const,
    title: 'Rate Like It Matters',
    desc: 'Score tacos, salsas, heat levels, and whether you\'d go back.',
  },
]

export default function OnboardingScreen() {
  async function handleGetStarted() {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true')
    router.replace('/(tabs)/atlas')
  }

  async function handleSignIn() {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true')
    router.replace('/(auth)/sign-in')
  }

  return (
    <ImageBackground
      source={require('../assets/background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Image
          source={require('../assets/taco-icon.png')}
          style={styles.heroImage}
          resizeMode="contain"
        />
        <Text style={styles.appName}>TACO ATLAS</Text>
        <Text style={styles.tagline}>The taco nerd's field guide.</Text>
      </View>

      {/* Feature list */}
      <View style={styles.features}>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name={f.icon} size={22} color={colors.amber} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* CTA */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleGetStarted}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.cream} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <View style={styles.signinRow}>
          <Text style={styles.signinText}>Already have an account? </Text>
          <TouchableOpacity onPress={handleSignIn}>
            <Text style={styles.signinLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Fine print */}
      <Text style={styles.finePrint}>
        No account needed to explore. Sign up to share your reviews.
      </Text>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },

  hero: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  heroImage: {
    width: 180,
    height: 180,
    marginBottom: spacing.sm,
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.cream,
    letterSpacing: 8,
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: 15,
    color: colors.creamMuted,
    letterSpacing: 0.5,
  },

  features: {
    gap: spacing.lg,
    marginBottom: spacing.xxl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  featureIcon: {
    width: 44,
    height: 44,
    backgroundColor: colors.amberSubtle,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.amberDim,
    flexShrink: 0,
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.cream,
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 13,
    color: colors.creamMuted,
    lineHeight: 18,
  },

  actions: { gap: spacing.md },
  primaryButton: {
    backgroundColor: colors.amber,
    borderRadius: radius.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.amber,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryButtonText: {
    color: colors.cream,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  signinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signinText: { color: colors.creamMuted, fontSize: 14 },
  signinLink: { color: colors.amber, fontWeight: '700', fontSize: 14 },

  finePrint: {
    color: colors.creamDim,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 18,
  },
})
