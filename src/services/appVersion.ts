import Constants from 'expo-constants'
import * as Updates from 'expo-updates'
import { formatVersionLabel, shortUpdateId } from '../utils/version'

// expo-application is required lazily: if a binary were ever built without
// it, the import would throw at startup. Here it only costs the build number.
function readNativeVersion(): { version: string | null; build: string | null } {
  try {
    const Application = require('expo-application') as typeof import('expo-application')
    return { version: Application.nativeApplicationVersion, build: Application.nativeBuildVersion }
  } catch (e: unknown) {
    console.warn('[version] expo-application unavailable:', e)
    return { version: null, build: null }
  }
}

export function getVersionLabel(): string {
  const { version, build } = readNativeVersion()
  return formatVersionLabel(version, build, Constants.expoConfig?.version ?? null)
}

// Null when running the bundle embedded in the store binary.
export function getOtaLabel(): string | null {
  if (Updates.isEmbeddedLaunch) return null
  return shortUpdateId(Updates.updateId)
}
