# TacoAtlas Phase 1 — Free Tier Features + Monetization Foundation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the free/pro feature split, map view, Google Places integration, Share My Taco, and RevenueCat monetization infrastructure.

**Architecture:** Five sequential phases. Each phase is independently shippable. Start with the 15-spot limit (foundation for everything else), then add map view, Google Places, Share My Taco, and finally RevenueCat. The `proService` is the single source of truth for whether the user has Pro — all feature gates check it.

**Tech Stack:** Expo SDK 55, React Native 0.83.2, Expo Router v3, Zustand, AsyncStorage, Supabase, react-native-maps (already installed), react-native-purchases (RevenueCat — needs install), Google Places API (REST, no package needed), React Native Share (built-in)

---

## ⚠️ External Setup Required Before Phase 5

Phase 5 (RevenueCat) needs accounts configured outside of code:
1. Create a RevenueCat account at https://app.revenuecat.com
2. Create a product in App Store Connect: `tacooatlas_pro` (non-consumable, $3.99)
3. Create a product in Google Play Console: `tacooatlas_pro` (one-time, $3.99)
4. Add both to RevenueCat as an Offering called `default` with entitlement `pro`
5. Get your RevenueCat API keys (iOS + Android) and add as env vars:
   - `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
   - `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
6. Add Google Places API key (restrict to Places API):
   - `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`

You can build and test Phases 1–4 without any of the above. Phase 5 requires them.

---

## Phase 1: 15-Spot Free Limit + Search/Filter

### Task 1.1: Add `getVendorCount` to localStorage service

**Files:**
- Modify: `src/services/localStorage.ts`
- Test: `src/types/__tests__/localStorage.test.ts`

**Step 1: Write the failing test**

Create file `src/types/__tests__/localStorage.test.ts`:

```typescript
import { localStorageService } from '../../services/localStorage'

// AsyncStorage is mocked via moduleNameMapper in package.json

beforeEach(async () => {
  await localStorageService.clearAll()
})

describe('localStorageService.getVendorCount', () => {
  it('returns 0 when no vendors exist', async () => {
    const count = await localStorageService.getVendorCount()
    expect(count).toBe(0)
  })

  it('returns correct count after adding vendors', async () => {
    await localStorageService.addVendor({
      name: 'Taco Spot 1', spotType: 'Truck',
      lat: 0, lng: 0, address: null, cityName: null, hours: null, photoUri: null,
    })
    await localStorageService.addVendor({
      name: 'Taco Spot 2', spotType: 'Truck',
      lat: 0, lng: 0, address: null, cityName: null, hours: null, photoUri: null,
    })
    const count = await localStorageService.getVendorCount()
    expect(count).toBe(2)
  })
})

describe('localStorageService.isAtFreeLimit', () => {
  it('returns false when under 15 spots', async () => {
    expect(await localStorageService.isAtFreeLimit()).toBe(false)
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd /path/to/tacooatlas
npx jest src/types/__tests__/localStorage.test.ts --no-coverage
```

Expected: FAIL — `localStorageService.getVendorCount is not a function`

**Step 3: Add `getVendorCount` and `isAtFreeLimit` to `src/services/localStorage.ts`**

Add these two methods to the exported `localStorageService` object (after `clearAll`):

```typescript
async getVendorCount(): Promise<number> {
  const vendors = await getVendors()
  return vendors.length
},

async isAtFreeLimit(): Promise<boolean> {
  const count = await this.getVendorCount()
  return count >= 15
},
```

**Step 4: Run test to verify it passes**

```bash
npx jest src/types/__tests__/localStorage.test.ts --no-coverage
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/localStorage.ts src/types/__tests__/localStorage.test.ts
git commit -m "feat: add getVendorCount and isAtFreeLimit to localStorage service"
```

---

### Task 1.2: Enforce 15-spot limit in the review add flow

**Files:**
- Modify: `app/review/add.tsx`
- Create: `src/components/ProPaywallModal.tsx`

