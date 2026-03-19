import MapView, { Marker, Callout } from 'react-native-maps'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { colors, spacing, radius } from '../utils/theme'
import type { LocalVendor } from '../types/app'

interface VendorRow {
  vendor: LocalVendor
  avgRating: number | null
}

interface Props {
  rows: VendorRow[]
}

function ratingColor(rating: number | null): string {
  if (rating === null) return colors.creamMuted
  if (rating >= 4) return colors.amber
  if (rating >= 2.5) return '#E8C21A'
  return colors.error
}

export function AtlasMapView({ rows }: Props) {
  const hasLocations = rows.some(r => r.vendor.lat !== 0 || r.vendor.lng !== 0)

  const initialRegion = hasLocations
    ? {
        latitude: rows[0].vendor.lat,
        longitude: rows[0].vendor.lng,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      }
    : {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 10,
        longitudeDelta: 10,
      }

  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      initialRegion={initialRegion}
      userInterfaceStyle="dark"
    >
      {rows.map(({ vendor, avgRating }) => (
        <Marker
          key={vendor.localId}
          coordinate={{ latitude: vendor.lat, longitude: vendor.lng }}
          pinColor={ratingColor(avgRating)}
        >
          <Callout onPress={() => router.push(`/spot/${vendor.localId}`)}>
            <View style={styles.callout}>
              <Text style={styles.calloutName}>{vendor.name}</Text>
              {vendor.spotType && (
                <Text style={styles.calloutType}>{vendor.spotType}</Text>
              )}
              <Text style={styles.calloutRating}>
                {avgRating !== null ? `${avgRating.toFixed(1)} tacos` : 'No rating yet'}
              </Text>
              <Text style={styles.calloutTap}>Tap to view</Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </MapView>
  )
}

const styles = StyleSheet.create({
  callout: {
    padding: spacing.sm,
    minWidth: 140,
  },
  calloutName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#18140F',
    marginBottom: 2,
  },
  calloutType: {
    fontSize: 11,
    color: '#7A4310',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  calloutRating: {
    fontSize: 12,
    color: '#241C16',
    marginBottom: 2,
  },
  calloutTap: {
    fontSize: 11,
    color: '#B8A898',
    fontStyle: 'italic',
  },
})
