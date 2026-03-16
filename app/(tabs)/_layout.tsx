import { Tabs } from 'expo-router'
import { colors } from '../../src/utils/theme'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.terracotta,
        tabBarInactiveTintColor: colors.gray500,
        tabBarStyle: { backgroundColor: colors.cream },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Nearby', headerShown: false }} />
      <Tabs.Screen name="atlas" options={{ title: 'My Atlas', headerShown: false }} />
    </Tabs>
  )
}
