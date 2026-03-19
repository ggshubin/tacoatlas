import Purchases, { LOG_LEVEL, PurchasesPackage } from 'react-native-purchases'
import { Platform } from 'react-native'

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ''
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? ''

export const proService = {
  configure(): void {
    const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY
    if (!apiKey) {
      console.warn('RevenueCat API key not set')
      return
    }
    Purchases.setLogLevel(LOG_LEVEL.WARN)
    Purchases.configure({ apiKey })
  },

  async isPro(): Promise<boolean> {
    try {
      const info = await Purchases.getCustomerInfo()
      return info.entitlements.active['pro'] !== undefined
    } catch {
      return false
    }
  },

  async getProPackage(): Promise<PurchasesPackage | null> {
    try {
      const offerings = await Purchases.getOfferings()
      return offerings.current?.availablePackages[0] ?? null
    } catch {
      return null
    }
  },

  async purchase(pkg: PurchasesPackage): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg)
      return customerInfo.entitlements.active['pro'] !== undefined
    } catch (e: any) {
      if (e.userCancelled) return false
      throw e
    }
  },

  async restore(): Promise<boolean> {
    try {
      const info = await Purchases.restorePurchases()
      return info.entitlements.active['pro'] !== undefined
    } catch {
      return false
    }
  },
}
