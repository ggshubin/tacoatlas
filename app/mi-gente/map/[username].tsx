import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import MapboxGL from '@rnmapbox/maps'
import { toBoundsFromCoords, toMapboxCoord } from '../../../src/utils/mapboxHelpers'
import * as Location from 'expo-location'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getFriendActivity } from '../../../src/services/miGenteService'
import { openMapsNavigation } from '../../../src/utils/mapsNavigation'
import { colors, spacing, radius } from '../../../src/utils/theme'
import type { ActivityStub } from '../../../src/data/mi-gente-stubs'

export default function FriendMapScreen() {
  const insets = useSafeAreaInsets()
  const { username, userId } = useLocalSearchParams<{ username: string; userId: string }>()
  const [locationGranted, setLocationGranted] = useState(false)
  const [pins, setPins] = useState<ActivityStub[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { status } = await Location.getForegroundPermissionsAsync()
      if (status === 'granted') setLocationGranted(true)
    })()
  }, [])

  useEffect(() => {
    if (!userId) { setLoading(false); return }
    ;(async () => {
      try {
        const data = await getFriendActivity([userId])
        setPins(data.filter(p => p.lat !== 0 && p.lng !== 0))
      } catch {
        // leave pins empty on error
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  if (loading || pins.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.md, paddingHorizontal: spacing.md }]}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={18} color={colors.amber} />
          <Text style={styles.backText}>{username}</Text>
        </TouchableOpacity>
        {loading
          ? <ActivityIndicator color={colors.amber} style={{ marginTop: spacing.xl }} />
          : <Text style={styles.errorText}>No pins to show.</Text>}
      </View>
    )
  }

  const mapBounds =
    pins.length > 1
      ? toBoundsFromCoords(
          pins.map(p => ({ latitude: p.lat, longitude: p.lng })),
          0.01,
        )
      : null

  const singleCenter: [number, number] | null =
    pins.length === 1 ? toMapboxCoord({ latitude: pins[0].lat, longitude: pins[0].lng }) : null

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
      <MapboxGL.MapView
        style={styles.map}
        logoEnabled={false}
        attributionEnabled={false}
      >
        {mapBounds ? (
          <MapboxGL.Camera
            bounds={{
              ...mapBounds,
              paddingTop: 40,
              paddingBottom: 40,
              paddingLeft: 40,
              paddingRight: 40,
            }}
            animationDuration={0}
          />
        ) : (
          <MapboxGL.Camera
            centerCoordinate={singleCenter ?? [-122.4194, 37.7749]}
            zoomLevel={14}
            animationDuration={0}
          />
        )}
        <MapboxGL.UserLocation visible={locationGranted} />
        {pins.map(pin => (
          <MapboxGL.MarkerView
            key={pin.id}
            coordinate={toMapboxCoord({ latitude: pin.lat, longitude: pin.lng })}
          >
            <View
              style={[
                styles.friendDot,
                { backgroundColor: pin.type === 'reviewed' ? colors.amber : '#B37318' },
              ]}
            />
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      {/* Bottom panel */}
      <View style={[styles.panel, { paddingBottom: spacing.md + insets.bottom }]}>
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
  panel: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.surfaceBorder, padding: spacing.md },
  panelLabel: { fontSize: 11, color: colors.creamMuted, marginBottom: spacing.sm },
  panelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber },
  dotDim: { backgroundColor: colors.amberDim },
  panelName: { flex: 1, fontSize: 12, color: colors.cream },
  goBtn: { backgroundColor: colors.amber, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  goBtnText: { fontSize: 10, fontWeight: '800', color: colors.bg },
  errorText: { color: colors.creamMuted, fontSize: 14 },
  friendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
})
