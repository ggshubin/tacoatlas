import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import * as Location from 'expo-location'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { STUB_FRIENDS, STUB_ACTIVITY } from '../../../src/data/mi-gente-stubs'
import { openMapsNavigation } from '../../../src/utils/mapsNavigation'
import { colors, spacing, radius } from '../../../src/utils/theme'

export default function FriendMapScreen() {
  const insets = useSafeAreaInsets()
  const { username } = useLocalSearchParams<{ username: string }>()
  const [locationGranted, setLocationGranted] = useState(false)

  const friend = STUB_FRIENDS.find(f => f.username === username)
  const pins = STUB_ACTIVITY.filter(a => a.friend.username === username)

  useEffect(() => {
    ;(async () => {
      // Check existing permission — do NOT request (per spec: no prompt on this screen)
      const { status } = await Location.getForegroundPermissionsAsync()
      if (status === 'granted') setLocationGranted(true)  // silently omit blue dot if denied
    })()
  }, [])

  if (!friend || pins.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.md }]}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.amber} />
          <Text style={styles.backText}>{username}</Text>
        </TouchableOpacity>
        <Text style={styles.errorText}>No pins to show.</Text>
      </View>
    )
  }

  // Center map on the midpoint of all pins
  const avgLat = pins.reduce((s, p) => s + p.lat, 0) / pins.length
  const avgLng = pins.reduce((s, p) => s + p.lng, 0) / pins.length

  const PANEL_PINS = pins.slice(0, 3)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.amber} />
          <Text style={styles.backText}>{username}</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{username}'s Pins</Text>
          <Text style={styles.subtitle}>{pins.length} spots</Text>
        </View>
      </View>

      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={{ latitude: avgLat, longitude: avgLng, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        showsUserLocation={locationGranted}
      >
        {pins.map(pin => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            title={pin.spotName}
            description={pin.type === 'reviewed' && pin.rating ? `${'★'.repeat(pin.rating)}` : 'Pinned spot'}
            pinColor={pin.type === 'reviewed' ? colors.amber : '#B37318'}
          />
        ))}
      </MapView>

      {/* Bottom panel */}
      <View style={styles.panel}>
        <Text style={styles.panelLabel}>Showing {pins.length} of {username}'s pins</Text>
        {PANEL_PINS.map(pin => (
          <View key={pin.id} style={styles.panelRow}>
            <View style={[styles.dot, pin.type === 'pinned' && styles.dotDim]} />
            <Text style={styles.panelName} numberOfLines={1}>{pin.spotName}</Text>
            <TouchableOpacity
              style={styles.goBtn}
              onPress={() => openMapsNavigation(pin.lat, pin.lng, pin.spotName)}
            >
              <Text style={styles.goBtnText}>🌮 Go</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.bg },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs },
  backText: { fontSize: 14, color: colors.amber },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  title: { fontSize: 20, fontWeight: '800', color: colors.cream },
  subtitle: { fontSize: 12, color: colors.creamMuted },
  map: { flex: 1 },
  panel: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.surfaceBorder, padding: spacing.md, paddingBottom: spacing.xl },
  panelLabel: { fontSize: 11, color: colors.creamMuted, marginBottom: spacing.sm },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber },
  dotDim: { backgroundColor: colors.amberDim },
  panelName: { flex: 1, fontSize: 12, color: colors.cream },
  goBtn: { backgroundColor: colors.amber, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  goBtnText: { fontSize: 10, fontWeight: '800', color: colors.bg },
  errorText: { color: colors.creamMuted, fontSize: 14 },
})
