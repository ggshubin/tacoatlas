import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import MapboxGL from '@rnmapbox/maps'
import { router } from 'expo-router'
import { toBoundsFromCoords, toMapboxCoord } from '../utils/mapboxHelpers'
import { colors, spacing } from '../utils/theme'
import type { LocalVendor } from '../types/app'

interface VendorRow {
  vendor: LocalVendor
  avgRating: number | null
}

interface Props {
  rows: VendorRow[]
}

const SF_CENTER: [number, number] = [-122.4194, 37.7749]

export function AtlasMapView({ rows }: Props) {
  const [selectedRow, setSelectedRow] = useState<VendorRow | null>(null)

  const locatedRows = rows.filter(r => r.vendor.lat !== 0 || r.vendor.lng !== 0)

  const cameraProps =
    locatedRows.length > 0
      ? {
          bounds: {
            ...toBoundsFromCoords(
              locatedRows.map(r => ({ latitude: r.vendor.lat, longitude: r.vendor.lng })),
              0.01,
            ),
            paddingTop: 60,
            paddingBottom: 60,
            paddingLeft: 40,
            paddingRight: 40,
          },
        }
      : { centerCoordinate: SF_CENTER, zoomLevel: 5 }

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={StyleSheet.absoluteFillObject}
        logoEnabled={false}
        attributionEnabled={false}
        onPress={() => setSelectedRow(null)}
      >
        <MapboxGL.Camera animationDuration={0} {...cameraProps} />
        <MapboxGL.UserLocation visible />

        {locatedRows.map(({ vendor, avgRating }) => (
          <MapboxGL.MarkerView
            key={vendor.localId}
            coordinate={toMapboxCoord({ latitude: vendor.lat, longitude: vendor.lng })}
          >
            <TouchableOpacity
              onPress={() => setSelectedRow({ vendor, avgRating })}
              style={styles.tacoPin}
            >
              <Text style={styles.tacoPinEmoji}>🌮</Text>
            </TouchableOpacity>
          </MapboxGL.MarkerView>
        ))}
      </MapboxGL.MapView>

      {selectedRow && (
        <>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setSelectedRow(null)}
            activeOpacity={1}
          />
          <TouchableOpacity
            style={styles.callout}
            onPress={() => {
              setSelectedRow(null)
              router.push(`/spot/${selectedRow.vendor.localId}`)
            }}
          >
            <Text style={styles.calloutName}>{selectedRow.vendor.name}</Text>
            {selectedRow.vendor.spotType ? (
              <Text style={styles.calloutType}>{selectedRow.vendor.spotType}</Text>
            ) : null}
            <Text style={styles.calloutRating}>
              {selectedRow.avgRating !== null
                ? `${selectedRow.avgRating.toFixed(1)} tacos`
                : 'No rating yet'}
            </Text>
            <Text style={styles.calloutTap}>Tap to view</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tacoPin: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.amberSubtle,
    borderWidth: 2, borderColor: colors.amber,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  tacoPinEmoji: { fontSize: 18 },
  callout: {
    position: 'absolute',
    bottom: 80,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
  },
  calloutName: { fontSize: 14, fontWeight: '700', color: '#18140F', marginBottom: 2 },
  calloutType: { fontSize: 11, color: '#7A4310', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  calloutRating: { fontSize: 12, color: '#241C16', marginBottom: 2 },
  calloutTap: { fontSize: 11, color: '#B8A898', fontStyle: 'italic' },
})