**Step 1: Create a placeholder ProPaywallModal**

Create `src/components/ProPaywallModal.tsx`:

```typescript
import { Modal, View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'

interface Props {
  visible: boolean
  onClose: () => void
}

export function ProPaywallModal({ visible, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Image
            source={require('../../assets/taco-icon.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <Text style={styles.title}>You've hit 15 spots</Text>
          <Text style={styles.subtitle}>
            Upgrade to TacoAtlas Pro for unlimited spots, cloud backup, map view, and more.
          </Text>
          <View style={styles.featureList}>
            {[
              'Unlimited spots',
              'Cloud sync + backup',
              'Social atlas & public profile',
              'Statistics dashboard',
              'Home screen widget',
            ].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color={colors.amber} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.upgradeBtn} onPress={onClose}>
            <Text style={styles.upgradeBtnText}>Upgrade for $3.99</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  icon: { width: 64, height: 64, marginBottom: spacing.md },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.cream,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.creamMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  featureList: { width: '100%', marginBottom: spacing.xl },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  featureText: { color: colors.cream, fontSize: 14 },
  upgradeBtn: {
    backgroundColor: colors.amber,
    borderRadius: radius.full,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  upgradeBtnText: { color: colors.cream, fontWeight: '700', fontSize: 16 },
  cancelBtn: { paddingVertical: spacing.sm },
  cancelBtnText: { color: colors.creamMuted, fontSize: 14 },
})
```

**Step 2: Gate the add flow in `app/review/add.tsx`**

At the top of the `ReviewAddScreen` component, before the form renders, add a check. Find the component function and add this logic near the top (after existing state declarations):

```typescript
// Add this import at top of file:
import { ProPaywallModal } from '../../src/components/ProPaywallModal'

// Add this state inside the component:
const [showPaywall, setShowPaywall] = useState(false)

// Add this useEffect after existing useEffects:
useEffect(() => {
  async function checkLimit() {
    const atLimit = await localStorageService.isAtFreeLimit()
    if (atLimit) setShowPaywall(true)
  }
  // Only check if this is a new review (not edit mode)
  if (!editReviewId) {
    checkLimit()
  }
}, [editReviewId])
```

Then add the modal to the JSX, just before the closing tag of the root View:

```tsx
<ProPaywallModal
  visible={showPaywall}
  onClose={() => { setShowPaywall(false); router.back() }}
/>
```

**Step 3: Run the app and verify**

```bash
npx expo start
```

Add 15 spots manually (or mock the count), then try to add a 16th. The paywall modal should appear and dismiss on "Maybe later."

**Step 4: Commit**

```bash
git add src/components/ProPaywallModal.tsx app/review/add.tsx
git commit -m "feat: enforce 15-spot free limit with paywall modal"
```

---

### Task 1.3: Add search and filter to My Tacos tab

**Files:**
- Modify: `app/(tabs)/atlas.tsx`

**Step 1: Add search state and filter UI to `atlas.tsx`**

Add these imports at the top:

```typescript
import { TextInput } from 'react-native'
import type { SpotType } from '../../src/types/app'
```

Add these state variables inside `MyTacosScreen`:

```typescript
const [search, setSearch] = useState('')
const [filterType, setFilterType] = useState<SpotType | null>(null)
```

Add a computed `filteredRows` derived from `rows`:

```typescript
const filteredRows = rows.filter(({ vendor }) => {
  const matchesSearch = vendor.name.toLowerCase().includes(search.toLowerCase())
  const matchesType = filterType === null || vendor.spotType === filterType
  return matchesSearch && matchesType
})
```

Replace `data={rows}` in the FlatList with `data={filteredRows}`.

Add a search bar component between the header and the list. Insert this as a new `ListHeaderComponent` section below the existing header View:

