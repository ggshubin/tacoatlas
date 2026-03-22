import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, Image, StyleSheet, ActivityIndicator,
  TouchableOpacity, ScrollView,
} from 'react-native'
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps'
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
    try {
      // Location
      const coords = await locationService.getCurrentLocation()
      if (!coords) {
        setLocationDenied(true)
      } else {
        setUserCoords(coords)
        setLocationDenied(false)
      }

      // Mine: user's own saved pins from local storage
      const mine = await localStorageService.getVendors()
      setMyPins(mine.filter(v => v.lat !== 0 || v.lng !== 0))

      // Public: approved vendors from Supabase
      const pub = await vendorRepository.getNearbyVendors(
        coords?.lat ?? 0,
        coords?.lng ?? 0,
        coords ? 50 : 20000
      )
      setPublicPins(pub.filter(v => v.lat !== 0 || v.lng !== 0))

      // Friends: only if logged in
      if (session?.user.id) {
        const friends = await getFriends(session.user.id)
        if (friends.length > 0) {
          const activity = await getFriendActivity(friends.map(f => f.userId))
          setFriendPins(activity.filter(a => a.lat !== 0 && a.lng !== 0))
        } else {
          setFriendPins([])
        }
      }
    } catch {
      // silently fail — show whatever was loaded
    } finally {
      setLoading(false)
    }
  }

  const showMine = filter === 'all' || filter === 'mine'
  const showFriends = filter === 'all' || filter === 'friends'
  const showPublic = filter === 'all' || filter === 'public'

  // Compute initial region from visible pins + user location
  const visibleLats: number[] = []
  const visibleLngs: number[] = []
  if (userCoords) { visibleLats.push(userCoords.lat); visibleLngs.push(userCoords.lng) }
  if (showMine) myPins.forEach(p => { visibleLats.push(p.lat); visibleLngs.push(p.lng) })
  if (showFriends) friendPins.forEach(p => { visibleLats.push(p.lat); visibleLngs.push(p.lng) })
  if (showPublic) publicPins.forEach(p => { visibleLats.push(p.lat); visibleLngs.push(p.lng) })

  const initialRegion = visibleLats.length > 0
    ? (() => {
        const minLat = Math.min(...visibleLats), maxLat = Math.max(...visibleLats)
        const minLng = Math.min(...visibleLngs), maxLng = Math.max(...visibleLngs)
        const PADDING = 1.4
        return {
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: Math.max((maxLat - minLat) * PADDING, 0.05),
          longitudeDelta: Math.max((maxLng - minLng) * PADDING, 0.05),
        }
      })()
    : { latitude: 37.7749, longitude: -122.4194, latitudeDelta: 10, longitudeDelta: 10 }

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

  const totalVisible =
    (showMine ? myPins.length : 0) +
    (showFriends ? friendPins.length : 0) +
    (showPublic ? publicPins.length : 0)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Image source={require('../../images/tacoatlas-logo-horz.png')} style={styles.headerLogo} resizeMode="contain" />

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
                  {f.key === 'mine' ? myPins.length : f.key === 'friends' ? friendPins.length : publicPins.length}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Map */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={initialRegion}
        showsUserLocation={!locationDenied}
      >
        {/* Mine — taco icon pins */}
        {showMine && myPins.map(pin => (
          <Marker
            key={`mine-${pin.localId}`}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.tacoPin}>
              <Text style={styles.tacoPinEmoji}>🌮</Text>
            </View>
            <Callout onPress={() => router.push(`/spot/${pin.localId}`)}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{pin.name}</Text>
                {pin.spotType && <Text style={styles.calloutMeta}>{pin.spotType}</Text>}
                <Text style={styles.calloutSource}>My Pin · Tap to view</Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Friends — colored dot pins */}
        {showFriends && friendPins.map(pin => (
          <Marker
            key={`friend-${pin.id}`}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            pinColor={friendColor(pin.friend.username)}
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{pin.spotName}</Text>
                <Text style={[styles.calloutMeta, { color: friendColor(pin.friend.username) }]}>
                  @{pin.friend.username}
                </Text>
                {pin.rating !== undefined && (
                  <Text style={styles.calloutSource}>{pin.rating.toFixed(1)} tacos</Text>
                )}
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Public — blue pins */}
        {showPublic && publicPins.map(pin => (
          <Marker
            key={`public-${pin.id}`}
            coordinate={{ latitude: pin.lat!, longitude: pin.lng! }}
            pinColor="#4A9EE8"
          >
            <Callout onPress={() => router.push(`/vendor/${pin.id}`)}>
              <View style={styles.callout}>
                <Text style={styles.calloutName}>{pin.name}</Text>
                {pin.address && <Text style={styles.calloutMeta}>{pin.address}</Text>}
                <Text style={styles.calloutSource}>Public · Tap to view</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

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
  headerLogo: { height: 28, width: 160, alignSelf: 'center', marginBottom: 6 },
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

  tacoPin: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.amberSubtle, borderWidth: 2, borderColor: colors.amber,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tacoPinEmoji: { fontSize: 18 },

  callout: { padding: spacing.sm, minWidth: 130 },
  calloutName: { fontSize: 13, fontWeight: '700', color: '#18140F', marginBottom: 2 },
  calloutMeta: { fontSize: 11, color: '#7A4310', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  calloutSource: { fontSize: 11, color: '#B8A898', fontStyle: 'italic' },

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
