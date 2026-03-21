# TacoAtlas UX Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the full UX redesign defined in `docs/plans/2026-03-20-ux-redesign-design.md` — restructuring navigation to 3 tabs (Atlas / Explore / Profile), rebuilding the review wizard from 5 steps to 3, adding a Drop a Pin flow, a 3-method location picker, and per-visit food icon bars using the custom SVG assets.

**Architecture:** Expo Router file-based navigation with Zustand stores for form state. All new screens follow the existing dark theme (`colors.bg`/`colors.surface`). New type fields are added to `LocalVendor` and `LocalReview` with safe defaults so existing persisted data continues to load correctly. Social/Pro features (Mi Gente, Burritos, Tortas) are wired to the existing `proStore` for gating.

**Tech Stack:** React Native 0.83, Expo 55, Expo Router, Zustand, AsyncStorage, react-native-maps, react-native-svg (to be added), Google Places API, Supabase, RevenueCat (react-native-purchases)

---

## Phase 1 — Assets & Types Foundation

### Task 1: Add SVG support

The four food icons (`taco`, `burrito`, `torta`, `salsa`) exist as SVG files in `images/`. React Native cannot render SVGs natively — we need `react-native-svg` and `react-native-svg-transformer`.

**Files:**
- Modify: `package.json`
- Create: `metro.config.js` (likely doesn't exist yet — check first)
- Create: `src/types/svg.d.ts`

**Step 1: Install packages**

```bash
cd /path/to/tacooatlas
npx expo install react-native-svg
npm install --save-dev react-native-svg-transformer
```

Expected: both install without errors.

**Step 2: Check for existing metro.config.js**

```bash
ls metro.config.js
```

If it doesn't exist, create it. If it does, merge the SVG transformer config.

**Step 3: Create/update metro.config.js**

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

const { transformer, resolver } = config

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
}
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
}

module.exports = config
```

**Step 4: Create SVG type declaration**

```ts
// src/types/svg.d.ts
declare module '*.svg' {
  import React from 'react'
  import { SvgProps } from 'react-native-svg'
  const content: React.FC<SvgProps>
  export default content
}
```

**Step 5: Copy SVGs to assets/**

```bash
cp images/taco-dk.svg assets/taco-dk.svg
cp images/taco-lt.svg assets/taco-lt.svg
cp images/burrito-dk.svg assets/burrito-dk.svg
cp images/burrito-lt.svg assets/burrito-lt.svg
cp images/torta-dk.svg assets/torta-dk.svg
cp images/torta-lt.svg assets/torta-lt.svg
cp images/salsa-dk.svg assets/salsa-dk.svg
cp images/salsa-lt.svg assets/salsa-lt.svg
```

**Step 6: Verify SVG renders**

Add a quick test import in a scratch component to confirm SVGs load — you can do this inline in atlas.tsx temporarily and remove after confirming.

**Step 7: Commit**

```bash
git add metro.config.js src/types/svg.d.ts assets/*.svg package.json package-lock.json
git commit -m "feat: add react-native-svg support and copy food icon assets"
```

---

### Task 2: Update types — LocalVendor and LocalReview

The new design adds fields to both types. All new fields must have safe defaults so existing AsyncStorage data (which won't have these fields) still works.

**Files:**
- Modify: `src/types/app.ts`
- Modify: `src/types/__tests__/` (if type tests exist)

**Step 1: Update `src/types/app.ts`**

```ts
export type SpotType = 'Truck' | 'Food Cart' | 'Street Tent' | 'House' | 'Brick & Mortar' | 'Restaurant'
export type PrivacySetting = 'public' | 'friends' | 'private'
export type HeatLevel = 'mild' | 'medium' | 'hot' | 'fire' | 'volcano'
export type ReturnIntent = 'yes' | 'maybe' | 'no'

export interface LocalVendor {
  localId: string
  name: string
  spotType: SpotType | null
  lat: number
  lng: number
  address: string | null
  cityName: string | null
  hours: string | null
  photoUri: string | null
  createdAt: string
  // New fields (safe defaults: undefined treated as 'public' / null / false)
  privacy?: PrivacySetting        // default 'public' when undefined
  spotNote?: string | null        // "About This Spot" — persists across visits
  isVisited?: boolean             // false = drop-a-pin only, true = has at least one review
}

export interface LocalReview {
  localId: string
  vendorLocalId: string
  overallRating: number
  returnIntent: ReturnIntent | null
  notes: string | null
  photoUris: string[]
  tacoEntries: LocalTacoEntry[]
  salsaEntries: LocalSalsaEntry[]
  condiments: string[]
  createdAt: string
  // New fields
  burritoEntries?: LocalBurritoEntry[]   // Pro only, default []
  tortaEntries?: LocalTortaEntry[]       // Pro only, default []
}

export interface LocalTacoEntry {
  tacoType: string
  rating: number
  notes: string | null
}

// New: burrito entries mirror taco entries
export interface LocalBurritoEntry {
  burritoType: string
  rating: number
  notes: string | null
}

// New: torta entries
export interface LocalTortaEntry {
  tortaType: string
  rating: number
  notes: string | null
}

export interface LocalSalsaEntry {
  salsaName: string
  flavorRating: number
  heatLevel: HeatLevel | null
  notes?: string | null    // New: quick note per salsa
}
```

**Step 2: Commit**

```bash
git add src/types/app.ts
git commit -m "feat: extend LocalVendor and LocalReview types for redesign"
```

---

### Task 3: Update localStorage service for new fields

The service needs to handle the new fields and provide safe defaults when reading old data.

**Files:**
- Modify: `src/services/localStorage.ts`
- Modify: `src/services/__tests__/localStorage.test.ts`

**Step 1: Add a `normalizeVendor` helper to `localStorage.ts`**

Add this after the imports:

```ts
// Normalize persisted vendor data — fills in missing new fields with safe defaults
function normalizeVendor(v: any): LocalVendor {
  return {
    ...v,
    privacy: v.privacy ?? 'public',
    spotNote: v.spotNote ?? null,
    isVisited: v.isVisited ?? (/* has reviews — we can't check here, default true for existing data */ true),
  }
}

// Normalize persisted review data
function normalizeReview(r: any): LocalReview {
  return {
    ...r,
    burritoEntries: r.burritoEntries ?? [],
    tortaEntries: r.tortaEntries ?? [],
    salsaEntries: (r.salsaEntries ?? []).map((s: any) => ({
      ...s,
      notes: s.notes ?? null,
    })),
  }
}
```

**Step 2: Apply normalizers in `getVendors` and `getReviews`**

```ts
async function getVendors(): Promise<LocalVendor[]> {
  const raw = await AsyncStorage.getItem(VENDORS_KEY)
  const parsed: any[] = raw ? JSON.parse(raw) : []
  return parsed.map(normalizeVendor)
}

async function getReviews(): Promise<LocalReview[]> {
  const raw = await AsyncStorage.getItem(REVIEWS_KEY)
  const parsed: any[] = raw ? JSON.parse(raw) : []
  return parsed.map(normalizeReview)
}
```

**Step 3: Update `addVendor` to accept new fields**

The existing signature `Omit<LocalVendor, 'localId' | 'createdAt'>` already accepts new optional fields — no change needed. Verify the call sites still compile after the type update.

**Step 4: Add `updateVendor` method (needed for spotNote and privacy edits)**

```ts
async updateVendor(localId: string, updates: Partial<Omit<LocalVendor, 'localId' | 'createdAt'>>): Promise<void> {
  const vendors = await getVendors()
  const idx = vendors.findIndex(v => v.localId === localId)
  if (idx !== -1) {
    vendors[idx] = { ...vendors[idx], ...updates }
    await saveVendors(vendors)
  }
},

async markVendorVisited(localId: string): Promise<void> {
  await this.updateVendor(localId, { isVisited: true })
},
```

**Step 5: Write tests**

```ts
// src/services/__tests__/localStorage.test.ts — add to existing file