```tsx
<View style={styles.searchRow}>
  <View style={styles.searchBar}>
    <Ionicons name="search" size={16} color={colors.creamMuted} />
    <TextInput
      style={styles.searchInput}
      placeholder="Search spots..."
      placeholderTextColor={colors.creamMuted}
      value={search}
      onChangeText={setSearch}
      returnKeyType="search"
    />
    {search.length > 0 && (
      <TouchableOpacity onPress={() => setSearch('')}>
        <Ionicons name="close-circle" size={16} color={colors.creamMuted} />
      </TouchableOpacity>
    )}
  </View>
</View>
```

Add these styles:

```typescript
searchRow: {
  paddingHorizontal: spacing.md,
  paddingBottom: spacing.sm,
},
searchBar: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,
  backgroundColor: colors.surface,
  borderRadius: radius.full,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderWidth: 1,
  borderColor: colors.surfaceBorder,
},
searchInput: {
  flex: 1,
  color: colors.cream,
  fontSize: 14,
},
```

**Step 2: Commit**

```bash
git add app/(tabs)/atlas.tsx
git commit -m "feat: add search filter to My Tacos tab"
```

---

## Phase 2: Map View Toggle

**Goal:** Add a list/map toggle to the My Tacos header. Map view shows all logged spots as color-coded pins. Tap a pin to navigate to the spot detail.

### Task 2.1: Create `AtlasMapView` component

**Files:**
- Create: `src/components/AtlasMapView.tsx`

`react-native-maps` is already installed (v1.27.2). You need a Google Maps API key for Android. Add `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` to your EAS env vars and to `app.json` under `android.config.googleMaps.apiKey`.

```typescript
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
```

**Step 2: Add list/map toggle to `app/(tabs)/atlas.tsx`**

Add state at the top of `MyTacosScreen`:

```typescript
const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
```

Add toggle buttons to the header (inside the `header` View, after `statsRow`):

```tsx
<View style={styles.toggleRow}>
  <TouchableOpacity
    style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
    onPress={() => setViewMode('list')}
  >
    <Ionicons name="list" size={16} color={viewMode === 'list' ? colors.cream : colors.creamMuted} />
    <Text style={[styles.toggleBtnText, viewMode === 'list' && styles.toggleBtnTextActive]}>List</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
    onPress={() => setViewMode('map')}
  >
    <Ionicons name="map" size={16} color={viewMode === 'map' ? colors.cream : colors.creamMuted} />
    <Text style={[styles.toggleBtnText, viewMode === 'map' && styles.toggleBtnTextActive]}>Map</Text>
  </TouchableOpacity>
</View>
```

Conditionally render AtlasMapView or the FlatList. Wrap the whole return in:

```tsx
return (
  <View style={styles.container}>
    <Image source={require('../../assets/background.png')} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

    {/* Header — always visible */}
    <View style={styles.staticHeader}>
      <Text style={styles.headerEyebrow}>YOUR COLLECTION</Text>
      <Text style={styles.headerTitle}>My Tacos</Text>
      <View style={styles.statsRow}>
        <View style={styles.statPill}>
          <Text style={styles.statNumber}>{rows.length}</Text>
          <Text style={styles.statLabel}> spot{rows.length !== 1 ? 's' : ''} tracked</Text>
        </View>
      </View>
      <View style={styles.toggleRow}>
        {/* toggle buttons here */}
      </View>
      {/* search bar — only in list mode */}
      {viewMode === 'list' && (
        <View style={styles.searchRow}>
          {/* search bar */}
        </View>
      )}
    </View>

    {viewMode === 'map' ? (
      <AtlasMapView rows={rows} />
    ) : (
      <FlatList ... />
    )}

    {/* FAB and banner remain */}
  </View>
)
```

Add styles:

