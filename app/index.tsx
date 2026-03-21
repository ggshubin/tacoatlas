import { Redirect } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

export default function RootIndex() {
  const { session, hasCompletedOnboarding } = useAuthStore()
  // If user has already made a choice (signed in OR chose free), go to atlas
  if (session || hasCompletedOnboarding) {
    return <Redirect href="/(tabs)/atlas" />
  }
  return <Redirect href="/landing" />
}
