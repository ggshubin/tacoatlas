export type LatLng = { latitude: number; longitude: number }
export type MapboxCoord = [longitude: number, latitude: number]
export type MapboxBounds = {
  ne: MapboxCoord
  sw: MapboxCoord
}

/** Convert a react-native-maps {latitude, longitude} to a Mapbox [lng, lat] array. */
export function toMapboxCoord(point: LatLng): MapboxCoord {
  return [point.longitude, point.latitude]
}

/**
 * Compute a Mapbox-style ne/sw bounding box from a list of lat/lng points.
 * paddingDeg adds extra degrees around the edges so pins aren't clipped.
 */
export function toBoundsFromCoords(coords: LatLng[], paddingDeg = 0.01): MapboxBounds {
  const lats = coords.map(c => c.latitude)
  const lngs = coords.map(c => c.longitude)
  return {
    ne: [Math.max(...lngs) + paddingDeg, Math.max(...lats) + paddingDeg],
    sw: [Math.min(...lngs) - paddingDeg, Math.min(...lats) - paddingDeg],
  }
}

/** Approximate latitudeDelta → Mapbox zoom level conversion. */
export function deltaToZoom(latitudeDelta: number): number {
  return Math.round(Math.log2(360 / latitudeDelta))
}