```typescript
staticHeader: {
  paddingHorizontal: spacing.md,
  paddingTop: 60,
  paddingBottom: spacing.sm,
  zIndex: 10,
},
toggleRow: {
  flexDirection: 'row',
  gap: spacing.xs,
  marginTop: spacing.sm,
},
toggleBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
  paddingHorizontal: spacing.md,
  paddingVertical: 6,
  borderRadius: radius.full,
  borderWidth: 1,
  borderColor: colors.surfaceBorder,
  backgroundColor: 'rgba(36, 28, 22, 0.6)',
},
toggleBtnActive: {
  backgroundColor: colors.amberDim,
  borderColor: colors.amber,
},
toggleBtnText: { color: colors.creamMuted, fontSize: 13, fontWeight: '600' },
toggleBtnTextActive: { color: colors.cream },
```

**Step 3: Add import to atlas.tsx**

```typescript
import { AtlasMapView } from '../../src/components/AtlasMapView'
```

**Step 4: Test manually**

Run `npx expo start`. In My Tacos, tap "Map." Pins should appear for logged spots. Tap a pin callout to navigate to the spot detail.

**Step 5: Commit**

```bash
git add src/components/AtlasMapView.tsx app/(tabs)/atlas.tsx
git commit -m "feat: add list/map toggle to My Tacos tab"
```

---

## Phase 3: Google Places Integration

**Goal:** The "Find My Tacos" tab shows nearby taco spots from Google Places alongside Supabase vendors. Tapping a Google Places result pre-fills the new spot form. Free users get 5 searches/day.

### Task 3.1: Create Google Places service

**Files:**
- Create: `src/services/googlePlacesService.ts`
- Test: `src/services/__tests__/googlePlacesService.test.ts`

**Step 1: Write the failing test**

Create `src/services/__tests__/googlePlacesService.test.ts`:

```typescript
import { googlePlacesService } from '../googlePlacesService'

describe('googlePlacesService.getRemainingSearches', () => {
  beforeEach(async () => {
    await googlePlacesService.resetSearchCount() // test helper
  })

  it('starts with 5 searches remaining', async () => {
    const remaining = await googlePlacesService.getRemainingSearches()
    expect(remaining).toBe(5)
  })

  it('decrements after a search is recorded', async () => {
    await googlePlacesService.recordSearch()
    const remaining = await googlePlacesService.getRemainingSearches()
    expect(remaining).toBe(4)
  })

  it('returns 0 when limit is reached', async () => {
    for (let i = 0; i < 5; i++) await googlePlacesService.recordSearch()
    const remaining = await googlePlacesService.getRemainingSearches()
    expect(remaining).toBe(0)
  })
})
```

**Step 2: Run to verify it fails**

```bash
npx jest src/services/__tests__/googlePlacesService.test.ts --no-coverage
```

Expected: FAIL — module not found

**Step 3: Create `src/services/googlePlacesService.ts`**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'

const SEARCH_COUNT_KEY = 'places_search_count'
const SEARCH_DATE_KEY = 'places_search_date'
const FREE_DAILY_LIMIT = 5
const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? ''

export interface GooglePlace {
  id: string
  name: string
  address: string | null
  lat: number
  lng: number
  rating: number | null
  types: string[]
}

async function getTodayString(): Promise<string> {
  return new Date().toISOString().split('T')[0]
}

