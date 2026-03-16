import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { supabase } from '../src/services/supabase'
import { useAuthStore } from '../src/store/authStore'

export default function RootLayout() {
  const { setSession, loadProfile } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadProfile()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="vendor/[id]" options={{ title: 'Vendor' }} />
      <Stack.Screen name="review/add" options={{ title: 'Add Review', presentation: 'modal' }} />
    </Stack>
  )
}
