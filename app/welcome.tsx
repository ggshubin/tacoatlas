import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Switch,
  ImageBackground, ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useWelcomeStore } from '../src/store/welcomeStore'
import { ArtDropPin, ArtRate, ArtAtlas } from '../src/components/welcome/QuickStartArt'
import { colors, spacing, radius, fonts, typography } from '../src/utils/theme'

// The quick-start card. Onboarding sells the app once; this explains how to
// actually use it, and stays available every launch until the user turns it
// off — here or in Settings → App.

const STEPS = [
  {
    key: 'drop',
    Art: ArtDropPin,
    title: 'Tap + when you\'re there',
    body: 'Standing at the truck is the best time to log it. One tap drops a pin on where you are.',
  },
  {
    key: 'rate',
    Art: ArtRate,
    title: 'Rate it in a few seconds',
    body: 'Give it a score and you\'re done. Salsas, heat and notes are there when you want them — never required.',
  },
  {
    key: 'atlas',
    Art: ArtAtlas,
    title: 'Your atlas fills in',
    body: 'Every spot you log joins your map, and your crew\'s finds show up alongside them.',
  },
] as const

export default function WelcomeScreen() {
  const { showOnLaunch, setShowOnLaunch } = useWelcomeStore()
  const [enabled, setEnabled] = useState(showOnLaunch)
  const insets = useSafeAreaInsets()

  function handleToggle(value: boolean) {
    setEnabled(value)
    setShowOnLaunch(value)
  }

  function handleDone() {
    router.replace('/(tabs)/atlas')
  }

  return (
    <ImageBackground
      source={require('../assets/background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>HOW IT WORKS</Text>
        <Text style={styles.title}>Remember every spot{'\n'}worth going back to.</Text>
        <Text style={styles.subtitle}>Three steps, under a minute each.</Text>

        <View style={styles.steps}>
          {STEPS.map(({ key, Art, title, body }, i) => (
            <View key={key} style={styles.step}>
              <View style={styles.art}>
                <Art size={92} />
              </View>
              <View style={styles.stepText}>
                <Text style={styles.stepNumber}>{i + 1}</Text>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.stepBody}>{body}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.cta} onPress={handleDone} activeOpacity={0.85}>
          <Text style={styles.ctaText}>Start my atlas</Text>
        </TouchableOpacity>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Show this when I open the app</Text>
          <Switch
            value={enabled}
            onValueChange={handleToggle}
            trackColor={{ false: colors.surfaceBorder, true: colors.amberDim }}
            thumbColor={enabled ? colors.amber : colors.creamDim}
            accessibilityLabel="Show this guide when I open the app"
          />
        </View>
        <Text style={styles.toggleHint}>
          You can turn this back on any time in Profile → Settings.
        </Text>
      </ScrollView>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: spacing.lg },

  eyebrow: {
    color: colors.amber, fontSize: 11, letterSpacing: 2,
    fontWeight: typography.fontWeightBold, marginBottom: spacing.sm,
  },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.cream },
  subtitle: {
    color: colors.creamMuted, fontSize: typography.fontSizeMd,
    marginTop: spacing.xs, marginBottom: spacing.xl,
  },

  steps: { gap: spacing.lg },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  art: {
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    padding: spacing.xs,
  },
  stepText: { flex: 1, minWidth: 0 },
  stepNumber: {
    color: colors.amber, fontFamily: fonts.displayBold,
    fontSize: 13, marginBottom: 2,
  },
  stepTitle: {
    color: colors.cream, fontSize: typography.fontSizeLg,
    fontWeight: typography.fontWeightMedium,
  },
  stepBody: {
    color: colors.creamMuted, fontSize: typography.fontSizeSm,
    lineHeight: 19, marginTop: 3,
  },

  cta: {
    backgroundColor: colors.amber, borderRadius: radius.md,
    paddingVertical: spacing.md, alignItems: 'center',
    marginTop: spacing.xl,
  },
  ctaText: {
    color: colors.bg, fontSize: typography.fontSizeLg,
    fontWeight: typography.fontWeightBold,
  },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.lg, gap: spacing.md,
  },
  toggleLabel: { color: colors.cream, fontSize: typography.fontSizeMd, flex: 1 },
  toggleHint: {
    color: colors.creamDim, fontSize: typography.fontSizeSm, marginTop: spacing.xs,
  },
})