export const googlePlacesService = {
  async getRemainingSearches(): Promise<number> {
    const today = await getTodayString()
    const storedDate = await AsyncStorage.getItem(SEARCH_DATE_KEY)
    if (storedDate !== today) {
      await AsyncStorage.setItem(SEARCH_DATE_KEY, today)
      await AsyncStorage.setItem(SEARCH_COUNT_KEY, '0')
      return FREE_DAILY_LIMIT
    }
    const raw = await AsyncStorage.getItem(SEARCH_COUNT_KEY)
    const count = raw ? parseInt(raw, 10) : 0
    return Math.max(0, FREE_DAILY_LIMIT - count)
  },

  async recordSearch(): Promise<void> {
    const today = await getTodayString()
    const storedDate = await AsyncStorage.getItem(SEARCH_DATE_KEY)
    if (storedDate !== today) {
      await AsyncStorage.setItem(SEARCH_DATE_KEY, today)
      await AsyncStorage.setItem(SEARCH_COUNT_KEY, '1')
    } else {
      const raw = await AsyncStorage.getItem(SEARCH_COUNT_KEY)
      const count = raw ? parseInt(raw, 10) : 0
      await AsyncStorage.setItem(SEARCH_COUNT_KEY, String(count + 1))
    }
  },

  // Test helper — not for production use
  async resetSearchCount(): Promise<void> {
    await AsyncStorage.removeItem(SEARCH_COUNT_KEY)
    await AsyncStorage.removeItem(SEARCH_DATE_KEY)
  },

  async searchNearby(lat: number, lng: number, radiusMeters = 5000): Promise<GooglePlace[]> {
    if (!API_KEY) {
      console.warn('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY is not set')
      return []
    }

    const remaining = await this.getRemainingSearches()
    if (remaining <= 0) return []

    const body = {
      includedTypes: ['mexican_restaurant', 'restaurant'],
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusMeters,
        },
      },
      rankPreference: 'DISTANCE',
      maxResultCount: 20,
    }

    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.types',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error('Google Places API error:', await res.text())
      return []
    }

    const data = await res.json()
    await this.recordSearch()

    return (data.places ?? []).map((p: any): GooglePlace => ({
      id: p.id,
      name: p.displayName?.text ?? 'Unknown',
      address: p.formattedAddress ?? null,
      lat: p.location?.latitude ?? 0,
      lng: p.location?.longitude ?? 0,
      rating: p.rating ?? null,
      types: p.types ?? [],
    }))
  },
}
```

**Step 4: Add mock for AsyncStorage to test file**

The test environment already mocks AsyncStorage via `moduleNameMapper`. Run the test:

```bash
npx jest src/services/__tests__/googlePlacesService.test.ts --no-coverage
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/googlePlacesService.ts src/services/__tests__/googlePlacesService.test.ts
git commit -m "feat: add Google Places service with daily search limit"
```

---

### Task 3.2: Wire Google Places into Find My Tacos tab

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Step 1: Update `index.tsx` to fetch and display Google Places results**

Add these imports:

```typescript
import { googlePlacesService } from '../../src/services/googlePlacesService'
import type { GooglePlace } from '../../src/services/googlePlacesService'
```

Add state:

```typescript
const [googlePlaces, setGooglePlaces] = useState<GooglePlace[]>([])
const [remainingSearches, setRemainingSearches] = useState<number>(5)
const [searchesLoaded, setSearchesLoaded] = useState(false)
```

Update `loadNearbyVendors` to also fetch Google Places:

```typescript
async function loadNearbyVendors(isRefresh = false) {
  if (!isRefresh) setLoading(true)
  setError(null)
  try {
    const coords = await locationService.getCurrentLocation()
    const nearby = await vendorRepository.getNearbyVendors(
      coords?.lat ?? 0,
      coords?.lng ?? 0,
      coords ? 25 : 20000
    )
    setVendors(nearby)

    const ratingMap: Record<string, number | null> = {}
    await Promise.all(
      nearby.map(async (v) => {
        ratingMap[v.id] = await reviewRepository.getAverageRating(v.id)
      })
    )
    setRatings(ratingMap)

    // Load Google Places if we have a real location
    if (coords) {
      const places = await googlePlacesService.searchNearby(coords.lat, coords.lng)
      setGooglePlaces(places)
    }

    const remaining = await googlePlacesService.getRemainingSearches()
    setRemainingSearches(remaining)
    setSearchesLoaded(true)
  } catch {
    setError('Could not load vendors. Pull down to try again.')
  } finally {
    setLoading(false)
    setRefreshing(false)
  }
}
```

**Step 2: Add a Google Places result card component inline**

Create `src/components/GooglePlaceCard.tsx`:

```typescript
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { colors, spacing, radius } from '../utils/theme'
import type { GooglePlace } from '../services/googlePlacesService'

