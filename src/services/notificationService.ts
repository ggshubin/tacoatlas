import * as Device from 'expo-device'
import { Platform } from 'react-native'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { supabase } from './supabase'

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient

let Notifications: typeof import('expo-notifications') | null = null

if (!isExpoGo) {
  Notifications = require('expo-notifications')
  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (isExpoGo || !Notifications) return null
  if (!Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('friend-requests', {
      name: 'Friend Requests',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  const tokenData = await Notifications.getExpoPushTokenAsync()
  return tokenData.data
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token, updated_at: new Date().toISOString() })
}

export async function sendFriendRequestNotification(
  addresseeId: string,
  requesterUsername: string
): Promise<void> {
  const session = (await supabase.auth.getSession()).data.session
  if (!session) return

  await supabase.functions.invoke('send-friend-notification', {
    body: { addresseeId, requesterUsername },
  })
}
