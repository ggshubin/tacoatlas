import React from 'react'
import { View } from 'react-native'

const noop = () => undefined

const MapView = React.forwardRef<View, { children?: React.ReactNode; testID?: string }>(
  ({ children, testID }, ref) =>
    React.createElement(View, { testID: testID ?? 'mapbox-mapview', ref }, children)
)
MapView.displayName = 'MapboxMapView'

const Camera = (_props: object) => null
Camera.displayName = 'MapboxCamera'

const MarkerView = ({ children }: { children?: React.ReactNode }) =>
  React.createElement(View, { testID: 'mapbox-marker' }, children)
MarkerView.displayName = 'MapboxMarkerView'

const UserLocation = () => null
UserLocation.displayName = 'MapboxUserLocation'

const mock = {
  MapView,
  Camera,
  MarkerView,
  UserLocation,
  setAccessToken: noop,
  StyleURL: { Street: 'mapbox://styles/mapbox/streets-v12' },
}

export default mock
export const { setAccessToken, StyleURL } = mock
export { MapView, Camera, MarkerView, UserLocation }