interface Props {
  place: GooglePlace
}

export function GooglePlaceCard({ place }: Props) {
  function handleAddToAtlas() {
    router.push({
      pathname: '/review/add',
      params: {
        prefillName: place.name,
        prefillAddress: place.address ?? '',
        prefillLat: String(place.lat),
        prefillLng: String(place.lng),
      },
    })
  }

  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <View style={styles.googleBadge}>
          <Text style={styles.googleBadgeText}>G</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{place.name}</Text>
          {place.address && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={12} color={colors.creamMuted} />
              <Text style={styles.address} numberOfLines={1}>{place.address}</Text>
            </View>
          )}
          {place.rating !== null && (
            <Text style={styles.googleRating}>Google: {place.rating.toFixed(1)} ★</Text>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={handleAddToAtlas}>
        <Ionicons name="add" size={16} color={colors.cream} />
        <Text style={styles.addBtnText}>Add to Atlas</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(36, 28, 22, 0.88)',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(61, 46, 34, 0.7)',
  },
  body: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  googleBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  googleBadgeText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.cream, marginBottom: 2 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 },
  address: { fontSize: 12, color: colors.creamMuted, flex: 1 },
  googleRating: { fontSize: 12, color: colors.creamMuted },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.amberDim,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.amber,
  },
  addBtnText: { color: colors.cream, fontSize: 13, fontWeight: '600' },
})
```

**Step 3: Add Google Places section to the FlatList in `index.tsx`**

Add `GooglePlaceCard` to the FlatList as an additional section below Supabase vendors. The simplest approach: after the FlatList `ListEmptyComponent`, add a separate section for Google Places below the FlatList using a `ListFooterComponent`:

```tsx
ListFooterComponent={
  googlePlaces.length > 0 ? (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nearby on Google</Text>
        {searchesLoaded && (
          <Text style={styles.searchesLeft}>{remainingSearches} searches left today</Text>
        )}
      </View>
      {googlePlaces.map(place => (
        <GooglePlaceCard key={place.id} place={place} />
      ))}
    </View>
  ) : null
}
```

Add styles:

```typescript
sectionHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
},
sectionTitle: {
  fontSize: 13,
  fontWeight: '700',
  color: colors.amber,
  letterSpacing: 1,
  textTransform: 'uppercase',
},
searchesLeft: {
  fontSize: 11,
  color: colors.creamMuted,
},
```

**Step 4: Accept prefill params in `app/review/add.tsx`**

In the review add screen, read `prefillName`, `prefillAddress`, `prefillLat`, `prefillLng` from `useLocalSearchParams` and pre-populate the first form step:

```typescript
const { prefillName, prefillAddress, prefillLat, prefillLng } = useLocalSearchParams<{
  prefillName?: string
  prefillAddress?: string
  prefillLat?: string
  prefillLng?: string
}>()

// In the useEffect that initializes the form (Step 1), add:
useEffect(() => {
  if (prefillName) setVendorName(prefillName)
  if (prefillLat && prefillLng) {
    // Store prefilled coords — use these when saving if user hasn't manually set location
    setPrefillCoords({
      lat: parseFloat(prefillLat),
      lng: parseFloat(prefillLng),
      address: prefillAddress ?? null,
    })
  }
}, [])
```

You'll need to add `prefillCoords` state and pass it through the save flow so the vendor gets the Google-sourced lat/lng. The exact implementation depends on how your form currently saves — find where `localStorageService.addVendor` is called and ensure `prefillCoords` is used when lat/lng are not otherwise set.

**Step 5: Commit**

```bash
git add src/services/googlePlacesService.ts src/components/GooglePlaceCard.tsx app/(tabs)/index.tsx app/review/add.tsx
git commit -m "feat: add Google Places nearby search to Find My Tacos"
```

---

## Phase 4: Share My Taco

**Goal:** A "Share" button on spot detail screens generates a text card with spot name, type, rating, and a deep link.

### Task 4.1: Add share functionality to spot detail

**Files:**
- Modify: `app/spot/[localId].tsx`
- Create: `src/utils/shareSpot.ts`

**Step 1: Create `src/utils/shareSpot.ts`**

```typescript
import { Share } from 'react-native'
import type { LocalVendor, LocalReview } from '../types/app'

