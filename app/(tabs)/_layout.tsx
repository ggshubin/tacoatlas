import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../../src/utils/theme'
import { useNotificationStore } from '../../src/store/notificationStore'
import { tabBarHeight, tabBarPaddingBottom } from '../../src/utils/tabBar'

export default function TabsLayout() {
  const { pendingFriendCount } = useNotificationStore()
  const insets = useSafeAreaInsets()
  const isAndroid = Platform.OS === 'android'

  return (
    <Tabs
      initialRouteName="atlas"
      screenOptions={{
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.creamDim,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.surfaceBorder,
          borderTopWidth: 1,
          height: tabBarHeight(insets.bottom, isAndroid),
          paddingBottom: tabBarPaddingBottom(insets.bottom, isAndroid),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="atlas"
        options={{
          title: 'Atlas',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mi-gente"
        options={{
          title: 'Mi Gente',
          headerShown: false,
          tabBarBadge: pendingFriendCount > 0 ? pendingFriendCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.amber, color: colors.bg, fontSize: 10, minWidth: 16, height: 16, lineHeight: 16 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
