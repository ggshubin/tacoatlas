import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, Image, StyleSheet, ActivityIndicator,
  TouchableOpacity, ScrollView,
} from 'react-native'
import MapboxGL from '@rnmapbox/maps'
import { toBoundsFromCoords, toMapboxCoord } from '../../src/utils/mapboxHelpers'
import { espressoMapStyleJSON } from '../../src/utils/mapStyle'
import { TacoPin } from '../../src/components/TacoPin'
import { SpotDot } from '../../src/components/SpotDot'
import { MapCallout } from '../../src/components/MapCallout'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/authStore'
import { locationService } from '../../src/services/locationService'
import { localStorageService } from '../../src/services/localStorage'
import { vendorRepository } from '../../src/services/vendorRepository'
import { getFriends, getFriendActivity } from '../../src/services/miGenteService'
import { colors, spacing, radius } from '../../src/utils/theme'
import type { LocalVendor } from '../../src/types/app'
import type { Vendor } from '../../src/types/database'
import type { ActivityStub } from '../../src/data/mi-gente-stubs'

type Filter = 'all' | 'mine' | 'friends' | 'public'

interface Coords { lat: number; lng: number }

const FRIEND_PIN_COLORS = ['#E05C2A', '#2A7BE0', '#2ABF6F', '#B82AE0', '#E0B82A']
function friendColor(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return FRIEND_PIN_COLORS[Math.abs(hash) % FRIEND_PIN_COLORS.length]
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets()
  const { session } = useAuthStore()
  const [filter, setFilter] = useState<Filter>('all')
  type SelectedPin =
    | { kind: 'mine'; pin: (typeof myPins)[0] }
    | { kind: 'friend'; pin: (typeof friendPins)[0] }
    | { kind: 'public'; pin: (typeof publicPins)[0] }
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null)
  const [loading, setLoading] = useState(true)
  const [locationDenied, setLocationDenied] = useState(false)
  const [userCoords, setUserCoords] = useState<Coords | null>(null)
  const [myPins, setMyPins] = useState<LocalVendor[]>([])
  const [friendPins, setFriendPins] = useState<ActivityStub[]>([])
  const [publicPins, setPublicPins] = useState<Vendor[]>([])

  useFocusEffect(
    useCallback(() => {
      loadAll()
    }, [session?.user.id])
  )

  async function loadAll() {
    setLoading(true)

    // Phase 1: instant — last known location (cached by OS) + local pins
    const [lastCoords, mine] = await Promise.all([
      locationService.getLastKnownLocation(),
      localStorageService.getVendors(),
    ])

    if (lastCoords) setUserCoords(lastCoords)
    setMyPins(mine.filter(v => v.lat !== 0 || v.lng !== 0))
    setLoading(false) // map appears immediately

    // Phase 2: fresh GPS fix — updates user dot position once acquired
    const freshCoords = await locationService.getCurrentLocation()
    if (!freshCoords) {
      setLocationDenied(true)
    } else {
      setUserCoords(freshCoords)
      setLocationDenied(false)
    }

    // Phase 3: remote data — background, updates pins as they arrive
    const coordsForQuery = freshCoords ?? lastCoords
    try {
      const pub = await vendorRepository.getNearbyVendors(
        coordsForQuery?.lat ?? 0,
        coordsForQuery?.lng ?? 0,
        coordsForQuery ? 50 : 20000
      )
      setPublicPins(pub.filter(v => v.lat !== 0 || v.lng !== 0))
    } catch { /* silent */ }

    if (session?.user.id) {
      try {
        const friends = await getFriends(session.user.id)
        if (friends.length > 0) {
          const activity = await getFriendActivity(friends.map(f => f.userId))
          setFriendPins(activity.filter(a => a.lat !== 0 && a.lng !== 0))
        } else {
          setFriendPins([])
        }
      } catch { /* silent */ }
    }
  }

  const showMine = filter === 'all' || filter === 'mine'
  const showFriends = filter === 'all' || filter === 'friends'
  const showPublic = filter === 'all' || filter === 'public'

  // User's own pins that are marked public — appear under both Mine and Public filters
  const myPublicPins = myPins.filter(p => !p.privacy || p.privacy === 'public')

  // Compute initial region from visible pins + user location
  const visibleLats: number[] = []
  const visibleLngs: number[] = []
  if (userCoords) { visibleLats.push(userCoords.lat); visibleLngs.push(userCoords.lng) }
  if (showMine) myPins.forEach(p => { visibleLats.push(p.lat); visibleLngs.push(p.lng) })
  if (showFriends) friendPins.forEach(p => { visibleLats.push(p.lat); visibleLngs.push(p.lng) })
  if (showPublic) {
    publicPins.forEach(p => { visibleLats.push(p.lat!); visibleLngs.push(p.lng!) })
    // Include user's public pins in region calc when Mine isn't already shown
    if (!showMine) myPublicPins.forEach(p => { visibleLats.push(p.lat); visibleLngs.push(p.lng) })
  }

  const initialCameraProps = (() => {
    if (visibleLats.length === 0) {
      return { centerCoordinate: [-122.4194, 37.7749] as [number, number], zoomLevel: 5 }
    }
    const coords = visibleLats.map((lat, i) => ({ latitude: lat, longitude: visibleLngs[i] }))
    return {
      bounds: {
        ...toBoundsFromCoords(coords, 0.02),
        paddingTop: 80,
        paddingBottom: 120,
        paddingLeft: 40,
        paddingRight: 40,
      },
    }
  })()

  const FILTERS: { key: Filter; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'globe-outline' },
    { key: 'mine', label: 'Mine', icon: 'person-outline' },
    { key: 'friends', label: 'Friends', icon: 'people-outline' },
    { key: 'public', label: 'Public', icon: 'earth-outline' },
  ]

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.amber} />
        <Text style={styles.loadingText}>Loading pins...</Text>
      </View>
    )
  }

  if (locationDenied && myPins.length === 0 && friendPins.length === 0 && publicPins.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="location-outline" size={48} color={colors.creamDim} />
        <Text style={styles.emptyTitle}>Location needed</Text>
        <Text style={styles.emptySubtext}>Enable location in Settings to explore spots near you.</Text>
      </View>
    )
  }

  // When both Mine and Public are visible (filter === 'all'), deduplicate public pins
  // that would otherwise be counted twice (once as myPins, once as myPublicPins)
  const totalVisible =
    (showMine ? myPins.length : 0) +
    (showFriends ? friendPins.length : 0) +
    (showPublic ? publicPins.length + (showMine ? 0 : myPublicPins.length) : 0)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Ionicons name={f.icon as any} size={13} color={filter === f.key ? colors.bg : colors.creamMuted} />
              <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
              {f.key !== 'all' && (
                <Text style={[styles.filterCount, filter === f.key && styles.filterCountActive]}>
                  {f.key === 'mine' ? myPins.length : f.key === 'friends' ? friendPins.length : myPublicPins.length + publicPins.length}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Map */}
      <MapboxGL.MapView
        style={StyleSheet.absoluteFillObject}
        styleJSON={espressoMapStyleJSON}
        logoEnabled={false}
        attributionEnabled={false}
        // TextureView on Android: SurfaceView composites on a separate hardware
        // layer and ghosts when transparent modals animate over the map
        surfaceView={false}
        onPress={() => setSelectedPin(null)}
      >
        <MapboxGL.Camera animationDuration={0} {...initialCameraProps} />
        <MapboxGL.UserLocation visible={!locationDenied} />

        {/* Mine — taco pins */}
        {showMine && myPins.map(pin => (
          <MapboxGL.MarkerView
            key={`mine-${pin.localId}`}
            coordinate={toMapboxCoord({ latitude: pin.lat, longitude: pin.lng })}
            anchor={{ x: 0.5, y: 1 }}
          >
            <TouchableOpacity onPress={() => setSelectedPin({ kind: 'mine', pin })}>
              <TacoPin size={40} />
            </TouchableOpacity>
          </MapboxGL.MarkerView>
        ))}

        {/* Friends — dot locators, ringed in the friend's color, icon = spot type */}
        {showFriends && friendPins.map(pin => (
          <MapboxGL.MarkerView
            key={`friend-${pin.id}`}
            coordinate={toMapboxCoord({ latitude: pin.lat, longitude: pin.lng })}
          >
            <TouchableOpacity onPress={() => setSelectedPin({ kind: 'friend', pin })}>
              <SpotDot
                kind="friend"
                spotType={pin.spotType}
                color={friendColor(pin.friend.username)}
              />
            </TouchableOpacity>
          </MapboxGL.MarkerView>
        ))}

        {/* Public — muted community dot locators */}
        {showPublic && publicPins.map(pin => (
          <MapboxGL.MarkerView
            key={`public-${pin.id}`}
            coordinate={toMapboxCoord({ latitude: pin.lat!, longitude: pin.lng! })}
          >
            <TouchableOpacity onPress={() => setSelectedPin({ kind: 'public', pin })}>
              <SpotDot kind="public" spotType={pin.spot_type} />
            </TouchableOpacity>
          </MapboxGL.MarkerView>
        ))}

        {/* Public view of user's own public pins (when Mine filter is off) */}
        {showPublic && !showMine && myPublicPins.map(pin => (
          <MapboxGL.MarkerView
            key={`mine-pub-${pin.localId}`}
            coordinate={toMapboxCoord({ latitude: pin.lat, longitude: pin.lng })}
            anchor={{ x: 0.5, y: 1 }}
          >
            <TouchableOpacity onPress={() => setSelectedPin({ kind: 'mine', pin })}>
              <TacoPin size={40} />
            </TouchableOpacity>
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      {selectedPin && (
        <>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setSelectedPin(null)}
            activeOpacity={1}
          />
          <MapCallout
            title={selectedPin.kind === 'friend' ? selectedPin.pin.spotName : selectedPin.pin.name}
            lat={selectedPin.pin.lat ?? undefined}
            lng={selectedPin.pin.lng ?? undefined}
            meta={
              selectedPin.kind === 'mine'
                ? selectedPin.pin.spotType ?? 'My pin'
                : selectedPin.kind === 'friend'
                  ? `@${selectedPin.pin.friend.username}`
                  : selectedPin.pin.address ?? 'Community spot'
            }
            metaColor={
              selectedPin.kind === 'friend'
                ? friendColor(selectedPin.pin.friend.username)
                : undefined
            }
            detail={
              selectedPin.kind === 'friend'
                ? selectedPin.pin.rating != null
                  ? `${selectedPin.pin.rating.toFixed(1)} tacos`
                  : null
                : selectedPin.kind === 'mine'
                  ? 'My pin · Tap to view'
                  : 'Public · Tap to view'
            }
            bottom={120}
            onPress={() => {
              if (selectedPin.kind === 'mine') {
                router.push(`/spot/${selectedPin.pin.localId}`)
              } else if (selectedPin.kind === 'public') {
                router.push(`/vendor/${selectedPin.pin.id}`)
              }
              setSelectedPin(null)
            }}
          />
        </>
      )}

      {/* Pin count badge */}
      <View style={[styles.countBadge, { top: insets.top + 96 }]}>
        <Text style={styles.countText}>{totalVisible} pin{totalVisible !== 1 ? 's' : ''}</Text>
      </View>

      {/* Empty state overlay */}
      {totalVisible === 0 && (
        <View style={styles.emptyOverlay}>
          <Ionicons name="map-outline" size={36} color={colors.creamDim} />
          <Text style={styles.emptyOverlayText}>No pins for this filter</Text>
          {filter === 'friends' && !session && (
            <Text style={styles.emptyOverlaySub}>Sign in to see friends' pins</Text>
          )}
          {filter === 'mine' && myPins.length === 0 && (
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/review/add')}>
              <Text style={styles.addBtnText}>+ Add Your First Spot</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg, padding: spacing.xl },
  loadingText: { color: colors.creamMuted, fontSize: 14, marginTop: spacing.sm },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.cream, marginTop: spacing.md, marginBottom: spacing.xs },
  emptySubtext: { fontSize: 13, color: colors.creamMuted, textAlign: 'center' },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    zIndex: 10,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: 2 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 5,
  },
  filterChipActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.creamMuted },
  filterChipTextActive: { color: colors.bg },
  filterCount: { fontSize: 10, fontWeight: '700', color: colors.creamDim, backgroundColor: colors.surfaceRaised, borderRadius: 6, paddingHorizontal: 4, overflow: 'hidden' },
  filterCountActive: { color: colors.amber, backgroundColor: 'rgba(0,0,0,0.15)' },

  countBadge: {
    position: 'absolute', right: spacing.md,
    backgroundColor: 'rgba(36,28,22,0.85)', borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  countText: { fontSize: 11, color: colors.creamMuted, fontWeight: '600' },

  emptyOverlay: {
    position: 'absolute', bottom: 80, left: spacing.xl, right: spacing.xl,
    backgroundColor: 'rgba(28,22,18,0.9)', borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    padding: spacing.lg, alignItems: 'center', gap: spacing.sm,
  },
  emptyOverlayText: { fontSize: 14, fontWeight: '600', color: colors.creamMuted },
  emptyOverlaySub: { fontSize: 12, color: colors.creamDim, textAlign: 'center' },
  addBtn: { backgroundColor: colors.amber, borderRadius: radius.full, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  addBtnText: { fontSize: 13, fontWeight: '700', color: colors.bg },
})