function ratingEmoji(rating: number): string {
  const tacos = '🌮'.repeat(Math.round(rating))
  return tacos
}

export async function shareSpot(vendor: LocalVendor, reviews: LocalReview[]): Promise<void> {
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
    : null

  const lines: string[] = [
    `${vendor.name}`,
    vendor.spotType ? `Type: ${vendor.spotType}` : null,
    vendor.address ? `📍 ${vendor.address}` : null,
    avgRating !== null ? `My rating: ${ratingEmoji(avgRating)} (${avgRating.toFixed(1)}/5)` : null,
    ``,
    `Found on TacoAtlas — the app for people who take tacos seriously.`,
  ].filter(Boolean) as string[]

  await Share.share({
    message: lines.join('\n'),
    title: `Check out ${vendor.name} on TacoAtlas`,
  })
}
```

**Step 2: Add share button to `app/spot/[localId].tsx`**

Add import:

```typescript
import { Share } from 'react-native'
import { shareSpot } from '../../src/utils/shareSpot'
```

Find the screen header or action bar area in the spot detail screen and add a share button:

```tsx
<TouchableOpacity
  style={styles.shareBtn}
  onPress={() => shareSpot(vendor, reviews)}
  accessibilityLabel="Share this spot"
>
  <Ionicons name="share-outline" size={22} color={colors.amber} />
</TouchableOpacity>
```

Add to styles:

```typescript
shareBtn: {
  padding: spacing.sm,
},
```

**Step 3: Test manually**

Run `npx expo start`. Open a spot detail. Tap the share button. Verify the native share sheet appears with the formatted spot card text.

**Step 4: Commit**

```bash
git add src/utils/shareSpot.ts app/spot/[localId].tsx
git commit -m "feat: add Share My Taco to spot detail screen"
```

---

## Phase 5: RevenueCat Monetization

> **Prerequisites:** Complete the external setup listed at the top of this document before running Phase 5. Without App Store / Google Play product IDs configured in RevenueCat, purchases will not work in production. You can install the package and write the code now, but end-to-end testing requires a real device with a real product configured.

### Task 5.1: Install RevenueCat

```bash
npx expo install react-native-purchases
```

This adds a native module. You'll need to rebuild the dev client:

```bash
eas build --platform android --profile preview
# or for local testing:
npx expo run:android
```

### Task 5.2: Create `src/services/proService.ts`

```typescript
import Purchases, { LOG_LEVEL, PurchasesPackage } from 'react-native-purchases'
import { Platform } from 'react-native'

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ''
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? ''

export const proService = {
  configure(): void {
    const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY
    if (!apiKey) {
      console.warn('RevenueCat API key not set')
      return
    }
    Purchases.setLogLevel(LOG_LEVEL.WARN)
    Purchases.configure({ apiKey })
  },

  async isPro(): Promise<boolean> {
    try {
      const info = await Purchases.getCustomerInfo()
      return info.entitlements.active['pro'] !== undefined
    } catch {
      return false
    }
  },

  async getProPackage(): Promise<PurchasesPackage | null> {
    try {
      const offerings = await Purchases.getOfferings()
      return offerings.current?.availablePackages[0] ?? null
    } catch {
      return null
    }
  },

  async purchase(pkg: PurchasesPackage): Promise<boolean> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg)
      return customerInfo.entitlements.active['pro'] !== undefined
    } catch (e: any) {
      if (e.userCancelled) return false
      throw e
    }
  },

  async restore(): Promise<boolean> {
    try {
      const info = await Purchases.restorePurchases()
      return info.entitlements.active['pro'] !== undefined
    } catch {
      return false
    }
  },
}
```

### Task 5.3: Add pro status to Zustand store

Create `src/store/proStore.ts`:

```typescript
import { create } from 'zustand'
import { proService } from '../services/proService'