describe('normalizeVendor', () => {
  it('fills privacy default when missing', async () => {
    // Simulate old data without privacy field
    await AsyncStorage.setItem('local_vendors', JSON.stringify([
      { localId: 'abc', name: 'Test', spotType: null, lat: 0, lng: 0,
        address: null, cityName: null, hours: null, photoUri: null, createdAt: '2026-01-01' }
    ]))
    const vendors = await localStorageService.getVendors()
    expect(vendors[0].privacy).toBe('public')
    expect(vendors[0].spotNote).toBeNull()
    expect(vendors[0].isVisited).toBe(true)
  })
})

describe('normalizeReview', () => {
  it('fills burritoEntries default when missing', async () => {
    await AsyncStorage.setItem('local_reviews', JSON.stringify([
      { localId: 'r1', vendorLocalId: 'abc', overallRating: 4,
        returnIntent: 'yes', notes: null, photoUris: [], tacoEntries: [],
        salsaEntries: [], condiments: [], createdAt: '2026-01-01' }
    ]))
    const reviews = await localStorageService.getReviewsForVendor('abc')
    expect(reviews[0].burritoEntries).toEqual([])
    expect(reviews[0].tortaEntries).toEqual([])
  })
})
```

**Step 6: Run tests**

```bash
npx jest src/services/__tests__/localStorage.test.ts --no-coverage
```

Expected: all tests pass.

**Step 7: Commit**

```bash
git add src/services/localStorage.ts src/services/__tests__/localStorage.test.ts
git commit -m "feat: normalize LocalVendor/LocalReview data with safe defaults for new fields"
```

---

## Phase 2 — Navigation Restructure

### Task 4: Create the Landing Screen

**Files:**
- Create: `app/landing.tsx`

**Step 1: Create `app/landing.tsx`**

```tsx
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native'
import { router } from 'expo-router'
import { colors, spacing, radius, typography } from '../src/utils/theme'

