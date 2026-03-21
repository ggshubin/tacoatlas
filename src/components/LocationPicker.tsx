import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'
import { MapPinPicker } from './MapPinPicker'

export interface LocationResult {
  lat: number
  lng: number
  address: string | null
  cityName: string | null
}

interface Props {
  value: LocationResult | null
  onChange: (location: LocationResult | null) => void
}

type Method = 'gps' | 'search' | 'map'

export function LocationPicker({ value, onChange }: Props) {
  const [method, setMethod] = useState<Method | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [taggingGps, setTaggingGps] = useState(false)

  async function handleGps() {
    setTaggingGps(true)
    try {
      const Location = await import('expo-location')
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const pos = await Location.getCurrentPositionAsync({})
      let cityName: string | null = null
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude, longitude: pos.coords.longitude,
        })
        cityName = results[0]?.city ?? null
      } catch {}
      onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude, address: null, cityName })
      setMethod('gps')
    } finally {
      setTaggingGps(false)
    }
  }

  async function handleSearch(text: string) {
    setSearchQuery(text)
    if (text.length < 3) { setSearchResults([]); return }
    setSearching(true)
    try {
      const { googlePlacesService } = await import('../services/googlePlacesService')
      const results = await googlePlacesService.searchByText(text)
      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleSelectPlace(place: any) {
    onChange({
      lat: place.lat,
      lng: place.lng,
      address: place.address ?? null,
      cityName: place.city ?? null,
    })
    setSearchQuery(place.name)
    setSearchResults([])
    setMethod('search')
  }

  if (showMapPicker) {
    return (
      <MapPinPicker
        onConfirm={(result) => {
          onChange(result)
          setMethod('map')
          setShowMapPicker(false)
        }}
        onCancel={() => setShowMapPicker(false)}
      />
    )
  }

  if (value) {
    return (
      <TouchableOpacity style={styles.mapSnapshot} onPress={() => onChange(null)}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          region={{ latitude: value.lat, longitude: value.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
          scrollEnabled={false} zoomEnabled={false} rotateEnabled={false}
          pitchEnabled={false} userInterfaceStyle="dark" pointerEvents="none"
        >
          <Marker coordinate={{ latitude: value.lat, longitude: value.lng }} />
        </MapView>
        <View style={styles.snapshotBadge}>
          <Ionicons name="location" size={14} color={colors.cream} />
          <Text style={styles.snapshotBadgeText}>Location tagged — tap to remove</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View>
      <View style={styles.methodRow}>
        <TouchableOpacity style={styles.methodTile} onPress={handleGps} disabled={taggingGps}>
          {taggingGps ? <ActivityIndicator color={colors.amber} /> : <Ionicons name="locate" size={22} color={colors.amber} />}
          <Text style={styles.methodLabel}>I'm Here</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.methodTile} onPress={() => setMethod('search')}>
          <Ionicons name="search" size={22} color={colors.amber} />
          <Text style={styles.methodLabel}>Search</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.methodTile} onPress={() => setShowMapPicker(true)}>
          <Ionicons name="map" size={22} color={colors.amber} />
          <Text style={styles.methodLabel}>Drop on Map</Text>
        </TouchableOpacity>
      </View>

      {method === 'search' && (
        <View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search address or place name..."
            placeholderTextColor={colors.creamDim}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searching && <ActivityIndicator color={colors.amber} style={{ marginTop: spacing.sm }} />}
          {searchResults.map((place, i) => (
            <TouchableOpacity key={i} style={styles.resultRow} onPress={() => handleSelectPlace(place)}>
              <Ionicons name="location-outline" size={16} color={colors.amber} />
              <Text style={styles.resultText}>{place.name}</Text>
              {place.address ? <Text style={styles.resultAddress}>{place.address}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  methodRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  methodTile: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.surfaceRaised, borderRadius: radius.md,
    paddingVertical: spacing.md, gap: 6, borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  methodLabel: { fontSize: 11, color: colors.creamMuted, fontWeight: '600' },
  mapSnapshot: { height: 140, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.md },
  snapshotBadge: {
    position: 'absolute', bottom: spacing.sm, left: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(24,20,15,0.85)',
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full,
  },
  snapshotBadgeText: { color: colors.cream, fontSize: 12 },
  searchInput: {
    backgroundColor: colors.surfaceRaised, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    color: colors.cream, fontSize: 14, marginBottom: spacing.sm,
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
  },
  resultText: { flex: 1, color: colors.cream, fontSize: 14 },
  resultAddress: { color: colors.creamMuted, fontSize: 12 },
})
