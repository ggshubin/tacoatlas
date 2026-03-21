# TacoAtlas — Project Handoff (UX Redesign Complete)

Last updated: 2026-03-20 | Branch: feat/phase1-implementation | Tests: 53/53

---

## What It Is

Expo React Native app (iOS + Android) for logging and reviewing personal taco spots. Users add vendors, rate tacos/burritos/tortas/salsas, and build a personal taco atlas. Optional Supabase account to back up data. Pro tier ($3.99 one-time) unlocks burritos, tortas, and Mi Gente social features.

---

## Tech Stack

- Expo SDK 55, React Native 0.83.2, Expo Router v3 (file-based routing)
- Zustand — authStore, reviewFormStore, proStore
- AsyncStorage — local data persistence
- Supabase — auth + cloud backup
- react-native-maps — MapView, Marker
- react-native-purchases — RevenueCat Pro IAP
- expo-location — GPS + reverse geocoding
- react-native-svg + react-native-svg-transformer — SVG asset pipeline
- Google Places API — Text Search via googlePlacesService
- EAS Build — Android APK via Firebase App Distribution

---

## Project Structure

```
app/
  _layout.tsx              # Root layout — session init, Stack screens registered
  index.tsx                # Entry redirect: landing or (tabs)/atlas
  landing.tsx              # Onboarding — Sign In / Continue as Guest
  settings.tsx             # Pushed screen — sign out, account info
  pin/add.tsx              # Drop a Pin — name, spot type, location, privacy, spotNote
  review/add.tsx           # 3-step review wizard (add + edit mode)
  spot/[localId].tsx       # Local spot detail — visits, overflow menu, edit/delete
  vendor/[id].tsx          # Supabase vendor detail (dark-themed, Zone 1 / Zone 2)
  (tabs)/
    _layout.tsx            # 3-tab bar: Atlas / Explore / Profile
    atlas.tsx              # My Atlas — vendor list, sort chips, FAB, QuickActionSheet
    explore.tsx            # Explore — nearby search, Google results, location subtitle
    profile.tsx            # Profile — identity card, stats, upgrade card, Mi Gente

src/
  components/
    ChipScorecard.tsx      # Preset chips + freeform items, inline star rating, heat picker
    FoodIconBar.tsx        # 4-category icon bar (SVG assets, Pro gating on burritos/tortas)
    LocationPicker.tsx     # 3-method location picker: GPS / Search / Drop on Map
    MapPinPicker.tsx       # Full-screen MapView with crosshair + reverse geocoding
    QuickActionSheet.tsx   # Bottom sheet: Log a Visit / Drop a Pin
    TacoRating.tsx         # 1-5 taco icon rating
    VendorCard.tsx         # Spot card with dashed border for unvisited spots

  services/
    localStorage.ts        # AsyncStorage CRUD — vendors + reviews, normalizeVendor/Review
    syncService.ts         # Syncs local data to Supabase on sign-up
    supabase.ts            # Supabase client
    googlePlacesService.ts # Nearby search + searchByText (Text Search API, 5/day limit)
    vendorRepository.ts    # Supabase vendor queries
    reviewRepository.ts    # Supabase review queries

  store/
    authStore.ts           # session, profile, hasCompletedOnboarding (AsyncStorage persisted)
    reviewFormStore.ts     # 3-step form state, FoodCategory, burritoEntries, tortaEntries
    proStore.ts            # isPro: boolean, setIsPro

  types/
    app.ts                 # LocalVendor, LocalReview, FoodCategory, PrivacySetting, HeatLevel
    database.ts            # Supabase table types (includes all 5 heat levels)
    svg.d.ts               # SVG module declarations for react-native-svg-transformer

  utils/
    theme.ts               # colors, spacing, radius, typography (dark theme)

assets/
  taco-dk.svg / taco-lt.svg
  burrito-dk.svg / burrito-lt.svg
  torta-dk.svg / torta-lt.svg
  salsa-dk.svg / salsa-lt.svg
  background.png, header.png, map-background.png, taco-icon.png, etc.

metro.config.js            # SVG transformer pipeline config
```

---

## Design System (theme.ts)

```
colors.bg          — #1A1209   (page background)
colors.surface     — #26190C   (cards, sheets)
colors.surfaceBorder — #3D2B12
colors.amber       — #F5A623   (primary CTA)
colors.amberDim    — #B37318
colors.amberSubtle — rgba(245,166,35,0.12)
colors.cream       — #F5EDD8   (primary text)
colors.creamDim    — #B5A898   (secondary text)
colors.terracotta  — #C0392B   (destructive)
```

---

## Navigation Flow

```
/landing
  "Sign In" → /(auth)/sign-in
  "Continue without account" → sets hasCompletedOnboarding=true → /(tabs)/atlas

/(tabs)/atlas      My Atlas — vendor list, FAB opens QuickActionSheet
/(tabs)/explore    Explore — nearby + Google search results
/(tabs)/profile    Profile — stats, upgrade card, Mi Gente (Pro)

/settings          Gear icon from profile header
/pin/add           Drop a Pin (isVisited: false saved)
/review/add        3-step wizard (isVisited: true saved)
/spot/[localId]    Spot detail (local)
/vendor/[id]       Vendor detail (Supabase)
```

