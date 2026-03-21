import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { Stack, router } from 'expo-router'
import { colors, spacing, radius, typography } from '../src/utils/theme'
import { useAuthStore } from '../src/store/authStore'

export default function SettingsScreen() {
  const { session, signOut } = useAuthStore()

  async function handleSignOut() {
    await signOut()
    router.replace('/landing')
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Settings',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.cream,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {session ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.card}>
              <Text style={styles.email}>{session.user.email}</Text>
              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Account</Text>
            <View style={styles.card}>
              <Text style={styles.guestText}>Browsing as guest</Text>
              <TouchableOpacity
                style={styles.signInBtn}
                onPress={() => router.push('/(auth)/sign-in')}
              >
                <Text style={styles.signInText}>Sign In / Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>About</Text>
          <View style={styles.card}>
            <Text style={styles.aboutText}>TacoAtlas v1.0</Text>
          </View>
        </View>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.creamDim,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: spacing.md,
  },
  email: { color: colors.cream, fontSize: 15 },
  guestText: { color: colors.creamMuted, fontSize: 15 },
  signOutBtn: {
    backgroundColor: colors.amberSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  signOutText: { color: colors.amber, fontWeight: '600' },
  signInBtn: {
    backgroundColor: colors.amber,
    borderRadius: radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  signInText: { color: colors.cream, fontWeight: '700' },
  aboutText: { color: colors.creamMuted, fontSize: 14 },
})