export default function LandingScreen() {
  function handleSignIn() {
    router.push('/(auth)/sign-in')
  }

  function handleContinueFree() {
    router.replace('/(tabs)/atlas')
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/background.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      <View style={styles.content}>
        <Image
          source={require('../assets/taco-icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>TacoAtlas</Text>
        <Text style={styles.tagline}>Stop forgetting where the good tacos are.</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleSignIn}>
          <Text style={styles.primaryBtnText}>Sign In / Create Account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={handleContinueFree}>
          <Text style={styles.ghostBtnText}>Continue without account</Text>
        </TouchableOpacity>
        <Text style={styles.legal}>
          By continuing you agree to our{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logo: { width: 100, height: 100, marginBottom: spacing.md },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.cream,
    letterSpacing: -1,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 16,
    color: colors.creamMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 52,
    gap: spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.amber,
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.cream,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ghostBtn: {
    borderRadius: radius.full,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  ghostBtnText: {
    color: colors.creamMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  legal: {
    color: colors.creamDim,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  legalLink: { color: colors.amber },
})
```

**Step 2: Update `app/index.tsx` — smart redirect**

The root index should redirect authenticated users directly to atlas, first-timers to landing.

```tsx
// app/index.tsx
import { Redirect } from 'expo-router'
import { useAuthStore } from '../src/store/authStore'

export default function RootIndex() {
  const { session, hasCompletedOnboarding } = useAuthStore()
  // If user has already made a choice (signed in OR chose free), go to atlas
  if (session || hasCompletedOnboarding) {
    return <Redirect href="/(tabs)/atlas" />
  }
  return <Redirect href="/landing" />
}
```

**Step 3: Add `hasCompletedOnboarding` to authStore**

Open `src/store/authStore.ts` and add a persisted boolean that gets set to `true` when the user taps "Continue without account" on the landing screen.

Find the store and add:
```ts
hasCompletedOnboarding: false,
setHasCompletedOnboarding: (val: boolean) => set({ hasCompletedOnboarding: val }),
```

Then in `app/landing.tsx` `handleContinueFree`:
```ts
function handleContinueFree() {
  useAuthStore.getState().setHasCompletedOnboarding(true)
  router.replace('/(tabs)/atlas')
}
```

Note: `hasCompletedOnboarding` also needs to be persisted to AsyncStorage so it survives app restarts. Check how the existing authStore persists state and follow the same pattern.

**Step 4: Commit**

```bash
git add app/landing.tsx app/index.tsx src/store/authStore.ts
git commit -m "feat: add landing screen with sign-in / continue-free paths"
```

---

### Task 5: Restructure the tab layout

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Rename: `app/(tabs)/index.tsx` → `app/(tabs)/explore.tsx`
- Create: `app/(tabs)/profile.tsx` (stub — full implementation in Phase 9)
- Delete: `app/(tabs)/settings.tsx` as a tab route

**Step 1: Rename index to explore**

```bash
mv "app/(tabs)/index.tsx" "app/(tabs)/explore.tsx"
```

Update the import at the top of explore.tsx — no changes needed beyond the file rename since Expo Router uses the filename as the route name.

**Step 2: Create stub profile tab**

```tsx
// app/(tabs)/profile.tsx
import { View, Text, StyleSheet } from 'react-native'
import { colors } from '../../src/utils/theme'

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Profile — coming soon</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  placeholder: { color: colors.creamMuted, fontSize: 16 },
})
```

**Step 3: Update `app/(tabs)/_layout.tsx`**

Replace the entire file:

```tsx
import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Platform } from 'react-native'
import { colors } from '../../src/utils/theme'

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="atlas"
      screenOptions={{
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors.creamDim,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.surfaceBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'android' ? 64 : 60,
          paddingBottom: Platform.OS === 'android' ? 12 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="atlas"
        options={{
          title: 'Atlas',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
```

**Step 4: Verify app boots with 3 tabs and no missing route errors**

```bash
npx expo start
```

Open on simulator. Confirm: Atlas tab, Explore tab, Profile tab all render without crashes.

**Step 5: Commit**

```bash
git add "app/(tabs)/_layout.tsx" "app/(tabs)/explore.tsx" "app/(tabs)/profile.tsx"
git commit -m "feat: restructure to 3 tabs — Atlas, Explore, Profile"
```

---

### Task 6: Create the pushed Settings screen

Settings moves from a tab to a screen pushed from Profile.

**Files:**
- Create: `app/settings.tsx` (copy + adapt from `app/(tabs)/settings.tsx`)
- Delete: `app/(tabs)/settings.tsx`

**Step 1: Copy settings content to new location**

Copy the full content of `app/(tabs)/settings.tsx` to `app/settings.tsx`. Update the relative import paths (remove one `../` level):

```ts
// Change:
import { useAuthStore } from '../../src/store/authStore'
import { supabase } from '../../src/services/supabase'
import { colors, spacing, radius, typography } from '../../src/utils/theme'
// To:
import { useAuthStore } from '../src/store/authStore'
import { supabase } from '../src/services/supabase'
import { colors, spacing, radius, typography } from '../src/utils/theme'
```

**Step 2: Add a back header to the settings screen**

Since it's a pushed screen, add a back button or use Expo Router's default stack header. In `app/_layout.tsx`, add the settings route to the Stack:

Open `app/_layout.tsx` and find the `<Stack>` definition. Add:

```tsx
<Stack.Screen name="settings" options={{ title: 'Settings', headerShown: true }} />
```

**Step 3: Delete the old settings tab**

```bash
rm "app/(tabs)/settings.tsx"
```

**Step 4: Commit**

```bash
git add app/settings.tsx app/_layout.tsx
git commit -m "feat: move Settings from tab to pushed screen"
```

---

## Phase 3 — Atlas Tab Updates

### Task 7: Update Atlas tab header and controls

**Files:**
- Modify: `app/(tabs)/atlas.tsx`

**Step 1: Update header text**

Find `styles.headerEyebrow` and `styles.headerTitle`. Change the rendered text:

```tsx
// Change:
<Text style={styles.headerEyebrow}>
  {profile?.display_name ? `${profile.display_name.toUpperCase()}'S COLLECTION` : 'YOUR COLLECTION'}
</Text>
<Text style={styles.headerTitle}>
  {profile?.display_name ? `${profile.display_name}'s Tacos` : 'My Tacos'}
</Text>
// To:
<Text style={styles.headerEyebrow}>taco atlas</Text>
<Text style={styles.headerTitle}>
  {profile?.display_name ? `${profile.display_name}'s Atlas` : 'My Atlas'}
</Text>
```

**Step 2: Add avg rating pill (shows after 3+ rated spots)**

Below the existing spot count pill, add:

```tsx
{(() => {
  const ratedRows = rows.filter(r => r.avgRating !== null)
  if (ratedRows.length < 3) return null
  const avg = ratedRows.reduce((s, r) => s + (r.avgRating ?? 0), 0) / ratedRows.length
  return (
    <View style={styles.statPill}>
      <Text style={styles.statNumber}>★ {avg.toFixed(1)}</Text>
      <Text style={styles.statLabel}> avg</Text>
    </View>
  )
})()}
```

**Step 3: Add sort control**

Add a `sort` state:

```tsx
const [sort, setSort] = useState<'recent' | 'rating' | 'name'>('recent')
```

Add a sort row below the list/map toggle:

```tsx
<View style={styles.sortRow}>
  {(['recent', 'rating', 'name'] as const).map(s => (
    <TouchableOpacity
      key={s}
      style={[styles.sortChip, sort === s && styles.sortChipActive]}
      onPress={() => setSort(s)}
    >
      <Text style={[styles.sortChipText, sort === s && styles.sortChipTextActive]}>
        {s === 'recent' ? 'Recent' : s === 'rating' ? 'Rating' : 'Name'}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

Apply the sort to `filteredRows`:

```tsx
const filteredRows = rows
  .filter(({ vendor }) => {
    const matchesSearch = vendor.name.toLowerCase().includes(search.toLowerCase())
    const matchesType = filterType === null || vendor.spotType === filterType
    return matchesSearch && matchesType
  })
  .sort((a, b) => {
    if (sort === 'rating') return (b.avgRating ?? -1) - (a.avgRating ?? -1)
    if (sort === 'name') return a.vendor.name.localeCompare(b.vendor.name)
    return new Date(b.vendor.createdAt).getTime() - new Date(a.vendor.createdAt).getTime()
  })
```

**Step 4: Add spot type filter chips**

Add a horizontal scroll row of chips below search. Add `filterType` state (already exists in atlas.tsx — confirm it does). Add styles for `sortRow`, `sortChip`, `sortChipActive`, `sortChipText`, `sortChipTextActive` following the existing toggle button style pattern.

**Step 5: Update empty state**

Replace the current empty state with:

```tsx
<View style={styles.emptyState}>
  <Image source={require('../../assets/taco-icon.png')} style={styles.emptyIcon} resizeMode="contain" />
  <Text style={styles.emptyTitle}>Your atlas is empty</Text>
  <Text style={styles.emptySubtitle}>Tap + to log your first spot.</Text>
</View>
```

Remove the `+ Add a Spot` button from the empty state — the FAB handles that.

**Step 6: Update visit count display for unvisited pins**

In the card's right column, check `vendor.isVisited`:

```tsx
<View style={styles.cardRight}>
  {vendor.isVisited === false ? (
    <Text style={styles.nVisitLabel}>pin</Text>
  ) : (
    <>
      <Text style={styles.reviewCount}>{visitCount}</Text>
      <Text style={styles.reviewLabel}>visit{visitCount !== 1 ? 's' : ''}</Text>
    </>
  )}
</View>
```

Add `cardBorderStyle` to the card to show dashed border for unvisited pins:

```tsx
<TouchableOpacity
  style={[styles.card, vendor.isVisited === false && styles.cardUnvisited]}
  ...
>
```

```ts
cardUnvisited: {
  borderStyle: 'dashed',
  borderColor: colors.amberDim,
},
```

**Step 7: Commit**

```bash
git add "app/(tabs)/atlas.tsx"
git commit -m "feat: update Atlas tab header, sort, filter chips, and empty state"
```

---

### Task 8: Replace FAB with Quick Action Sheet

**Files:**
- Create: `src/components/QuickActionSheet.tsx`
- Modify: `app/(tabs)/atlas.tsx`

**Step 1: Create `src/components/QuickActionSheet.tsx`**

```tsx
import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'

interface Props {
  visible: boolean
  onClose: () => void
  onLogVisit: () => void
  onDropPin: () => void
}

export function QuickActionSheet({ visible, onClose, onLogVisit, onDropPin }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <TouchableOpacity style={styles.option} onPress={() => { onClose(); onLogVisit() }}>
          <View style={styles.optionIcon}>
            <Ionicons name="restaurant" size={22} color={colors.amber} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Log a Visit</Text>
            <Text style={styles.optionSubtitle}>Rate tacos, salsas, and more</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.creamDim} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.option} onPress={() => { onClose(); onDropPin() }}>
          <View style={styles.optionIcon}>
            <Ionicons name="location" size={22} color={colors.amber} />
          </View>
          <View style={styles.optionText}>
            <Text style={styles.optionTitle}>Drop a Pin</Text>
            <Text style={styles.optionSubtitle}>Save a spot for later</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.creamDim} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.surfaceBorder,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  optionIcon: {
    width: 44, height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.amberSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.amberDim,
  },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '700', color: colors.cream },
  optionSubtitle: { fontSize: 13, color: colors.creamMuted, marginTop: 2 },
  cancelBtn: {
    margin: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cancelText: { color: colors.creamMuted, fontWeight: '600', fontSize: 15 },
})
```

**Step 2: Wire the FAB in `app/(tabs)/atlas.tsx`**

Add state:
```tsx
const [showActionSheet, setShowActionSheet] = useState(false)
```

Change the FAB `onPress`:
```tsx
onPress={() => setShowActionSheet(true)}
```

Add the QuickActionSheet below the FAB:
```tsx
<QuickActionSheet
  visible={showActionSheet}
  onClose={() => setShowActionSheet(false)}
  onLogVisit={() => router.push('/review/add')}
  onDropPin={() => router.push('/pin/add')}
/>
```

**Step 3: Commit**

```bash
git add src/components/QuickActionSheet.tsx "app/(tabs)/atlas.tsx"
git commit -m "feat: FAB opens QuickActionSheet with Log Visit / Drop Pin options"
```

---

## Phase 4 — Location Picker Component

### Task 9: Build the LocationPicker component

Used in both the Drop a Pin screen and the Review Wizard (Step 1).

**Files:**
- Create: `src/components/LocationPicker.tsx`
- Create: `src/components/MapPinPicker.tsx`

**Step 1: Create `src/components/LocationPicker.tsx`**

```tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { locationService } from '../services/locationService'
import { googlePlacesService } from '../services/googlePlacesService'
import { colors, spacing, radius } from '../utils/theme'
import { MapPinPicker } from './MapPinPicker'

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
  const [method, setMethod] = useState<Method | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [taggingGps, setTaggingGps] = useState(false)

  async function handleGps() {
    setTaggingGps(true)
    try {
      const coords = await locationService.getCurrentLocation()
      if (coords) {
        let cityName: string | null = null
        try {
          const results = await (await import('expo-location')).reverseGeocodeAsync({
            latitude: coords.lat, longitude: coords.lng,
          })
          cityName = results[0]?.city ?? null
        } catch {}
        onChange({ lat: coords.lat, lng: coords.lng, address: null, cityName })
        setMethod('gps')
      }
    } finally {
      setTaggingGps(false)
    }
  }

  async function handleSearch(text: string) {
    setSearchQuery(text)
    if (text.length < 3) { setSearchResults([]); return }
    setSearching(true)
    try {
      // Reuse Google Places text search
      const results = await googlePlacesService.searchByText(text)
      setSearchResults(results)
    } finally {
      setSearching(false)
    }
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

  if (showMapPicker) {
    return (
      <MapPinPicker
        onConfirm={(result) => {
          onChange(result)
          setMethod('map')
          setShowMapPicker(false)
        }}
        onCancel={() => setShowMapPicker(false)}
      />
    )
  }

  // Show map snapshot if location is set
  if (value) {
    return (
      <TouchableOpacity style={styles.mapSnapshot} onPress={() => onChange(null)}>
        <MapView
          style={StyleSheet.absoluteFillObject}
          region={{ latitude: value.lat, longitude: value.lng, latitudeDelta: 0.005, longitudeDelta: 0.005 }}
          scrollEnabled={false} zoomEnabled={false} rotateEnabled={false}
          pitchEnabled={false} userInterfaceStyle="dark" pointerEvents="none"
        >
          <Marker coordinate={{ latitude: value.lat, longitude: value.lng }} />
        </MapView>
        <View style={styles.snapshotBadge}>
          <Ionicons name="location" size={14} color={colors.cream} />
          <Text style={styles.snapshotBadgeText}>Location tagged — tap to remove</Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View>
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
          <TextInput
            style={styles.searchInput}
            placeholder="Search address or place name..."
            placeholderTextColor={colors.creamDim}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searching && <ActivityIndicator color={colors.amber} style={{ marginTop: spacing.sm }} />}
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  methodLabel: { fontSize: 11, color: colors.creamMuted, fontWeight: '600' },
  mapSnapshot: { height: 140, borderRadius: radius.md, overflow: 'hidden', marginBottom: spacing.md },
  snapshotBadge: {
    position: 'absolute', bottom: spacing.sm, left: spacing.sm,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(24,20,15,0.85)',
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full,
  },
  snapshotBadgeText: { color: colors.cream, fontSize: 12 },
  searchInput: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.cream,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  resultText: { flex: 1, color: colors.cream, fontSize: 14 },
  resultAddress: { color: colors.creamMuted, fontSize: 12 },
})
```

**Step 2: Add `searchByText` to `googlePlacesService.ts`**

Open `src/services/googlePlacesService.ts` and add a text search method that the LocationPicker can use. This wraps the Places Text Search API:

```ts
async searchByText(query: string): Promise<{ name: string; lat: number; lng: number; address: string | null; city: string | null }[]> {
  // Uses Google Places Text Search — implement using the existing API key
  // Follow the same pattern as the existing searchNearby method
  // Return an array of { name, lat, lng, address, city }
  // Check rate limiting the same way as searchNearby
}
```

Reference the existing `searchNearby` implementation in the same file for the API call pattern.

**Step 3: Create `src/components/MapPinPicker.tsx`**

```tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import MapView, { Marker } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'
import type { LocationResult } from './LocationPicker'

interface Props {
  onConfirm: (result: LocationResult) => void
  onCancel: () => void
}

export function MapPinPicker({ onConfirm, onCancel }: Props) {
  const [region, setRegion] = useState({
    latitude: 32.7157,   // Default: San Diego
    longitude: -117.1611,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  })
  const [resolving, setResolving] = useState(false)

  async function handleConfirm() {
    setResolving(true)
    let cityName: string | null = null
    try {
      const results = await (await import('expo-location')).reverseGeocodeAsync({
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
        style={StyleSheet.absoluteFillObject}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        userInterfaceStyle="dark"
        showsUserLocation
      />
      {/* Fixed crosshair */}
      <View style={styles.crosshairContainer} pointerEvents="none">
        <Ionicons name="location" size={40} color={colors.amber} />
      </View>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Ionicons name="close" size={20} color={colors.cream} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Move map to the spot</Text>
        <View style={{ width: 36 }} />
      </View>
      {/* Confirm button */}
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
    marginBottom: 20, // offset for pin tail
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

**Step 4: Commit**

```bash
git add src/components/LocationPicker.tsx src/components/MapPinPicker.tsx src/services/googlePlacesService.ts
git commit -m "feat: LocationPicker component with GPS, Search, and Drop on Map methods"
```

---

## Phase 5 — Drop a Pin Flow

### Task 10: Build the Drop a Pin screen

**Files:**
- Create: `app/pin/add.tsx`
- Modify: `app/_layout.tsx` (add route)

**Step 1: Create `app/pin/add.tsx`**

```tsx
import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { localStorageService } from '../../src/services/localStorage'
import { LocationPicker } from '../../src/components/LocationPicker'
import { colors, spacing, radius, typography } from '../../src/utils/theme'
import type { SpotType, PrivacySetting, LocationResult } from '../../src/types/app'

const SPOT_TYPES: SpotType[] = ['Truck', 'Food Cart', 'Street Tent', 'House', 'Brick & Mortar', 'Restaurant']

const PRIVACY_OPTIONS: { value: PrivacySetting; label: string; icon: string }[] = [
  { value: 'public', label: 'Public', icon: '🌎' },
  { value: 'friends', label: 'Mi Gente', icon: '👥' },
  { value: 'private', label: 'Just Me', icon: '🔒' },
]

export default function DropPinScreen() {
  const [name, setName] = useState('')
  const [spotType, setSpotType] = useState<SpotType | null>(null)
  const [location, setLocation] = useState<LocationResult | null>(null)
  const [privacy, setPrivacy] = useState<PrivacySetting>('public')
  const [spotNote, setSpotNote] = useState('')
  const [showSpotNote, setShowSpotNote] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Give this spot a name.')
      return
    }
    setSaving(true)
    try {
      await localStorageService.addVendor({
        name: name.trim(),
        spotType,
        lat: location?.lat ?? 0,
        lng: location?.lng ?? 0,
        address: location?.address ?? null,
        cityName: location?.cityName ?? null,
        hours: null,
        photoUri: null,
        privacy,
        spotNote: spotNote.trim() || null,
        isVisited: false,
      })
      router.back()
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Image
        source={require('../../assets/background.png')}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={colors.cream} />
        </TouchableOpacity>
        <Text style={styles.title}>Drop a Pin</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.nameInput}
          placeholder="Taco spot name"
          placeholderTextColor={colors.creamDim}
          value={name}
          onChangeText={setName}
          autoFocus
        />

        <Text style={styles.fieldLabel}>Type of Spot</Text>
        <View style={styles.chipGrid}>
          {SPOT_TYPES.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, spotType === t && styles.chipActive]}
              onPress={() => setSpotType(prev => prev === t ? null : t)}
            >
              <Text style={[styles.chipText, spotType === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Location</Text>
        <LocationPicker value={location} onChange={setLocation} />

        <Text style={styles.fieldLabel}>Who can see this?</Text>
        <View style={styles.privacyRow}>
          {PRIVACY_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.privacyBtn, privacy === opt.value && styles.privacyBtnActive]}
              onPress={() => setPrivacy(opt.value)}
            >
              <Text style={styles.privacyIcon}>{opt.icon}</Text>
              <Text style={[styles.privacyLabel, privacy === opt.value && styles.privacyLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.noteToggle}
          onPress={() => setShowSpotNote(s => !s)}
        >
          <Ionicons name={showSpotNote ? 'chevron-down' : 'chevron-forward'} size={14} color={colors.creamMuted} />
          <Text style={styles.noteToggleText}>Add a note about this spot</Text>
        </TouchableOpacity>
        {showSpotNote && (
          <TextInput
            style={styles.noteInput}
            placeholder="Cash only, opens at 3pm, park on Valencia..."
            placeholderTextColor={colors.creamDim}
            value={spotNote}
            onChangeText={setSpotNote}
            multiline
            numberOfLines={3}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Pin'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: spacing.md, paddingBottom: spacing.md,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(36,28,22,0.8)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.cream },
  scroll: { padding: spacing.md, paddingBottom: 100 },
  nameInput: {
    backgroundColor: 'rgba(36,28,22,0.85)',
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 18,
    fontWeight: '700',
    color: colors.cream,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: spacing.md,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.creamMuted, marginBottom: spacing.sm, marginTop: spacing.sm },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.surfaceBorder,
    backgroundColor: 'rgba(36,28,22,0.6)',
  },
  chipActive: { backgroundColor: colors.amber, borderColor: colors.amber },
  chipText: { color: colors.creamMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.cream },
  privacyRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  privacyBtn: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm + 4,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceRaised,
  },
  privacyBtnActive: { borderColor: colors.amber, backgroundColor: colors.amberSubtle },
  privacyIcon: { fontSize: 18, marginBottom: 4 },
  privacyLabel: { fontSize: 11, color: colors.creamMuted, fontWeight: '600' },
  privacyLabelActive: { color: colors.amber },
  noteToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  noteToggleText: { color: colors.creamMuted, fontSize: 13 },
  noteInput: {
    backgroundColor: colors.surfaceRaised, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    padding: spacing.md, color: colors.cream, fontSize: 14,
    textAlignVertical: 'top', minHeight: 80,
  },
  footer: { padding: spacing.md, paddingBottom: 36 },
  saveBtn: {
    backgroundColor: colors.amber, borderRadius: radius.full,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnText: { color: colors.cream, fontWeight: '700', fontSize: 16 },
})
```

**Step 2: Register the route in `app/_layout.tsx`**

Add to the Stack:
```tsx
<Stack.Screen name="pin/add" options={{ headerShown: false, presentation: 'modal' }} />
```

**Step 3: Commit**

```bash
git add app/pin/add.tsx app/_layout.tsx
git commit -m "feat: Drop a Pin screen with name, type, 3-method location picker, privacy, and spot note"
```

---

## Phase 6 — Review Wizard Overhaul (3 Steps)

### Task 11: Update ReviewFormStore for new fields

**Files:**
- Modify: `src/store/reviewFormStore.ts`

**Step 1: Replace the store**

The store needs new fields for: privacy, spotNote, burritoEntries, tortaEntries, activeCategory (which icon bar tab is active), and step count changes (1–3 not 1–5).

```ts
import { create } from 'zustand'
import type { LocalTacoEntry, LocalSalsaEntry, LocalReview, SpotType, PrivacySetting,
  LocalBurritoEntry, LocalTortaEntry } from '../types/app'

export type FoodCategory = 'tacos' | 'burritos' | 'tortas' | 'salsas'

interface ReviewFormState {
  // Step 1
  vendorName: string
  spotType: SpotType | null
  lat: number | null
  lng: number | null
  address: string | null
  cityName: string | null
  privacy: PrivacySetting
  spotNote: string
  // Step 2
  activeCategory: FoodCategory
  tacoEntries: LocalTacoEntry[]
  burritoEntries: LocalBurritoEntry[]
  tortaEntries: LocalTortaEntry[]
  salsaEntries: LocalSalsaEntry[]
  condiments: string[]
  // Step 3
  overallRating: number
  returnIntent: 'yes' | 'maybe' | 'no' | null
  notes: string
  photoUris: string[]
  // Edit mode
  editingReviewLocalId: string | null
  editingVendorLocalId: string | null
  // Navigation
  currentStep: number  // 1–3
  // Actions
  setField: <K extends keyof ReviewFormState>(key: K, value: ReviewFormState[K]) => void
  setActiveCategory: (cat: FoodCategory) => void
  addTacoEntry: (entry: LocalTacoEntry) => void
  removeTacoEntry: (index: number) => void
  updateTacoEntry: (index: number, updates: Partial<LocalTacoEntry>) => void
  addBurritoEntry: (entry: LocalBurritoEntry) => void
  removeBurritoEntry: (index: number) => void
  addTortaEntry: (entry: LocalTortaEntry) => void
  removeTortaEntry: (index: number) => void
  addSalsaEntry: (entry: LocalSalsaEntry) => void
  removeSalsaEntry: (index: number) => void
  toggleCondiment: (name: string) => void
  loadForEdit: (review: LocalReview, vendorName: string) => void
  addPhoto: (uri: string) => void
  removePhoto: (uri: string) => void
  nextStep: () => void
  prevStep: () => void
  reset: () => void
}
```

Update `nextStep`/`prevStep` to cap at 3:
```ts
nextStep: () => set(s => ({ currentStep: Math.min(s.currentStep + 1, 3) })),
prevStep: () => set(s => ({ currentStep: Math.max(1, s.currentStep - 1) })),
```

**Step 2: Run existing store tests**

```bash
npx jest src/store --no-coverage
```

Fix any type errors surfaced.

**Step 3: Commit**

```bash
git add src/store/reviewFormStore.ts
git commit -m "feat: update ReviewFormStore — 3 steps, privacy, burrito/torta entries, activeCategory"
```

---

### Task 12: Build the FoodIconBar component

**Files:**
- Create: `src/components/FoodIconBar.tsx`

**Step 1: Create `src/components/FoodIconBar.tsx`**

```tsx
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Image } from 'react-native'  // standard RN Image for SVGs via transformer
import type { FoodCategory } from '../store/reviewFormStore'
import { colors, spacing, radius } from '../utils/theme'
import { useProStore } from '../store/proStore'

// SVG assets — two states per category
const ICONS: Record<FoodCategory, { dim: any; lit: any; proOnly?: boolean }> = {
  tacos:    { dim: require('../../assets/taco-dk.svg'),    lit: require('../../assets/taco-lt.svg') },
  burritos: { dim: require('../../assets/burrito-dk.svg'), lit: require('../../assets/burrito-lt.svg'), proOnly: true },
  tortas:   { dim: require('../../assets/torta-dk.svg'),   lit: require('../../assets/torta-lt.svg'),   proOnly: true },
  salsas:   { dim: require('../../assets/salsa-dk.svg'),   lit: require('../../assets/salsa-lt.svg') },
}

const CATEGORIES: FoodCategory[] = ['tacos', 'burritos', 'tortas', 'salsas']

interface Props {
  active: FoodCategory
  litCategories: FoodCategory[]   // categories with at least one rated item
  onSelect: (cat: FoodCategory) => void
  onProGate: () => void           // called when a Pro-locked category is tapped by free user
}

export function FoodIconBar({ active, litCategories, onSelect, onProGate }: Props) {
  const { isPro } = useProStore()

  return (
    <View style={styles.bar}>
      {CATEGORIES.map(cat => {
        const cfg = ICONS[cat]
        const isLit = litCategories.includes(cat) || active === cat
        const isLocked = cfg.proOnly && !isPro
        const isActive = active === cat

        return (
          <TouchableOpacity
            key={cat}
            style={[styles.iconBtn, isActive && styles.iconBtnActive]}
            onPress={() => isLocked ? onProGate() : onSelect(cat)}
          >
            <Image
              source={isLit ? cfg.lit : cfg.dim}
              style={styles.icon}
              resizeMode="contain"
            />
            {isLocked && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>Pro</Text>
              </View>
            )}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    position: 'relative',
  },
  iconBtnActive: {
    backgroundColor: colors.amberSubtle,
    borderWidth: 1,
    borderColor: colors.amberDim,
  },
  icon: { width: 36, height: 36 },
  proBadge: {
    position: 'absolute',
    top: 2, right: 2,
    backgroundColor: colors.amber,
    borderRadius: radius.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  proBadgeText: { fontSize: 8, fontWeight: '800', color: colors.bg },
})
```

**Step 2: Commit**

```bash
git add src/components/FoodIconBar.tsx
git commit -m "feat: FoodIconBar component — 4 icons, dim/lit states, Pro gating"
```

---

### Task 13: Build ChipScorecard component

The chip-based item selector used inside each food category tab.

**Files:**
- Create: `src/components/ChipScorecard.tsx`

**Step 1: Create `src/components/ChipScorecard.tsx`**

```tsx
import { useState } from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { TacoRating } from './TacoRating'
import { colors, spacing, radius } from '../utils/theme'

interface ScorecardItem {
  label: string
  rating: number
  notes: string | null
}

interface Props {
  presets?: string[]        // preset chip labels (tacos, burritos, tortas)
  freeform?: boolean        // true for salsas — shows text input instead of chips
  items: ScorecardItem[]
  onAdd: (item: ScorecardItem) => void
  onRemove: (index: number) => void
  onUpdate: (index: number, updates: Partial<ScorecardItem>) => void
  // For salsas only
  heatLevels?: string[]
  renderHeatPicker?: (item: ScorecardItem, index: number) => React.ReactNode
}

export function ChipScorecard({
  presets, freeform, items, onAdd, onRemove, onUpdate, renderHeatPicker,
}: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [pendingLabel, setPendingLabel] = useState('')
  const [pendingRating, setPendingRating] = useState(0)
  const [pendingNotes, setPendingNotes] = useState('')

  const addedLabels = new Set(items.map(i => i.label.toLowerCase()))

  function handlePresetTap(label: string) {
    if (addedLabels.has(label.toLowerCase())) {
      // Find and expand for editing
      const idx = items.findIndex(i => i.label.toLowerCase() === label.toLowerCase())
      setExpandedIndex(idx === expandedIndex ? null : idx)
    } else {
      // Add with default rating 0 and expand inline
      onAdd({ label, rating: 0, notes: null })
      setExpandedIndex(items.length) // will be the new last index
    }
  }

  function handleFreeformAdd() {
    if (!pendingLabel.trim() || !pendingRating) return
    onAdd({ label: pendingLabel.trim(), rating: pendingRating, notes: pendingNotes.trim() || null })
    setPendingLabel('')
    setPendingRating(0)
    setPendingNotes('')
  }

  return (
    <View>
      {/* Rated items */}
      {items.map((item, idx) => (
        <View key={idx}>
          <TouchableOpacity
            style={styles.ratedChip}
            onPress={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
          >
            <Text style={styles.ratedChipLabel}>{item.label}</Text>
            <TacoRating value={item.rating} readonly size={14} />
            <TouchableOpacity onPress={() => { onRemove(idx); setExpandedIndex(null) }}>
              <Ionicons name="close-circle" size={18} color={colors.creamDim} />
            </TouchableOpacity>
          </TouchableOpacity>
          {expandedIndex === idx && (
            <View style={styles.expanded}>
              <TacoRating value={item.rating} onChange={r => onUpdate(idx, { rating: r })} />
              {renderHeatPicker?.(item, idx)}
              <TextInput
                style={styles.noteInput}
                placeholder="Quick note..."
                placeholderTextColor={colors.creamDim}
                value={item.notes ?? ''}
                onChangeText={t => onUpdate(idx, { notes: t || null })}
              />
            </View>
          )}
        </View>
      ))}

      {/* Preset chips (tacos/burritos/tortas) */}
      {presets && (
        <View style={styles.presetGrid}>
          {presets.map(label => {
            const isAdded = addedLabels.has(label.toLowerCase())
            return (
              <TouchableOpacity
                key={label}
                style={[styles.presetChip, isAdded && styles.presetChipAdded]}
                onPress={() => handlePresetTap(label)}
              >
                <Text style={[styles.presetChipText, isAdded && styles.presetChipTextAdded]}>
                  {label}
                </Text>
                {isAdded && <Ionicons name="checkmark" size={12} color={colors.amber} />}
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* Freeform entry (salsas) */}
      {freeform && (
        <View style={styles.freeformEntry}>
          <TextInput
            style={styles.freeformInput}
            placeholder="Salsa name (e.g. Salsa Verde)"
            placeholderTextColor={colors.creamDim}
            value={pendingLabel}
            onChangeText={setPendingLabel}
          />
          <TacoRating value={pendingRating} onChange={setPendingRating} />
          <TextInput
            style={styles.noteInput}
            placeholder="Quick note..."
            placeholderTextColor={colors.creamDim}
            value={pendingNotes}
            onChangeText={setPendingNotes}
          />
          <TouchableOpacity
            style={[styles.addBtn, (!pendingLabel.trim() || !pendingRating) && styles.addBtnDisabled]}
            onPress={handleFreeformAdd}
            disabled={!pendingLabel.trim() || !pendingRating}
          >
            <Text style={styles.addBtnText}>Add Salsa</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  ratedChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.amberSubtle,
    borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.amberDim, marginBottom: spacing.sm,
  },
  ratedChipLabel: { flex: 1, color: colors.cream, fontSize: 14, fontWeight: '600' },
  expanded: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  presetChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.surfaceBorder,
    backgroundColor: 'rgba(36,28,22,0.6)',
  },
  presetChipAdded: { borderColor: colors.amber, backgroundColor: colors.amberSubtle },
  presetChipText: { color: colors.creamMuted, fontSize: 13, fontWeight: '600' },
  presetChipTextAdded: { color: colors.amber },
  freeformEntry: { marginTop: spacing.sm },
  freeformInput: {
    backgroundColor: colors.surfaceRaised, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    padding: spacing.md, color: colors.cream, fontSize: 14, marginBottom: spacing.sm,
  },
  noteInput: {
    backgroundColor: 'rgba(36,28,22,0.5)', borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.surfaceBorder,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    color: colors.creamMuted, fontSize: 13, marginTop: spacing.sm,
  },
  addBtn: {
    backgroundColor: colors.amber, borderRadius: radius.md,
    padding: spacing.sm + 2, alignItems: 'center', marginTop: spacing.sm,
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: colors.cream, fontWeight: '700', fontSize: 14 },
})
```

**Step 2: Commit**

```bash
git add src/components/ChipScorecard.tsx
git commit -m "feat: ChipScorecard — preset and freeform item rating with inline expand and quick notes"
```

---

### Task 14: Rewrite the Review Wizard (app/review/add.tsx)

This is the largest single file change. The 5-step wizard becomes a 3-step wizard.

**Files:**
- Modify: `app/review/add.tsx`

**Step 1: Replace Step 1 — The Spot**

Step 1 now includes: spot name, spot type chips, LocationPicker (3-method), privacy toggle, and "About This Spot" collapsible note.

Remove the old `handleGpsTag` function — location is now handled by `LocationPicker`.

Add the privacy toggle row using the same pattern as `app/pin/add.tsx`.

Add the `LocationPicker` import and render it in Step 1 where the old `gpsButton` was.

**Step 2: Replace Step 2 — What'd You Have?**

Replace the old separate taco/salsa steps with the `FoodIconBar` + `ChipScorecard` pattern.

The step renders:
1. `<FoodIconBar>` at top, controlling `store.activeCategory`
2. A `<ChipScorecard>` rendered for the active category:
   - Tacos: presets=TACO_TYPES
   - Burritos: presets=BURRITO_TYPES (Pro)
   - Tortas: presets=TORTA_TYPES (Pro)
   - Salsas: freeform=true, with heat level picker per item
3. A small condiment chip row at the bottom: "Also available:" — the existing chip pattern

Add BURRITO_TYPES and TORTA_TYPES arrays:
```ts
const BURRITO_TYPES = ['California', 'Birria', 'Carne Asada', 'Pollo', 'Chorizo', 'Bean & Cheese', 'Wet', 'Other']
const TORTA_TYPES = ['Milanesa', 'Cubana', 'Pierna', 'Al Pastor', 'Chorizo', 'Other']
```

**Step 3: Replace Step 3 — Your Verdict**

Change return intent options from `'yes'/'maybe'/'no'` labels to `'Hell yes'/'Maybe'/'Nah'` display text while keeping the underlying store values as `'yes'/'maybe'/'no'` for data compatibility:

```tsx
{(['yes', 'maybe', 'no'] as const).map(intent => {
  const label = intent === 'yes' ? 'Hell yes 🤙' : intent === 'maybe' ? 'Maybe' : 'Nah'
  return (
    <TouchableOpacity
      key={intent}
      style={[styles.intentBtn, store.returnIntent === intent && styles.intentBtnActive]}
      onPress={() => store.setField('returnIntent', intent)}
    >
      <Text style={[styles.intentText, store.returnIntent === intent && styles.intentTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  )
})}
```

**Step 4: Update step dots — 3 dots with step name label**

```tsx
<View style={styles.stepRow}>
  {(['The Spot', "What'd You Have?", 'Your Verdict'] as const).map((label, i) => {
    const step = i + 1
    const isActive = store.currentStep === step
    return (
      <View key={step} style={styles.stepItem}>
        <View style={[styles.stepDot, isActive && styles.stepDotActive]} />
        <Text style={[styles.stepLabel, isActive && styles.stepLabelActive]}>{label}</Text>
      </View>
    )
  })}
</View>
```

**Step 5: Add X (close/discard) button**

At the top-left, add a close button that shows an Alert:

```tsx
<TouchableOpacity
  style={styles.closeBtn}
  onPress={() =>
    Alert.alert('Ditch this visit?', 'Your progress will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Ditch it', style: 'destructive', onPress: () => { store.reset(); router.back() } },
    ])
  }
>
  <Ionicons name="close" size={20} color={colors.cream} />
</TouchableOpacity>
```

**Step 6: Handle "About This Spot" note persistence**

In `handleSubmit`, when saving a new vendor, include `spotNote` from the store:

```ts
const vendor = await localStorageService.addVendor({
  ...
  spotNote: store.spotNote.trim() || null,
  privacy: store.privacy,
  isVisited: true,
})
```

When editing an existing review, also update the vendor's spotNote if it changed (use `localStorageService.updateVendor`).

**Step 7: Run app and manually test all 3 steps flow through**

```bash
npx expo start
```

Navigate: FAB → Log a Visit → complete all 3 steps → verify spot appears in Atlas.

**Step 8: Commit**

```bash
git add app/review/add.tsx
git commit -m "feat: rewrite review wizard — 3 steps, FoodIconBar, ChipScorecard, location picker, privacy"
```

---

## Phase 7 — Spot Detail Updates

### Task 15: Update Spot Detail screen

**Files:**
- Modify: `app/spot/[localId].tsx`

**Step 1: Move delete to overflow menu**

Remove the `deleteBtn` from the header row. Add a `...` button in its place that shows an ActionSheet:

```tsx
<TouchableOpacity
  style={styles.overflowBtn}
  onPress={() =>
    Alert.alert('Spot Options', undefined, [
      { text: 'Edit Spot Info', onPress: () => router.push({ pathname: '/pin/add', params: { editLocalId: localId } }) },
      { text: 'Delete Spot', style: 'destructive', onPress: handleDelete },
      { text: 'Cancel', style: 'cancel' },
    ])
  }
>
  <Ionicons name="ellipsis-horizontal" size={22} color={colors.cream} />
</TouchableOpacity>
```

**Step 2: Add "About This Spot" note section**

Below the header, above the stats row:

```tsx
{vendor.spotNote ? (
  <View style={styles.spotNoteRow}>
    <Ionicons name="information-circle-outline" size={16} color={colors.amber} />
    <Text style={styles.spotNoteText}>{vendor.spotNote}</Text>
    <TouchableOpacity onPress={handleEditSpotNote}>
      <Ionicons name="pencil" size={14} color={colors.creamDim} />
    </TouchableOpacity>
  </View>
) : (
  <TouchableOpacity style={styles.addSpotNote} onPress={handleEditSpotNote}>
    <Text style={styles.addSpotNoteText}>+ Add a note about this spot</Text>
  </TouchableOpacity>
)}
```

**Step 3: Show "Log Your Visit" button for unvisited pins**

If `vendor.isVisited === false`:

```tsx
{vendor.isVisited === false && (
  <TouchableOpacity
    style={styles.logVisitBtn}
    onPress={() => router.push({ pathname: '/review/add', params: { vendorLocalId: vendor.localId, vendorName: vendor.name } })}
  >
    <Ionicons name="restaurant" size={20} color={colors.cream} />
    <Text style={styles.logVisitBtnText}>Log Your First Visit</Text>
  </TouchableOpacity>
)}
```

**Step 4: Add FoodIconBar to visit cards**

Import `FoodIconBar`. For each review card, compute `litCategories`:

```tsx
function getLitCategories(review: LocalReview): FoodCategory[] {
  const lit: FoodCategory[] = []
  if (review.tacoEntries.length > 0) lit.push('tacos')
  if ((review.burritoEntries ?? []).length > 0) lit.push('burritos')
  if ((review.tortaEntries ?? []).length > 0) lit.push('tortas')
  if (review.salsaEntries.length > 0) lit.push('salsas')
  return lit
}
```

In the visit card header, render a read-only icon bar (not tappable in detail view):

```tsx
<View style={styles.reviewHeader}>
  <Text style={styles.reviewDate}>
    {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
  </Text>
  <View style={styles.visitIconBar}>
    {/* Small read-only version of the 4 icons */}
    {(['tacos','burritos','tortas','salsas'] as FoodCategory[]).map(cat => {
      const isLit = getLitCategories(review).includes(cat)
      return (
        <Image
          key={cat}
          source={isLit ? ICONS[cat].lit : ICONS[cat].dim}
          style={styles.visitIcon}
          resizeMode="contain"
        />
      )
    })}
  </View>
</View>
```

Date style: small, muted — `fontSize: 11, color: colors.creamDim, fontWeight: '500'`

**Step 5: Update return intent display text**

In the intent badge, map the stored values to the new display text:

```tsx
const intentLabel = review.returnIntent === 'yes' ? 'Hell yes 🤙'
  : review.returnIntent === 'maybe' ? 'Maybe'
  : 'Nah'
```

**Step 6: Commit**

```bash
git add app/spot/[localId].tsx
git commit -m "feat: spot detail — overflow menu, About This Spot note, visit icon bar, Log Your Visit CTA"
```

---

## Phase 8 — Explore Tab

### Task 16: Update Explore tab (renamed from index)

**Files:**
- Modify: `app/(tabs)/explore.tsx`

**Step 1: Update header**

```tsx
<View style={styles.header}>
  <Text style={styles.headerEyebrow}>taco atlas</Text>
  <Text style={styles.headerTitle}>Explore</Text>
  {locationSubtitle ? (
    <View style={styles.locationRow}>
      <Ionicons name="location-sharp" size={12} color={colors.amber} />
      <Text style={styles.locationText}>{locationSubtitle}</Text>
    </View>
  ) : null}
</View>
```

Add `locationSubtitle` state that updates to `"Near [city]"` once coords resolve, or `"Finding your location..."` while loading.

**Step 2: Restructure feed into two labeled sections**

Replace the current `ListFooterComponent` approach with explicit sections in the FlatList `data`:

Use a single FlatList with section headers. The simplest approach: keep two separate lists rendered sequentially in a ScrollView (since the data sets are small):

```tsx
<ScrollView ...>
  {/* Section 1 — In the Atlas */}
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>In the Atlas</Text>
  </View>
  {vendors.map(v => <VendorCard key={v.id} ... />)}

  {/* Section 2 — On Google */}
  {googlePlaces.length > 0 && (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>On Google</Text>
        {searchesLoaded && remainingSearches !== null && (
          <Text style={styles.searchesLeft}>{remainingSearches} searches left today</Text>
        )}
      </View>
      {googlePlaces.map(p => <GooglePlaceCard key={p.id} ... />)}
    </>
  )}
</ScrollView>
```

**Step 3: Add location-denied empty state**

```tsx
if (locationDenied) {
  return (
    <View style={styles.center}>
      <Ionicons name="location-outline" size={48} color={colors.creamDim} />
      <Text style={styles.emptyTitle}>Location needed</Text>
      <Text style={styles.emptySubtext}>Enable location in Settings to find spots near you.</Text>
      <TouchableOpacity style={styles.enableBtn} onPress={() => Linking.openSettings()}>
        <Text style={styles.enableBtnText}>Enable Location</Text>
      </TouchableOpacity>
    </View>
  )
}
```

**Step 4: Commit**

```bash
git add "app/(tabs)/explore.tsx"
git commit -m "feat: Explore tab — renamed, two labeled sections, location subtitle, denied state"
```

---

## Phase 9 — Profile Tab

### Task 17: Build the Profile tab

**Files:**
- Modify: `app/(tabs)/profile.tsx` (replace the stub)

**Step 1: Top section — avatar + identity**

Reuse the avatar picker logic from `app/settings.tsx`. Display: avatar, display name, home city, favorite taco, stat pills (spots + visits counts).

**Step 2: Stats section**

Compute stats from local storage on `useFocusEffect`. Show 2 unlocked, rest with blur + Pro badge:

```tsx
const FREE_STATS = ['totalSpots', 'avgRating']
const PRO_STATS = ['topCity', 'topSpot', 'heatBreakdown', 'favSpotType']
```

For locked stats, render a blurred card with a `ProPaywallModal` trigger.

**Step 3: Mi Gente section (Pro locked teaser)**

```tsx
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Mi Gente</Text>
  {isPro ? (
    <MiGenteList />   // future component — stub for now
  ) : (
    <TouchableOpacity style={styles.lockedCard} onPress={() => setShowPaywall(true)}>
      <Text style={styles.lockedCardText}>Connect with your taco crew</Text>
      <View style={styles.proBadge}><Text style={styles.proBadgeText}>Pro</Text></View>
    </TouchableOpacity>
  )}
</View>
```

**Step 4: Gear icon → Settings**

Add gear icon to top-right of the screen header:

```tsx
<TouchableOpacity style={styles.gearBtn} onPress={() => router.push('/settings')}>
  <Ionicons name="settings-outline" size={22} color={colors.creamMuted} />
</TouchableOpacity>
```

**Step 5: Upgrade card for free users**

Between stats and Mi Gente:

```tsx
{!isPro && (
  <TouchableOpacity style={styles.upgradeCard} onPress={() => setShowPaywall(true)}>
    <Text style={styles.upgradeTitle}>Unlock TacoAtlas Pro</Text>
    <Text style={styles.upgradePrice}>$3.99 one-time</Text>
    <Text style={styles.upgradeSubtitle}>Unlimited spots · Cloud sync · Mi Gente · Stats</Text>
    <View style={styles.upgradeBtn}>
      <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
    </View>
  </TouchableOpacity>
)}
```

**Step 6: Commit**

```bash
git add "app/(tabs)/profile.tsx"
git commit -m "feat: Profile tab — avatar, stats (free/locked), Mi Gente teaser, upgrade card, gear to Settings"
```

---

## Phase 10 — Vendor Detail Retheme

### Task 18: Retheme and restructure vendor/[id].tsx

**Files:**
- Modify: `app/vendor/[id].tsx`

**Step 1: Replace all `colors.cream` background references with `colors.bg`**

Find: `backgroundColor: colors.cream` and `backgroundColor: colors.white`
Replace: `colors.bg` and `colors.surface` as appropriate.

Find text colors using old aliases (`colors.brown`, `colors.brownLight`, `colors.gray500`, `colors.gray700`)
Replace: `colors.cream`, `colors.creamMuted`, `colors.creamDim` respectively.

**Step 2: Restructure layout — Zone 1: The Spot**

```tsx
{/* Zone 1 — The Spot */}
<View style={styles.zone1}>
  {vendor.photo_url && (
    <Image source={{ uri: vendor.photo_url }} style={styles.heroPhoto} />
  )}
  <View style={styles.spotInfo}>
    <Text style={styles.name}>{vendor.name}</Text>
    {/* spot type badge */}
    {vendor.city && <Text style={styles.city}>{vendor.city.name}</Text>}
    {vendor.hours && (
      <View style={styles.hoursRow}>
        <Ionicons name="time-outline" size={14} color={colors.creamMuted} />
        <Text style={styles.hours}>{vendor.hours}</Text>
      </View>
    )}
  </View>
</View>
```

**Step 3: Restructure layout — Zone 2: The Verdict**

Replace the existing scattered sections with:

1. Community rating bar (TacoRating + avg score + review count)
2. "Coming back?" segmented bar — green/yellow/red with percentages

```tsx
const total = Object.values(returnCounts).reduce((s, n) => s + n, 0)
// Render a segmented bar:
<View style={styles.returnBar}>
  {total > 0 && (
    <>
      {returnCounts.yes > 0 && (
        <View style={[styles.returnSegment, { flex: returnCounts.yes, backgroundColor: colors.success }]}>
          <Text style={styles.returnPct}>{Math.round(returnCounts.yes/total*100)}%</Text>
        </View>
      )}
      {returnCounts.maybe > 0 && (
        <View style={[styles.returnSegment, { flex: returnCounts.maybe, backgroundColor: colors.warning }]}>
          <Text style={styles.returnPct}>{Math.round(returnCounts.maybe/total*100)}%</Text>
        </View>
      )}
      {returnCounts.no > 0 && (
        <View style={[styles.returnSegment, { flex: returnCounts.no, backgroundColor: colors.error }]}>
          <Text style={styles.returnPct}>{Math.round(returnCounts.no/total*100)}%</Text>
        </View>
      )}
    </>
  )}
</View>
```

3. Tacos section: clean rows with name + TacoRating + count
4. Salsas section: rows with heat color dot instead of text badge
5. Condiments: chip row

**Step 4: Commit**

```bash
git add app/vendor/[id].tsx
git commit -m "feat: vendor detail — dark theme retheme, Zone 1/Zone 2 structure, coming-back segmented bar"
```

---

## Phase 11 — Final Cleanup & Verification

### Task 19: End-to-end smoke test

**Step 1: Boot the app clean**

```bash
npx expo start --clear
```

**Step 2: Walk through all critical paths**

- [ ] App opens → Landing screen shown
- [ ] "Continue without account" → goes to Atlas tab, not shown again on restart
- [ ] Atlas tab: header shows "My Atlas", 3 controls (sort, search, filter chips) visible
- [ ] FAB → Quick action sheet shows Log a Visit / Drop a Pin
- [ ] Drop a Pin → completes with GPS / Search / Drop on Map all working, pin appears in Atlas with dashed border
- [ ] Log a Visit → all 3 steps complete, spot appears in Atlas
- [ ] Step 2 icon bar: tacos and salsas work, burritos/tortas show paywall for free user
- [ ] Spot detail: overflow menu has Delete, "About This Spot" note editable, visit card shows icon bar with date minimized
- [ ] Explore tab: two sections (In the Atlas / On Google), location subtitle shows
- [ ] Profile tab: stats, upgrade card, gear → Settings
- [ ] Settings screen: back button, all 3 sections work
- [ ] Vendor detail: dark theme, Zone 1 / Zone 2 layout

**Step 3: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all existing tests pass. Fix any type errors from the type changes.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: TacoAtlas UX redesign — 3-tab nav, 3-step wizard, Drop a Pin, location picker, food icon bar, Profile tab"
```

---

## File Change Summary

| File | Action |
|------|--------|
| `metro.config.js` | Create |
| `src/types/svg.d.ts` | Create |
| `src/types/app.ts` | Modify — new fields |
| `src/services/localStorage.ts` | Modify — normalizers, updateVendor |
| `src/store/reviewFormStore.ts` | Modify — 3 steps, new fields |
| `src/store/authStore.ts` | Modify — hasCompletedOnboarding |
| `src/components/QuickActionSheet.tsx` | Create |
| `src/components/LocationPicker.tsx` | Create |
| `src/components/MapPinPicker.tsx` | Create |
| `src/components/FoodIconBar.tsx` | Create |
| `src/components/ChipScorecard.tsx` | Create |
| `app/landing.tsx` | Create |
| `app/index.tsx` | Modify — smart redirect |
| `app/settings.tsx` | Create (moved from tab) |
| `app/pin/add.tsx` | Create |
| `app/(tabs)/_layout.tsx` | Modify — 3 tabs |
| `app/(tabs)/atlas.tsx` | Modify — header, sort, filter, icon bar in cards |
| `app/(tabs)/explore.tsx` | Rename + Modify |
| `app/(tabs)/profile.tsx` | Create (was stub) |
| `app/(tabs)/settings.tsx` | Delete |
| `app/review/add.tsx` | Major rewrite |
| `app/spot/[localId].tsx` | Modify — overflow, spotNote, visit icon bar |
| `app/vendor/[id].tsx` | Modify — retheme + restructure |
| `assets/*.svg` | Copy from images/ |
