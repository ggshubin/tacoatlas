# Google Maps → Mapbox Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `react-native-maps` (Google Maps provider) with `@rnmapbox/maps` across all 4 map screens, keeping the existing Google Places API for location search untouched.

**Architecture:** Remove `react-native-maps` and install `@rnmapbox/maps` with its Expo config plugin. The 4 affected files migrate from `MapView/Marker/Callout` to `MapboxGL.MapView/MarkerView/Camera`. Callouts become a local `selectedPin` state + an absolutely-positioned card overlay, since Mapbox has no built-in `Callout` component. A shared `src/utils/mapboxHelpers.ts` centralizes the critical coordinate format conversion: react-native-maps uses `{latitude, longitude}` objects; Mapbox GeoJSON uses `[longitude, latitude]` arrays (reversed order — this is the #1 source of bugs in this migration).

**Tech Stack:** `@rnmapbox/maps` v10, Expo config plugin, EAS with `MAPBOX_DOWNLOADS_TOKEN` secret (required for iOS builds to download the Mapbox iOS SDK)

**Do NOT remove** `android/google-services.json` — it is used for Firebase/FCM (push notifications), not for Google Maps.

---

## File Map

| Action | File | What changes |
|--------|------|--------------|
| Create | `src/utils/mapboxHelpers.ts` | Coordinate conversion + bounds utilities |
| Create | `src/utils/__tests__/mapboxHelpers.test.ts` | Tests for helpers |
| Create | `src/__mocks__/@rnmapbox/maps.ts` | Jest mock |
| Modify | `package.json` | Remove react-native-maps, add @rnmapbox/maps |
| Modify | `app.json` | Add Mapbox plugin, remove googleMaps config block |
| Modify | `android/app/src/main/AndroidManifest.xml` | Remove Google Maps API key meta-data |
| Modify | `app/_layout.tsx` | Add `MapboxGL.setAccessToken(...)` at module level |
| Rewrite | `src/components/AtlasMapView.tsx` | Mapbox components, selectedPin callout |
| Rewrite | `src/components/MapPinPicker.tsx` | Mapbox MapView, onMapIdle for center tracking |
| Rewrite | `app/(tabs)/explore.tsx` | Mapbox MapView, 4 pin types, selectedPin callout |
| Rewrite | `app/mi-gente/map/[username].tsx` | Mapbox MapView, MarkerView pins |
| Modify | `jest.config.js` (package.json jest section) | Add @rnmapbox/maps to moduleNameMapper |

---

## Task 1: Get Your Mapbox Tokens (Manual — No Code)

**Files:** `.env.local`, `.env.example`

- [ ] **Step 1: Create/log in to a Mapbox account**
  Go to https://account.mapbox.com

- [ ] **Step 2: Copy your default public token**
  Under "Access tokens", copy the default public token (starts with `pk.`). This will be `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`.

- [ ] **Step 3: Create a secret download token**
  Click "Create a token" → name it "TacoAtlas EAS" → enable the **Downloads:Read** scope only → Save. Copy it (starts with `sk.`). This is `MAPBOX_DOWNLOADS_TOKEN`.

- [ ] **Step 4: Add both to .env.local**
  ```
  EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_public_token_here
  MAPBOX_DOWNLOADS_TOKEN=sk.your_secret_token_here
  ```

- [ ] **Step 5: Add the public key placeholder to .env.example**
  Open `.env.example` and add:
  ```
  EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=
  ```
  Never commit the secret token (`sk.*`) to any file.

---

## Task 2: Swap Dependencies & Update Native Configuration

**Files:** `package.json`, `app.json`, `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: Remove react-native-maps**
  ```bash
  npx expo uninstall react-native-maps
  ```

- [ ] **Step 2: Install @rnmapbox/maps**
  ```bash
  npx expo install @rnmapbox/maps
  ```

- [ ] **Step 3: Add the Mapbox Expo plugin and remove the googleMaps config block from app.json**

  Open `app.json`. Make two changes:

  **Remove** the entire `"config"` block inside `"android"`:
  ```json
  "config": {
    "googleMaps": {
      "apiKey": "AIzaSyDvWs4orTUGdsKhu195FUWldN0OosGSrqQ"
    }
  }
  ```

  **Add** to the existing `"plugins"` array (after the last existing plugin):
  ```json
  ["@rnmapbox/maps", {
    "RNMapboxMapsDownloadToken": "MAPBOX_DOWNLOADS_TOKEN"
  }]
  ```
  The string `"MAPBOX_DOWNLOADS_TOKEN"` is the EAS secret name — the plugin reads it from EAS secrets at build time.

  The `plugins` array after the change:
  ```json
  "plugins": [
    "expo-updates",
    "expo-router",
    "expo-location",
    ["expo-image-picker", {
      "photosPermission": "TacoAtlas needs photo access to attach images to your reviews."
    }],
    ["expo-notifications", {
      "icon": "./assets/taco-icon.png",
      "color": "#F5A623",
      "androidMode": "default"
    }],
    ["@rnmapbox/maps", {
      "RNMapboxMapsDownloadToken": "MAPBOX_DOWNLOADS_TOKEN"
    }]
  ]
  ```

- [ ] **Step 4: Remove the Google Maps API key from AndroidManifest.xml**

  Open `android/app/src/main/AndroidManifest.xml`. Delete this line (around line 19):
  ```xml
  <meta-data android:name="com.google.android.geo.API_KEY" android:value="AIzaSyDvWs4orTUGdsKhu195FUWldN0OosGSrqQ"/>
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add package.json app.json android/app/src/main/AndroidManifest.xml .env.example
  git commit -m "chore: swap react-native-maps for @rnmapbox/maps, remove Google Maps API key"
  ```

---

## Task 3: Create Shared Mapbox Utilities

Mapbox uses `[longitude, latitude]` arrays (GeoJSON order, reversed from react-native-maps). Centralizing this conversion in one file prevents scattered transposition bugs.

**Files:**
- Create: `src/utils/mapboxHelpers.ts`
- Create: `src/utils/__tests__/mapboxHelpers.test.ts`

- [ ] **Step 1: Write the failing tests**

  Create `src/utils/__tests__/mapboxHelpers.test.ts`:
  ```typescript
  import { toMapboxCoord, toBoundsFromCoords, deltaToZoom } from '../mapboxHelpers'

  describe('toMapboxCoord', () => {
    it('returns [longitude, latitude] — note reversed order vs react-native-maps', () => {
      expect(toMapboxCoord({ latitude: 37.7749, longitude: -122.4194 })).toEqual([-122.4194, 37.7749])
    })
  })

  describe('toBoundsFromCoords', () => {
    it('computes ne/sw bounding box with padding from a list of lat/lng objects', () => {
      const coords = [
        { latitude: 37.7, longitude: -122.5 },
        { latitude: 37.8, longitude: -122.3 },
      ]
      const bounds = toBoundsFromCoords(coords, 0.01)
      expect(bounds.ne[0]).toBeCloseTo(-122.29) // lng
      expect(bounds.ne[1]).toBeCloseTo(37.81)   // lat
      expect(bounds.sw[0]).toBeCloseTo(-122.51)
      expect(bounds.sw[1]).toBeCloseTo(37.69)
    })

    it('returns a non-zero box when given a single point', () => {
      const bounds = toBoundsFromCoords([{ latitude: 37.7749, longitude: -122.4194 }], 0.05)
      expect(bounds.ne[1]).toBeGreaterThan(bounds.sw[1])
      expect(bounds.ne[0]).toBeGreaterThan(bounds.sw[0])
    })
  })

  describe('deltaToZoom', () => {
    it('converts a latitudeDelta of 0.05 to a street-level zoom', () => {
      const zoom = deltaToZoom(0.05)
      expect(zoom).toBeGreaterThan(11)
      expect(zoom).toBeLessThan(15)
    })

    it('converts a latitudeDelta of 10 to a country-level zoom', () => {
      const zoom = deltaToZoom(10)
      expect(zoom).toBeGreaterThan(4)
      expect(zoom).toBeLessThan(8)
    })
  })
  ```

- [ ] **Step 2: Run tests to verify they fail**
  ```bash
  npx jest src/utils/__tests__/mapboxHelpers.test.ts --no-coverage
  ```
  Expected output: `Cannot find module '../mapboxHelpers'`

- [ ] **Step 3: Implement the helpers**

  Create `src/utils/mapboxHelpers.ts`:
  ```typescript
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
  ```

- [ ] **Step 4: Run tests to verify they pass**
  ```bash
  npx jest src/utils/__tests__/mapboxHelpers.test.ts --no-coverage
  ```
  Expected: 4 tests PASS

- [ ] **Step 5: Commit**
  ```bash
  git add src/utils/mapboxHelpers.ts src/utils/__tests__/mapboxHelpers.test.ts
  git commit -m "feat: add Mapbox coordinate helper utilities"
  ```

---

## Task 4: Add Jest Mock for @rnmapbox/maps

Jest cannot render native Mapbox components, so we need a mock that returns `View` wrappers.

**Files:**
- Create: `src/__mocks__/@rnmapbox/maps.ts`
- Modify: `package.json` (jest `moduleNameMapper`)

- [ ] **Step 1: Create the mock**

  Create `src/__mocks__/@rnmapbox/maps.ts`:
  ```typescript
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
  ```

- [ ] **Step 2: Register the mock in package.json jest config**

  In `package.json`, find the `"jest"` object's `"moduleNameMapper"` section and add this entry:
  ```json
  "^@rnmapbox/maps$": "<rootDir>/src/__mocks__/@rnmapbox/maps.ts"
  ```

  Also add `@rnmapbox` to `transformIgnorePatterns` so it gets compiled:
  ```json
  "transformIgnorePatterns": [
    "node_modules/(?!(react-native|expo-router|expo-status-bar|expo|expo-camera|expo-image-picker|expo-location|expo-updates|@rnmapbox)/)"
  ]
  ```

- [ ] **Step 3: Verify Jest still passes**
  ```bash
  npx jest --no-coverage 2>&1 | tail -10
  ```
  Expected: same pass/fail counts as before (no new failures from the mock)

- [ ] **Step 4: Commit**
  ```bash
  git add "src/__mocks__/@rnmapbox/maps.ts" package.json
  git commit -m "test: add Jest mock for @rnmapbox/maps"
  ```

---

## Task 5: Initialize Mapbox Access Token

The Mapbox SDK requires `setAccessToken` to be called once before any `MapView` renders. The root layout runs first.

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add the import and token initialization**

  Open `app/_layout.tsx`. At the very top, after the existing imports, add:
  ```typescript
  import MapboxGL from '@rnmapbox/maps'

  MapboxGL.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '')
  ```

  This must be at module level (outside any component or function) so it runs before any map component mounts.

- [ ] **Step 2: Commit**
  ```bash
  git add app/_layout.tsx
  git commit -m "feat: initialize Mapbox SDK access token at app startup"
  ```

---

## Task 6: Migrate AtlasMapView

`src/components/AtlasMapView.tsx` — personal atlas showing the user's own spots as 🌮 pins. Tapping a pin navigates to the spot detail.

Current data shape: `VendorRow` with `vendor.lat`, `vendor.lng`, `vendor.localId`, `vendor.name`, `vendor.spotType`. Prop is `rows: VendorRow[]`.

**Files:**
- Rewrite: `src/components/AtlasMapView.tsx`

- [ ] **Step 1: Rewrite AtlasMapView.tsx**

  Replace the entire file:
  ```typescript
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
            {/* Tappable dismiss layer behind the callout */}
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
    calloutType: {
      fontSize: 11, color: '#7A4310', textTransform: 'uppercase',
      letterSpacing: 0.3, marginBottom: 2,
    },
    calloutRating: { fontSize: 12, color: '#241C16', marginBottom: 2 },
    calloutTap: { fontSize: 11, color: '#B8A898', fontStyle: 'italic' },
  })
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/components/AtlasMapView.tsx
  git commit -m "feat: migrate AtlasMapView to Mapbox"
  ```

---

## Task 7: Migrate MapPinPicker

`src/components/MapPinPicker.tsx` — the user drags the map so a fixed center pin lands on their desired location. `onRegionChangeComplete` currently tracks the center.

Current prop contract: `onConfirm` receives `{ lat, lng, address, cityName }` (type `LocationResult`).

**Files:**
- Rewrite: `src/components/MapPinPicker.tsx`

- [ ] **Step 1: Rewrite MapPinPicker.tsx**

  Replace the entire file:
  ```typescript
  import { useRef, useState } from 'react'
  import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
  import MapboxGL from '@rnmapbox/maps'
  import { Ionicons } from '@expo/vector-icons'
  import { colors, spacing, radius } from '../utils/theme'
  import type { LocationResult } from './LocationPicker'

  // San Diego as default (same as before)
  const DEFAULT_CENTER: [number, number] = [-117.1611, 32.7157]
  const DEFAULT_ZOOM = 13

  interface Props {
    onConfirm: (result: LocationResult) => void
    onCancel: () => void
  }

  export function MapPinPicker({ onConfirm, onCancel }: Props) {
    const mapRef = useRef<MapboxGL.MapView>(null)
    const [resolving, setResolving] = useState(false)

    async function handleConfirm() {
      if (!mapRef.current) return
      setResolving(true)

      // getCenter() returns [longitude, latitude]
      const center = await mapRef.current.getCenter() as [number, number]
      const longitude = center[0]
      const latitude = center[1]

      let cityName: string | null = null
      try {
        const Location = await import('expo-location')
        const results = await Location.reverseGeocodeAsync({ latitude, longitude })
        cityName = results[0]?.city ?? null
      } catch {}

      onConfirm({ lat: latitude, lng: longitude, address: null, cityName })
      setResolving(false)
    }

    return (
      <View style={styles.container}>
        <MapboxGL.MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          logoEnabled={false}
          attributionEnabled={false}
        >
          <MapboxGL.Camera
            centerCoordinate={DEFAULT_CENTER}
            zoomLevel={DEFAULT_ZOOM}
            animationDuration={0}
          />
          <MapboxGL.UserLocation visible />
        </MapboxGL.MapView>

        {/* Fixed center crosshair — pointerEvents="none" so map receives touches */}
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
  ```

  **Key change from the original:** Instead of `onRegionChangeComplete={setRegion}`, the new version reads the center on demand when the user taps "Set This Spot" via `mapRef.current.getCenter()`. The drag-to-pick UX is identical — the crosshair stays fixed and the map moves under it.

- [ ] **Step 2: Commit**
  ```bash
  git add src/components/MapPinPicker.tsx
  git commit -m "feat: migrate MapPinPicker to Mapbox"
  ```

---

## Task 8: Migrate explore.tsx

`app/(tabs)/explore.tsx` — the main discovery map with 4 pin types and filter chips.

**Pin types:**
- **Mine** (`myPins`, `myPublicPins`): 🌮 taco emoji in amber circle. Route: `/spot/${pin.localId}`
- **Friends** (`friendPins`): colored dot, color from `friendColor(pin.friend.username)`. Route: `/spot/${pin.id}` (check current code)
- **Public** (`publicPins`): blue dot (`#4A9EE8`). Route: `/vendor/${pin.id}`

**Data shapes:** `myPins`/`myPublicPins` use `.lat`, `.lng`, `.localId`, `.name`, `.spotType`; `friendPins` use `.lat`, `.lng`, `.id`, `.friend.username`, `.spotName`, `.rating`; `publicPins` use `.lat`, `.lng`, `.id`, `.name`, `.address`.

**Files:**
- Modify: `app/(tabs)/explore.tsx`

- [ ] **Step 1: Update imports**

  Remove:
  ```typescript
  import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps'
  ```

  Add:
  ```typescript
  import MapboxGL from '@rnmapbox/maps'
  import { toBoundsFromCoords, toMapboxCoord } from '../../src/utils/mapboxHelpers'
  ```

- [ ] **Step 2: Add selectedPin state**

  In the component body, alongside existing state declarations, add:
  ```typescript
  type SelectedPin =
    | { kind: 'mine'; pin: typeof myPins[0] }
    | { kind: 'friend'; pin: typeof friendPins[0] }
    | { kind: 'public'; pin: typeof publicPins[0] }

  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null)
  ```

- [ ] **Step 3: Replace the initialRegion computation with Mapbox-compatible camera props**

  The existing block starting at line ~112:
  ```typescript
  const initialRegion = visibleLats.length > 0
    ? (() => { ... })()
    : { latitude: 37.7749, ... }
  ```

  Replace it with:
  ```typescript
  const initialCameraProps = (() => {
    if (visibleLats.length === 0) {
      return { centerCoordinate: [-122.4194, 37.7749] as [number, number], zoomLevel: 5 }
    }
    const coords = visibleLats.map((lat, i) => ({ latitude: lat, longitude: visibleLngs[i] }))
    return {
      bounds: {
        ...toBoundsFromCoords(coords, 0.02),
        paddingTop: 80,
        paddingBottom: 120,
        paddingLeft: 40,
        paddingRight: 40,
      },
    }
  })()
  ```

  Note: `visibleLngs` is a parallel array declared in the same block; keep it as-is.

- [ ] **Step 4: Replace the MapView JSX block**

  Find the existing `<MapView ... >` block (currently around line 188–270) and replace the entire MapView + its children with:
  ```tsx
  <MapboxGL.MapView
    style={StyleSheet.absoluteFillObject}
    logoEnabled={false}
    attributionEnabled={false}
    onPress={() => setSelectedPin(null)}
  >
    <MapboxGL.Camera animationDuration={0} {...initialCameraProps} />
    <MapboxGL.UserLocation visible={!locationDenied} />

    {/* Mine — taco emoji pins */}
    {showMine && myPins.map(pin => (
      <MapboxGL.MarkerView
        key={`mine-${pin.localId}`}
        coordinate={toMapboxCoord({ latitude: pin.lat, longitude: pin.lng })}
      >
        <TouchableOpacity
          style={styles.tacoPin}
          onPress={() => setSelectedPin({ kind: 'mine', pin })}
        >
          <Text style={styles.tacoPinEmoji}>🌮</Text>
        </TouchableOpacity>
      </MapboxGL.MarkerView>
    ))}

    {/* Friends — colored dot pins */}
    {showFriends && friendPins.map(pin => (
      <MapboxGL.MarkerView
        key={`friend-${pin.id}`}
        coordinate={toMapboxCoord({ latitude: pin.lat, longitude: pin.lng })}
      >
        <TouchableOpacity
          onPress={() => setSelectedPin({ kind: 'friend', pin })}
          style={[styles.dotPin, { backgroundColor: friendColor(pin.friend.username) }]}
        />
      </MapboxGL.MarkerView>
    ))}

    {/* Public — blue community pins */}
    {showPublic && publicPins.map(pin => (
      <MapboxGL.MarkerView
        key={`public-${pin.id}`}
        coordinate={toMapboxCoord({ latitude: pin.lat!, longitude: pin.lng! })}
      >
        <TouchableOpacity
          onPress={() => setSelectedPin({ kind: 'public', pin })}
          style={[styles.dotPin, { backgroundColor: '#4A9EE8' }]}
        />
      </MapboxGL.MarkerView>
    ))}

    {/* Public view of user's own public pins (when Mine filter is off) */}
    {showPublic && !showMine && myPublicPins.map(pin => (
      <MapboxGL.MarkerView
        key={`mine-pub-${pin.localId}`}
        coordinate={toMapboxCoord({ latitude: pin.lat, longitude: pin.lng })}
      >
        <TouchableOpacity
          style={styles.tacoPin}
          onPress={() => setSelectedPin({ kind: 'mine', pin })}
        >
          <Text style={styles.tacoPinEmoji}>🌮</Text>
        </TouchableOpacity>
      </MapboxGL.MarkerView>
    ))}
  </MapboxGL.MapView>
  ```

- [ ] **Step 5: Add the selectedPin callout overlay**

  After the closing `</MapboxGL.MapView>` tag (and before the pin count badge), add:
  ```tsx
  {selectedPin && (
    <>
      <TouchableOpacity
        style={StyleSheet.absoluteFillObject}
        onPress={() => setSelectedPin(null)}
        activeOpacity={1}
      />
      <TouchableOpacity
        style={styles.callout}
        onPress={() => {
          if (selectedPin.kind === 'mine') {
            router.push(`/spot/${selectedPin.pin.localId}`)
          } else if (selectedPin.kind === 'public') {
            router.push(`/vendor/${selectedPin.pin.id}`)
          }
          setSelectedPin(null)
        }}
      >
        {selectedPin.kind === 'mine' && (
          <>
            <Text style={styles.calloutName}>{selectedPin.pin.name}</Text>
            {selectedPin.pin.spotType
              ? <Text style={styles.calloutMeta}>{selectedPin.pin.spotType}</Text>
              : null}
            <Text style={styles.calloutSource}>My Pin · Tap to view</Text>
          </>
        )}
        {selectedPin.kind === 'friend' && (
          <>
            <Text style={styles.calloutName}>{selectedPin.pin.spotName}</Text>
            <Text style={[styles.calloutMeta, { color: friendColor(selectedPin.pin.friend.username) }]}>
              @{selectedPin.pin.friend.username}
            </Text>
            {selectedPin.pin.rating !== undefined
              ? <Text style={styles.calloutSource}>{selectedPin.pin.rating.toFixed(1)} tacos</Text>
              : null}
          </>
        )}
        {selectedPin.kind === 'public' && (
          <>
            <Text style={styles.calloutName}>{selectedPin.pin.name}</Text>
            {selectedPin.pin.address
              ? <Text style={styles.calloutMeta}>{selectedPin.pin.address}</Text>
              : null}
            <Text style={styles.calloutSource}>Public · Tap to view</Text>
          </>
        )}
      </TouchableOpacity>
    </>
  )}
  ```

- [ ] **Step 6: Add dotPin and callout styles to the StyleSheet**

  In the file's existing `StyleSheet.create({...})` call, add these new entries:
  ```typescript
  dotPin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  callout: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 10,
  },
  calloutName: { fontSize: 15, fontWeight: '700', color: '#18140F', marginBottom: 2 },
  calloutMeta: { fontSize: 12, color: '#7A4310', marginBottom: 1 },
  calloutSource: { fontSize: 11, color: '#B8A898', fontStyle: 'italic', marginTop: 2 },
  ```

- [ ] **Step 7: Commit**
  ```bash
  git add "app/(tabs)/explore.tsx"
  git commit -m "feat: migrate explore map screen to Mapbox"
  ```

---

## Task 9: Migrate FriendMapScreen

`app/mi-gente/map/[username].tsx` — shows a specific friend's spots on a map with a bottom panel listing 3 of them.

**Data shape:** `ActivityStub[]` with `.id`, `.lat`, `.lng`, `.spotName`, `.type` (`'reviewed'|'pinned'`), `.rating`.

**Files:**
- Modify: `app/mi-gente/map/[username].tsx`

- [ ] **Step 1: Update imports**

  Remove:
  ```typescript
  import MapView, { Marker } from 'react-native-maps'
  ```

  Add:
  ```typescript
  import MapboxGL from '@rnmapbox/maps'
  import { toBoundsFromCoords, toMapboxCoord } from '../../../src/utils/mapboxHelpers'
  ```

- [ ] **Step 2: Replace the bounding region computation**

  The existing block (around line 55–65):
  ```typescript
  const minLat = Math.min(...pins.map(p => p.lat))
  // ... etc
  const latDelta = Math.max((maxLat - minLat) * PADDING, 0.01)
  const lngDelta = Math.max((maxLng - minLng) * PADDING, 0.01)
  ```

  Replace with:
  ```typescript
  const mapBounds =
    pins.length > 1
      ? toBoundsFromCoords(
          pins.map(p => ({ latitude: p.lat, longitude: p.lng })),
          0.01,
        )
      : null

  const singleCenter: [number, number] | null =
    pins.length === 1 ? toMapboxCoord({ latitude: pins[0].lat, longitude: pins[0].lng }) : null
  ```

- [ ] **Step 3: Replace the MapView JSX**

  Find:
  ```tsx
  <MapView
    style={styles.map}
    initialRegion={{ latitude: centerLat, longitude: centerLng, latitudeDelta: latDelta, longitudeDelta: lngDelta }}
    showsUserLocation={locationGranted}
  >
    {pins.map(pin => (
      <Marker
        key={pin.id}
        coordinate={{ latitude: pin.lat, longitude: pin.lng }}
        title={pin.spotName}
        description={...}
        pinColor={...}
      />
    ))}
  </MapView>
  ```

  Replace with:
  ```tsx
  <MapboxGL.MapView
    style={styles.map}
    logoEnabled={false}
    attributionEnabled={false}
  >
    {mapBounds ? (
      <MapboxGL.Camera
        bounds={{
          ...mapBounds,
          paddingTop: 40,
          paddingBottom: 40,
          paddingLeft: 40,
          paddingRight: 40,
        }}
        animationDuration={0}
      />
    ) : (
      <MapboxGL.Camera
        centerCoordinate={singleCenter ?? [-122.4194, 37.7749]}
        zoomLevel={14}
        animationDuration={0}
      />
    )}
    <MapboxGL.UserLocation visible={locationGranted} />
    {pins.map(pin => (
      <MapboxGL.MarkerView
        key={pin.id}
        coordinate={toMapboxCoord({ latitude: pin.lat, longitude: pin.lng })}
      >
        <View
          style={[
            styles.friendDot,
            { backgroundColor: pin.type === 'reviewed' ? colors.amber : '#B37318' },
          ]}
        />
      </MapboxGL.MarkerView>
    ))}
  </MapboxGL.MapView>
  ```

- [ ] **Step 4: Add friendDot style to StyleSheet**

  In the existing `StyleSheet.create` call, add:
  ```typescript
  friendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  ```

  Also remove the unused `centerLat`, `centerLng`, `latDelta`, `lngDelta`, `minLat`, `maxLat`, `minLng`, `maxLng`, `PADDING` variables (they were only used in `initialRegion`).

- [ ] **Step 5: Commit**
  ```bash
  git add "app/mi-gente/map/[username].tsx"
  git commit -m "feat: migrate friend map screen to Mapbox"
  ```

---

## Task 10: TypeScript Check & Fix Errors

**Files:** varies

- [ ] **Step 1: Run the TypeScript compiler**
  ```bash
  npx tsc --noEmit 2>&1 | head -80
  ```

- [ ] **Step 2: Fix common errors**

  Likely errors and fixes:

  **"Property 'bounds' does not exist on type..."**
  The `Camera` `bounds` prop requires padding props to be defined. Import the type if needed:
  ```typescript
  import type { CameraBoundsWithPadding } from '@rnmapbox/maps'
  ```

  **"Object is possibly undefined" on selectedPin.pin fields**
  This is a TypeScript narrowing issue — the discriminated union `SelectedPin` should handle it. If it doesn't, add `if (!selectedPin) return null` before the JSX block.

  **Unused imports (MapView, Marker, Callout, PROVIDER_GOOGLE)**
  Delete them — they were removed from the components but may still be in imports.

  **"Argument of type '[number, number]' is not assignable..."**
  Cast as `as [number, number]` where needed, or define the type explicitly.

- [ ] **Step 3: Re-run until clean**
  ```bash
  npx tsc --noEmit
  ```
  Expected: no output (zero errors)

- [ ] **Step 4: Run the test suite**
  ```bash
  npx jest --no-coverage
  ```
  Expected: same or better pass rate than before the migration (the only new tests are the mapboxHelpers tests, which should pass)

- [ ] **Step 5: Commit any fixes**
  ```bash
  git add -p
  git commit -m "fix: TypeScript errors from Mapbox migration"
  ```

---

## Task 11: EAS Build & Smoke Test on Device

Native dependency change — Metro bundler alone cannot run this. You must trigger a full EAS build.

**Files:** none

- [ ] **Step 1: Register the Mapbox download secret with EAS (one-time)**
  ```bash
  eas secret:create --scope project --name MAPBOX_DOWNLOADS_TOKEN --value sk.your_secret_token_here
  ```

- [ ] **Step 2: Trigger an Android internal build**
  ```bash
  eas build --platform android --profile internal
  ```
  This takes ~10–15 minutes. The Expo plugin injects the Mapbox configuration during the native build.

- [ ] **Step 3: Install the .apk on a device and run through these flows**

  | Flow | Expected |
  |------|----------|
  | Open Atlas tab | Map renders, user's spots appear as 🌮 pins |
  | Tap a 🌮 pin | Callout card appears at bottom of screen |
  | Tap the callout card | Navigates to spot detail |
  | Tap empty map area | Callout dismisses |
  | Open Explore tab | Map renders, filter chips work, pins appear |
  | Switch between All/Mine/Friends/Public filters | Pins update correctly |
  | Tap a friend dot pin | Callout shows friend username |
  | Tap a blue public pin | Callout shows vendor name, tap navigates |
  | Start a new review → Set Location | MapPinPicker renders with center crosshair |
  | Drag map in MapPinPicker → tap Set This Spot | Location confirmed, reverse geocoding works |
  | Open a friend's profile → View Map | Friend map renders, spots appear as dots |
  | Tap "🌮 Go" in friend map bottom panel | Native maps app opens with directions |

- [ ] **Step 4: (When Android is confirmed working) Trigger iOS internal build**
  ```bash
  eas build --platform ios --profile internal
  ```
  If the build fails with a 401 error on CocoaPods fetching, the `MAPBOX_DOWNLOADS_TOKEN` EAS secret wasn't applied correctly. Verify with `eas secret:list`.

---

## Self-Review Notes

**Spec coverage:**
- ✅ All 4 map screens migrated (Tasks 6–9)
- ✅ Google Maps API key removed from AndroidManifest and app.json (Task 2)
- ✅ react-native-maps removed, @rnmapbox/maps installed (Task 2)
- ✅ Mapbox token configured (Tasks 1 + 5)
- ✅ Jest mock added (Task 4)
- ✅ Coordinate helpers with tests (Task 3)
- ✅ TypeScript validated (Task 10)
- ✅ EAS build + smoke test checklist (Task 11)
- ✅ google-services.json explicitly preserved (not a Google Maps artifact)
- ✅ Google Places API untouched (out of scope; noted in architecture section)
- ✅ `openMapsNavigation` in friend map panel untouched (uses OS deep links, not Google SDK)

**API consistency:**
- `toMapboxCoord` defined in Task 3, used in Tasks 6, 7, 8, 9 ✓
- `toBoundsFromCoords` defined in Task 3, used in Tasks 6, 8, 9 ✓
- `MapboxGL` default import used uniformly in Tasks 5, 6, 7, 8, 9 ✓
- All pin data field names (`vendor.lat`, `vendor.lng`, `pin.lat`, `pin.lng`, etc.) match the actual codebase field names verified from reading the source files ✓
