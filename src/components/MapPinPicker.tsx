import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'
import type { LocationResult } from './LocationPicker'

interface Props {
  onConfirm: (result: LocationResult) => void
  onCancel: () => void
}

export function MapPinPicker({ onConfirm, onCancel }: Props) {
  const [region, setRegion] = useState({
    latitude: 32.7157,
    longitude: -117.1611,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  })
  const [resolving, setResolving] = useState(false)

  async function handleConfirm() {
    setResolving(true)
    let cityName: string | null = null
    try {
      const Location = await import('expo-location')
      const results = await Location.reverseGeocodeAsync({
        latitude: region.latitude, longitude: region.longitude,
      })
      cityName = results[0]?.city ?? null
    } catch {}
    onConfirm({
      lat: region.latitude,
      lng: region.longitude,
      address: null,
      cityName,
    })
    setResolving(false)
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation
      />
      <View style={styles.crosshairContainer} pointerEvents="none">
        <Ionicons name="location" size={40} color={colors.amber} />
      </View>
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Ionicons name="close" size={20} color={colors.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Move map to the spot</Text>
        <View style={{ width: 36 }} />
      </View>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={resolving}>
          {resolving
            ? <ActivityIndicator color={colors.cream} />
            : <Text style={styles.confirmText}>Set This Spot</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  crosshairContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  header: {
    position: 'absolute', top: 56, left: spacing.md, right: spacing.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  cancelBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(24,20,15,0.85)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    color: colors.cream, fontSize: 14, fontWeight: '600',
    backgroundColor: 'rgba(24,20,15,0.7)',
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.full,
  },
  footer: {
    position: 'absolute', bottom: 48, left: spacing.lg, right: spacing.lg,
  },
  confirmBtn: {
    backgroundColor: colors.amber,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmText: { color: colors.cream, fontWeight: '700', fontSize: 16 },
})
