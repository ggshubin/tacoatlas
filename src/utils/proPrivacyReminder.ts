import AsyncStorage from '@react-native-async-storage/async-storage'

export const PRO_PRIVACY_REMINDER_KEY = 'proPrivacyReminderShown'

interface ReminderParams {
  wasPro: boolean
  isPro: boolean
  privateSpotCount: number
  alreadyShown: boolean
}

/** One-time reminder: fires only on the false→true Pro transition,
 *  when the user has private spots and hasn't seen it before. */
export function shouldShowProPrivacyReminder(params: ReminderParams): boolean {
  const { wasPro, isPro, privateSpotCount, alreadyShown } = params
  return !wasPro && isPro && privateSpotCount > 0 && !alreadyShown
}

export async function getReminderShown(): Promise<boolean> {
  return (await AsyncStorage.getItem(PRO_PRIVACY_REMINDER_KEY)) === 'true'
}

export async function setReminderShown(): Promise<void> {
  await AsyncStorage.setItem(PRO_PRIVACY_REMINDER_KEY, 'true')
}
