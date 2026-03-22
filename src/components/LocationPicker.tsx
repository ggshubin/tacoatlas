import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, FlatList, ActivityIndicator, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'
import { MapPinPicker } from './MapPinPicker'
import { useProStore } from '../store/proStore'

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
  const { isPro } = useProStore()
  const [method, setMethod] = useState<Method | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [taggingGps, setTaggingGps] = useState(false)
  const [searchLimitHit, setSearchLimitHit] = useState(false)

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

  async function runSearch(query: string) {
    if (query.length < 2) { setSearchResults([]); return }
    setSearching(true)
    setSearchLimitHit(false)
    try {
      const { googlePlacesService } = await import('../services/googlePlacesService')
      if (!isPro) {
        const remaining = await googlePlacesService.getRemainingSearches()
        if (remaining <= 0) {
          setSearchLimitHit(true)
          setSearchResults([])
          return
        }
      }
      const results = await googlePlacesService.searchByText(query)
      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleSearch(text: string) {
    setSearchQuery(text)
    setSearchResults([])
    setSearchLimitHit(false)
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

  if (value) {
    const locationLabel = value.address ?? (value.cityName ? value.cityName : `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`)
    return (
      <View style={styles.locationConfirmed}>
        <View style={styles.locationConfirmedIcon}>
          <Ionicons name="location" size={22} color={colors.amber} />
        </View>
        <View style={styles.locationConfirmedText}>
          <Text style={styles.locationConfirmedLabel}>Location set</Text>
          <Text style={styles.locationConfirmedAddress} numberOfLines={2}>{locationLabel}</Text>
        </View>
        <TouchableOpacity style={styles.locationRemoveBtn} onPress={() => onChange(null)}>
          <Ionicons name="close-circle" size={20} color={colors.creamDim} />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View>
      <Modal visible={showMapPicker} animationType="slide" onRequestClose={() => setShowMapPicker(false)}>
        <MapPinPicker
          onConfirm={(result) => {
            onChange(result)
            setMethod('map')
            setShowMapPicker(false)
          }}
          onCancel={() => setShowMapPicker(false)}
        />
      </Modal>

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
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search address or place name..."
              placeholderTextColor={colors.creamDim}
              value={searchQuery}
              onChangeText={handleSearch}
              onSubmitEditing={() => runSearch(searchQuery)}
              returnKeyType="search"
              autoFocus
            />
            <TouchableOpacity style={styles.searchBtn} onPress={() => runSearch(searchQuery)}>
              {searching
                ? <ActivityIndicator color={colors.cream} size="small" />
                : <Ionicons name="search" size={18} color={colors.cream} />}
            </TouchableOpacity>
          </View>
          {searchLimitHit && (
            <Text style={styles.limitText}>Daily search limit reached. Try "I'm Here" or "Drop on Map" instead.</Text>
          )}
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
  locationConfirmed: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.amberSubtle, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.amberDim,
    padding: spacing.md, marginBottom: spacing.md,
  },
  locationConfirmedIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.amberDim, flexShrink: 0,
  },
  locationConfirmedText: { flex: 1 },
  locationConfirmedLabel: { fontSize: 11, fontWeight: '700', color: colors.amber, letterSpacing: 1, marginBottom: 2 },
  locationConfirmedAddress: { fontSize: 13, color: colors.cream, lineHeight: 18 },
  locationRemoveBtn: { padding: 4 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surfaceRaised, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
    color: colors.cream, fontSize: 14,
  },
  searchBtn: {
    backgroundColor: colors.amber, borderRadius: radius.md,
    padding: spacing.sm + 2, alignItems: 'center', justifyContent: 'center',
  },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder,
  },
  resultText: { flex: 1, color: colors.cream, fontSize: 14 },
  resultAddress: { color: colors.creamMuted, fontSize: 12 },
  limitText: { color: colors.creamMuted, fontSize: 13, fontStyle: 'italic', marginTop: spacing.sm, textAlign: 'center' },
})