interface ProState {
  isPro: boolean
  loading: boolean
  checkPro: () => Promise<void>
  setPro: (value: boolean) => void
}

export const useProStore = create<ProState>((set) => ({
  isPro: false,
  loading: true,
  checkPro: async () => {
    set({ loading: true })
    const result = await proService.isPro()
    set({ isPro: result, loading: false })
  },
  setPro: (value) => set({ isPro: value }),
}))
```

### Task 5.4: Initialize RevenueCat in the root layout

In `app/_layout.tsx`, add:

```typescript
import { proService } from '../src/services/proService'
import { useProStore } from '../src/store/proStore'

// Inside the root layout component, add:
const { checkPro } = useProStore()

useEffect(() => {
  proService.configure()
  checkPro()
}, [])
```

### Task 5.5: Wire purchase into `ProPaywallModal`

Update `src/components/ProPaywallModal.tsx` to actually trigger a purchase:

```typescript
import { proService } from '../services/proService'
import { useProStore } from '../store/proStore'
import { useState } from 'react'
import { ActivityIndicator, Alert } from 'react-native'

// Inside ProPaywallModal component:
const { setPro } = useProStore()
const [purchasing, setPurchasing] = useState(false)

async function handleUpgrade() {
  setPurchasing(true)
  try {
    const pkg = await proService.getProPackage()
    if (!pkg) {
      Alert.alert('Error', 'Could not load purchase options. Try again later.')
      return
    }
    const success = await proService.purchase(pkg)
    if (success) {
      setPro(true)
      onClose()
    }
  } catch {
    Alert.alert('Error', 'Purchase failed. Please try again.')
  } finally {
    setPurchasing(false)
  }
}

async function handleRestore() {
  setPurchasing(true)
  try {
    const success = await proService.restore()
    if (success) {
      setPro(true)
      onClose()
    } else {
      Alert.alert('No purchase found', 'No previous TacoAtlas Pro purchase found on this account.')
    }
  } finally {
    setPurchasing(false)
  }
}
```

Update the upgrade button to call `handleUpgrade`. Add a "Restore purchase" text link below "Maybe later."

### Task 5.6: Gate features using `useProStore`

In `app/(tabs)/atlas.tsx`, gate the map view for free users:

```typescript
const { isPro } = useProStore()

// In the toggle handler:
onPress={() => {
  if (!isPro && viewMode === 'list') {
    // Map is free — allow
    setViewMode('map')
  } else {
    setViewMode('list')
  }
}}
```

Map view is free, so no gate needed there. Gate cloud sync, social features, and unlimited spots using `isPro` from `useProStore` in the relevant screens as you build them.

### Task 5.7: Commit

```bash
git add src/services/proService.ts src/store/proStore.ts src/components/ProPaywallModal.tsx app/_layout.tsx
git commit -m "feat: add RevenueCat monetization infrastructure and Pro paywall"
```

---

## Fix: Continuous Cloud Sync (Post-Phase 5)

This is tracked separately. The current bug: edits made after sign-up stay local only. The fix requires intercepting every `localStorageService` write operation and mirroring it to Supabase when a session exists. File to modify: `src/services/localStorage.ts` — wrap `saveVendors` and `saveReviews` to call Supabase upsert when `authStore.session` is non-null.

---

## Running All Tests

```bash
npx jest --no-coverage
```

Expected: all existing tests pass, new tests added in Phase 1 and 3 pass.

---

## Env Vars Summary

Add these to `.env.local` for local dev and via `eas env:create` for builds:

```
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...       # For react-native-maps on Android
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...     # For Places API nearby search
EXPO_PUBLIC_REVENUECAT_IOS_KEY=...        # RevenueCat iOS public key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=...    # RevenueCat Android public key
```
