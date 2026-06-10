import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps'
import { View, Text, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { colors, spacing } from '../utils/theme'
import type { LocalVendor } from '../types/app'

interface VendorRow {
  vendor: LocalVendor
  avgRating: number | null
}

interface Props {
  rows: VendorRow[]
}

export function AtlasMapView({ rows }: Props) {
  const locatedRows = rows.filter(r => r.vendor.lat !== 0 || r.vendor.lng !== 0)

  const initialRegion = locatedRows.length > 0
    ? (() => {
        const lats = locatedRows.map(r => r.vendor.lat)
        const lngs = locatedRows.map(r => r.vendor.lng)
        const minLat = Math.min(...lats), maxLat = Math.max(...lats)
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
        const PADDING = 1.4
        return {
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: Math.max((maxLat - minLat) * PADDING, 0.01),
          longitudeDelta: Math.max((maxLng - minLng) * PADDING, 0.01),
        }
      })()
    : {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 10,
        longitudeDelta: 10,
      }

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={StyleSheet.absoluteFillObject}
      initialRegion={initialRegion}
    >
      {rows.map(({ vendor, avgRating }) => (
        <Marker
          key={vendor.localId}
          coordinate={{ latitude: vendor.lat, longitude: vendor.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.tacoPin}>
            <Text style={styles.tacoPinEmoji}>🌮</Text>
          </View>
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
  tacoPin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.amberSubtle,
    borderWidth: 2,
    borderColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tacoPinEmoji: {
    fontSize: 18,
  },
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
