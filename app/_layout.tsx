import { useEffect, useState } from 'react'
import { Platform } from 'react-native'
import { Stack, router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as NavigationBar from 'expo-navigation-bar'
import { supabase } from '../src/services/supabase'
import { useAuthStore } from '../src/store/authStore'
import { proService } from '../src/services/proService'
import { useProStore } from '../src/store/proStore'
import { migrateFromLegacyKeys } from '../src/services/localStorage'
import { getPendingRequests } from '../src/services/miGenteService'
import { useNotificationStore } from '../src/store/notificationStore'
import { syncService } from '../src/services/syncService'

export default function RootLayout() {
  const { setSession, loadProfile, setHasCompletedOnboarding } = useAuthStore()
  const { checkPro, isPro } = useProStore()
  const { setPendingFriendCount } = useNotificationStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden')
      NavigationBar.setBehaviorAsync('overlay-swipe')
    }
  }, [])

  useEffect(() => {
    proService.configure()
    // DEV: checkPro() bypassed — isPro hardcoded to true in proStore
    // checkPro()
  }, [])

  useEffect(() => {
    async function init() {
      const [{ data: { session } }, seenOnboarding, storedOnboarding] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem('hasSeenOnboarding'),
        AsyncStorage.getItem('has_completed_onboarding'),
      ])

      setSession(session)
      await migrateFromLegacyKeys()
      if (session) {
        loadProfile()
        getPendingRequests(session.user.id).then(p => setPendingFriendCount(p.length))
        syncService.restoreFromCloud(session.user.id)
        if (isPro) {
          console.log('[sync] bulkSyncOnProUpgrade triggered on startup for', session.user.id)
          syncService.bulkSyncOnProUpgrade(session.user.id)
        }
      }

      // Hydrate hasCompletedOnboarding from AsyncStorage
      if (storedOnboarding === 'true') {
        await setHasCompletedOnboarding(true)
      }

      if (!seenOnboarding) {
        router.replace('/onboarding')
      } else if (session || storedOnboarding === 'true') {
        // Replace any stale /landing entry that index.tsx may have pushed before session loaded
        router.replace('/(tabs)/atlas')
      } else {
        router.replace('/landing')
      }
      setReady(true)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (session) {
        loadProfile()
        getPendingRequests(session.user.id).then(p => setPendingFriendCount(p.length))
        if (event === 'SIGNED_IN' && isPro) {
          syncService.bulkSyncOnProUpgrade(session.user.id)
        }
      } else {
        setPendingFriendCount(0)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: '#18140F' } }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="landing" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="spot/[localId]" options={{ headerShown: false }} />
      <Stack.Screen name="vendor/[id]" options={{ title: 'Vendor', headerStyle: { backgroundColor: '#241C16' }, headerTintColor: '#F5EDD8' }} />
      <Stack.Screen name="review/add" options={{ title: 'Add Review', presentation: 'modal', headerStyle: { backgroundColor: '#241C16' }, headerTintColor: '#F5EDD8' }} />
      <Stack.Screen name="pin/add" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="mi-gente/add" options={{ headerShown: false }} />
      <Stack.Screen name="mi-gente/friend/[username]" options={{ headerShown: false }} />
      <Stack.Screen name="mi-gente/map/[username]" options={{ headerShown: false }} />
    </Stack>
  )
}