---

## Key Data Types

```typescript
type PrivacySetting = 'public' | 'mi_gente' | 'just_me'
type FoodCategory   = 'tacos' | 'burritos' | 'tortas' | 'salsas'
type HeatLevel      = 'mild' | 'medium' | 'hot' | 'fire' | 'volcano'
type ReturnIntent   = 'yes' | 'maybe' | 'no' | null

interface LocalVendor {
  localId, name, lat, lng, address, cityName,
  spotType: SpotType | null,
  privacy?: PrivacySetting,  // default 'public'
  spotNote?: string | null,
  isVisited?: boolean,       // false = pinned, true = reviewed
  photoUri, hours, createdAt
}

interface LocalReview {
  localId, vendorLocalId,
  overallRating (1-5),
  returnIntent: ReturnIntent,  // 'Hell yes 🤙' / 'Maybe' / 'Nah' displayed
  notes, photoUris[],
  tacoEntries[], salsaEntries[],
  burritoEntries?: LocalBurritoEntry[],
  tortaEntries?: LocalTortaEntry[],
  condiments[], createdAt
}
```

SpotType: `'Truck' | 'Food Cart' | 'Street Tent' | 'House' | 'Brick & Mortar' | 'Restaurant'`

---

## Review Wizard (3 Steps)

Step 1 — "The Spot": name, spot type chips, LocationPicker, privacy selector, collapsible spotNote

Step 2 — "What'd You Have?": FoodIconBar (tacos/burritos/tortas/salsas) + ChipScorecard per category + condiments row. Burritos and tortas are Pro-gated.

Step 3 — "Your Verdict": star rating, returnIntent ("Hell yes 🤙" / "Maybe" / "Nah"), notes

On submit: saves vendor with `isVisited: true` + privacy/spotNote; saves review with all entries.
Edit mode: pass `editReviewId` + `vendorLocalId` as params.

---

## Pin vs. Review

- Drop a Pin (`/pin/add`): saves vendor with `isVisited: false`. Shows with dashed border in atlas.
- Log a Visit (`/review/add`): saves vendor with `isVisited: true` + full review.
- Spot detail has "Log Your First Visit" CTA when `isVisited === false`.

---

## Pro Gating

`useProStore().isPro` controls:
- FoodIconBar: burritos + tortas tabs locked for free users
- Profile: Mi Gente section locked with "Friend connections coming soon"
- Upgrade card shown on profile for non-Pro users ($3.99 one-time via RevenueCat)

---

## localStorage Helpers

```typescript
normalizeVendor(v)  // sets privacy → 'public', spotNote → null, isVisited → true if missing
normalizeReview(r)  // sets burritoEntries → [], tortaEntries → [], salsaEntries[].notes → null
updateVendor(localId, updates)
markVendorVisited(localId)
getReviews()        // returns all reviews
```

---

## SVG Icon Pipeline

metro.config.js configures react-native-svg-transformer so `.svg` files import as React components.
FoodIconBar uses `-dk` (dark/active) and `-lt` (light/inactive) variants per category.
SVG source files live in `images/`; built copies live in `assets/`.

---

## EAS / Build Config

- Bundle ID: `com.tacooatlas.app`
- EAS Project ID: `93ba132a-6393-4899-aa8a-b2c8c5436ee9`
- EAS account: `ggshubin`
- Preview profile: internal, Android APK
- Env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (set via `eas env:create`)
- `.npmrc`: `legacy-peer-deps=true`
- Build: `eas build --platform android --profile preview`

---

## Supabase

- profiles table: `id (uuid), display_name (text)` — auto-created on auth.users insert
- RLS enabled on profiles, vendors, reviews
- Trigger: `on_auth_user_created` → inserts into profiles

---

## Known Issues / Open Items

- `pin/add.tsx` does not handle edit mode params yet (future: pass `editLocalId`)
- Mi Gente list component is stubbed ("Friend connections coming soon")
- Sign-in does not merge existing local data (only sign-up syncs via syncService)
- No cloud sync after initial sign-up (edits stay local)
- No pagination on vendor/review lists
- `@expo/vector-icons` causes 2 test suites to fail to run (pre-existing env issue, all 53 tests pass)

---

## Recent Key Commits (UX Redesign)

```
19c48f5  feat(task-1): wire real SVG icons into FoodIconBar
61586b2  fix(task-19): smoke test — remove invalid gradient from VendorCard
e4699de  fix(task-19): smoke test — fix theme.test color expectations
a03b36d  fix(task-19): smoke test — fix syncService fixtures + async + beforeEach
523cd62  fix(task-19): smoke test — add spotType to localStorage test fixtures
[...44 total commits on feat/ux-redesign, now merged into feat/phase1-implementation]
```
