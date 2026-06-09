import { useEffect, useState } from 'react'
import { BetaBanner } from '../src/components/BetaBanner'
import { BetaFeedbackModal } from '../src/components/BetaFeedbackModal'
import { Platform, Linking } from 'react-native'
import { Stack, router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as NavigationBar from 'expo-navigation-bar'
import { supabase } from '../src/services/supabase'
import { useAuthStore } from '../src/store/authStore'
import { proService } from '../src/services/proService'
import { useProStore } from '../src/store/proStore'
import { migrateFromLegacyKeys, localStorageService } from '../src/services/localStorage'
import { getPendingRequests } from '../src/services/miGenteService'
import { useNotificationStore } from '../src/store/notificationStore'
import { registerForPushNotifications, savePushToken } from '../src/services/notificationService'
import { syncService } from '../src/services/syncService'
import { RestorePromptModal } from '../src/components/RestorePromptModal'
import { parseAuthFragment } from '../src/utils/authLinking'

async function handleAuthDeepLink(url: string) {
  if (!url.startsWith('tacooatlas://')) return
  const { accessToken, refreshToken, code, type } = parseAuthFragment(url)

  // PKCE flow (the default for supabase-js v2): the confirmation link
  // arrives as ?code=... and must be exchanged for a session. The code
  // verifier lives in AsyncStorage so this only works on the device that
  // initiated signUp / resetPasswordForEmail.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return
    if (type === 'recovery' || url.includes('/reset-password')) {
      router.replace('/(auth)/reset-password')
    } else {
      router.replace('/(tabs)/atlas')
    }
    return
  }

  // Implicit flow (legacy / explicit flowType: 'implicit'): tokens come
  // back in the URL fragment, ready to feed into setSession directly.
  if (!accessToken || !refreshToken) return

  if (type === 'recovery') {
    router.replace({
      pathname: '/(auth)/reset-password',
      params: { access_token: accessToken, refresh_token: refreshToken },
    })
    return
  }

  if (type === 'signup' || type === 'magiclink' || type === 'email_change') {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (!error) {
      router.replace('/(tabs)/atlas')
    }
  }
}

let restoreCheckDone = false

export default function RootLayout() {
  const { session, setSession, loadProfile, setHasCompletedOnboarding, setShowRestorePrompt } = useAuthStore()
  const { checkPro, isPro } = useProStore()
  const { setPendingFriendCount } = useNotificationStore()
  const [ready, setReady] = useState(false)
  const [feedbackVisible, setFeedbackVisible] = useState(false)

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setPositionAsync('absolute')
      NavigationBar.setVisibilityAsync('hidden')
      NavigationBar.setBehaviorAsync('overlay-swipe')
      NavigationBar.setBackgroundColorAsync('transparent')
    }
  }, [])

  useEffect(() => {
    proService.configure()
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
        await proService.logIn(session.user.id, session.user.email)
        checkPro()
        loadProfile()
        getPendingRequests(session.user.id).then(p => setPendingFriendCount(p.length))
        registerForPushNotifications().then(token => {
          if (token) savePushToken(session.user.id, token)
        })
        // Show restore prompt if cloud has data but local is empty
        const localCount = await localStorageService.getVendorCount()
        if (localCount === 0) {
          syncService.hasCloudData(session.user.id).then(hasData => {
            if (hasData) setShowRestorePrompt(true)
          })
        }
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
        registerForPushNotifications().then(token => {
          if (token) savePushToken(session.user.id, token)
        })
        ;(async () => {
          if (event === 'SIGNED_IN' && !restoreCheckDone) {
            restoreCheckDone = true
            await proService.logIn(session.user.id, session.user.email)
            checkPro()
            const localCount = await localStorageService.getVendorCount()
            if (localCount === 0) {
              syncService.hasCloudData(session.user.id).then(hasData => {
                if (hasData) setShowRestorePrompt(true)
              })
            }
            if (isPro) syncService.bulkSyncOnProUpgrade(session.user.id)
          }
        })()
      } else {
        restoreCheckDone = false
        setPendingFriendCount(0)
        proService.logOut()
      }
    })

    Linking.getInitialURL().then(url => {
      if (url) handleAuthDeepLink(url)
    })
    const linkingSub = Linking.addEventListener('url', ({ url }) => {
      handleAuthDeepLink(url)
    })

    return () => {
      subscription.unsubscribe()
      linkingSub.remove()
    }
  }, [])

  return (
    <>
      <Stack screenOptions={{ contentStyle: { backgroundColor: '#18140F' } }}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="landing" options={{ headerShown: false }} />
        <Stack.Screen name="spot/[localId]" options={{ headerShown: false }} />
        <Stack.Screen name="vendor/[id]" options={{ title: 'Vendor', headerStyle: { backgroundColor: '#241C16' }, headerTintColor: '#F5EDD8' }} />
        <Stack.Screen name="review/add" options={{ title: 'Add Review', presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="pin/add" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="mi-gente/add" options={{ headerShown: false }} />
        <Stack.Screen name="mi-gente/friend/[username]" options={{ headerShown: false }} />
        <Stack.Screen name="mi-gente/map/[username]" options={{ headerShown: false }} />
      </Stack>
      {ready && <RestorePromptModal />}
      <BetaBanner onPress={() => setFeedbackVisible(true)} />
      <BetaFeedbackModal
        visible={feedbackVisible}
        userId={session?.user.id}
        userEmail={session?.user.email}
        onClose={() => setFeedbackVisible(false)}
      />
    </>
  )
}
