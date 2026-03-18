import { useEffect, useState } from 'react'
import { Stack, router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../src/services/supabase'
import { useAuthStore } from '../src/store/authStore'

export default function RootLayout() {
  const { setSession, loadProfile } = useAuthStore()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    async function init() {
      const [{ data: { session } }, seenOnboarding] = await Promise.all([
        supabase.auth.getSession(),
        AsyncStorage.getItem('hasSeenOnboarding'),
      ])

      setSession(session)
      if (session) loadProfile()

      if (!seenOnboarding) {
        router.replace('/onboarding')
      }
      setReady(true)
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: '#18140F' } }}>
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="spot/[localId]" options={{ headerShown: false }} />
      <Stack.Screen name="vendor/[id]" options={{ title: 'Vendor', headerStyle: { backgroundColor: '#241C16' }, headerTintColor: '#F5EDD8' }} />
      <Stack.Screen name="review/add" options={{ title: 'Add Review', presentation: 'modal', headerStyle: { backgroundColor: '#241C16' }, headerTintColor: '#F5EDD8' }} />
    </Stack>
  )
}
