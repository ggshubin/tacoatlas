import { useState } from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import MapboxGL from '@rnmapbox/maps'
import { router } from 'expo-router'
import { toBoundsFromCoords, toMapboxCoord } from '../utils/mapboxHelpers'
import { espressoMapStyleJSON } from '../utils/mapStyle'
import { TacoPin } from './TacoPin'
import { MapCallout } from './MapCallout'
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
        styleJSON={espressoMapStyleJSON}
        logoEnabled={false}
        attributionEnabled={false}
        // TextureView on Android: SurfaceView composites on a separate hardware
        // layer and ghosts when transparent modals animate over the map
        surfaceView={false}
        onPress={() => setSelectedRow(null)}
      >
        <MapboxGL.Camera animationDuration={0} {...cameraProps} />
        <MapboxGL.UserLocation visible />

        {locatedRows.map(({ vendor, avgRating }) => (
          <MapboxGL.MarkerView
            key={vendor.localId}
            coordinate={toMapboxCoord({ latitude: vendor.lat, longitude: vendor.lng })}
            anchor={{ x: 0.5, y: 1 }}
          >
            <TouchableOpacity onPress={() => setSelectedRow({ vendor, avgRating })}>
              <TacoPin size={44} />
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
          <MapCallout
            title={selectedRow.vendor.name}
            lat={selectedRow.vendor.lat}
            lng={selectedRow.vendor.lng}
            meta={selectedRow.vendor.spotType}
            detail={
              selectedRow.avgRating !== null
                ? `${selectedRow.avgRating.toFixed(1)} tacos`
                : 'No rating yet'
            }
            bottom={80}
            onPress={() => {
              setSelectedRow(null)
              router.push(`/spot/${selectedRow.vendor.localId}`)
            }}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
