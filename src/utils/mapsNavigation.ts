import { Linking, Platform } from 'react-native'

interface MapsUrlOptions {
  lat: number
  lng: number
  name: string
  platform?: 'ios' | 'android'
}

export function buildMapsUrl({ lat, lng, name, platform }: MapsUrlOptions): string {
  const os = platform ?? Platform.OS
  if (os === 'ios') {
    return `maps://?daddr=${lat},${lng}&q=${encodeURIComponent(name)}&dirflg=d`
  }
  return `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`
}

export async function openMapsNavigation(lat: number, lng: number, name: string): Promise<void> {
  const url = buildMapsUrl({ lat, lng, name })
  try {
    await Linking.openURL(url)
  } catch {
    // Maps app unavailable — fail silently
  }
}
