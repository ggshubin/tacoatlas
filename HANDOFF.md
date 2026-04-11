# TacoAtlas — Project Handoff

Last updated: 2026-03-23 | Branch: master | Tests: 53/53

---

## What It Is

Expo React Native app (iOS + Android) for logging and reviewing personal taco spots. Users add vendors, rate tacos/burritos/tortas/salsas, and build a personal taco atlas. Optional Supabase account to back up data. Pro tier ($3.99 one-time) unlocks burritos, tortas, and Mi Gente social features.

---

## Tech Stack

- Expo SDK 55, React Native 0.83.2, Expo Router v3 (file-based routing)
- Zustand — authStore, reviewFormStore, proStore, notificationStore
- AsyncStorage — local data persistence
- Supabase — auth + cloud backup + friendships + push tokens
- react-native-maps — MapView, Marker
- react-native-purchases — RevenueCat Pro IAP ($3.99 one-time, entitlement: "pro")
- expo-location — GPS + reverse geocoding
- expo-notifications + expo-device — push notifications
- expo-constants — app version reading
- react-native-svg + react-native-svg-transformer — SVG asset pipeline
- Google Places API — Text Search via googlePlacesService
- EAS Build — preview (APK, sideload) + production (AAB, Play Store)

---

## Project Structure

```
app/
  _layout.tsx              # Root layout — session init, push token registration, Stack screens
  index.tsx                # Entry redirect: landing or (tabs)/atlas
  landing.tsx              # Onboarding — Sign In / Continue as Guest
  onboarding.tsx           # First-run onboarding flow
  admin/index.tsx          # Admin screen
  pin/add.tsx              # Drop a Pin — name, spot type, location, privacy, spotNote
  review/add.tsx           # 3-step review wizard (add + edit mode)
  spot/[localId].tsx       # Local spot detail — visits, overflow menu, edit/delete
  vendor/[id].tsx          # Supabase vendor detail (dark-themed, Zone 1 / Zone 2)
  (auth)/
    _layout.tsx            # Auth stack layout
    sign-in.tsx            # Sign in screen
    sign-up.tsx            # Sign up screen (show/hide password toggle)
  (tabs)/
    _layout.tsx            # 3-tab bar: Atlas / Mi Gente / Profile
    atlas.tsx              # My Atlas — vendor list, sort chips, FAB, QuickActionSheet
    explore.tsx            # Explore — nearby search, Google results, location subtitle
    mi-gente.tsx           # Social hub — friends list, activity feed, Pro gate
    profile.tsx            # Profile — identity, stats, change password, upgrade card
  mi-gente/
    add.tsx                # Add friend — search, invite, QR code
    friend/[username].tsx  # Friend detail — remove, block, view map
    map/[username].tsx     # Friend's spot map

src/
  components/
    AppBottomSheet.tsx     # Shared slide-up action sheet (centralized styling)
    ConfirmModal.tsx        # Shared confirmation dialog (centralized styling)
    ChipScorecard.tsx      # Preset chips + freeform items, inline star rating, heat picker
    FoodIconBar.tsx        # 4-category icon bar (SVG assets, Pro gating on burritos/tortas)
    LocationPicker.tsx     # 3-method location picker: GPS / Search / Drop on Map
    MapPinPicker.tsx       # Full-screen MapView with crosshair + reverse geocoding
    ProPaywallModal.tsx    # Pro upgrade paywall modal
    QuickActionSheet.tsx   # Bottom sheet: Log a Visit / Drop a Pin
    RestorePromptModal.tsx # Prompt to restore guest data after sign-in
    TacoRating.tsx         # 1-5 taco icon rating
    VendorCard.tsx         # Spot card with dashed border for unvisited spots
    AtlasMapView.tsx       # Map view for atlas
    GooglePlaceCard.tsx    # Google Places result card

  services/
    localStorage.ts        # AsyncStorage CRUD — vendors + reviews, normalizeVendor/Review
    syncService.ts         # Syncs local data to Supabase on sign-up/Pro upgrade
    supabase.ts            # Supabase client
    googlePlacesService.ts # Nearby search + searchByText (Text Search API, 5/day limit)
    vendorRepository.ts    # Supabase vendor queries
    reviewRepository.ts    # Supabase review queries
    miGenteService.ts      # Friend requests, accept/decline/remove/block, activity feed
    notificationService.ts # Push token registration, save to Supabase, send friend notifications
    photoService.ts        # Image picker, camera, upload to Supabase Storage
    proService.ts          # RevenueCat: isPro, getProPackage, purchase, restore
    locationService.ts     # Location utilities

  store/
    authStore.ts           # session, profile, hasCompletedOnboarding, changePassword
    reviewFormStore.ts     # 3-step form state, FoodCategory, burritoEntries, tortaEntries
    proStore.ts            # isPro, loading, checkPro (RevenueCat), setPro
    notificationStore.ts   # pendingFriendCount badge state

  types/
    app.ts                 # LocalVendor, LocalReview, FoodCategory, PrivacySetting, HeatLevel, SpotType
    database.ts            # Supabase table types
    svg.d.ts               # SVG module declarations for react-native-svg-transformer

  utils/
    theme.ts               # colors, spacing, radius, typography (dark theme)

supabase/
  migrations/
    20260323000001_add_push_token.sql   # Adds push_token TEXT to profiles table

assets/                    # PNG/SVG icons and backgrounds
metro.config.js            # SVG transformer pipeline config
```

---

## Design System (theme.ts)

```
colors.bg            — #1A1209   (page background)
colors.surface       — #26190C   (cards, sheets)
colors.surfaceBorder — #3D2B12
colors.amber         — #F5A623   (primary CTA)
colors.amberDim      — #B37318
colors.amberSubtle   — rgba(245,166,35,0.12)
colors.cream         — #F5EDD8   (primary text)
colors.creamDim      — #B5A898   (secondary text)
colors.creamMuted    — (dimmer secondary)
colors.error         — (destructive actions)
```

All modal/alert/action-sheet styling is centralized in:
- `src/components/ConfirmModal.tsx` — all confirmation dialogs
- `src/components/AppBottomSheet.tsx` — all slide-up action sheets

---

## Navigation Flow

```
/landing
  "Sign In" → /(auth)/sign-in
  "Continue without account" → sets hasCompletedOnboarding=true → /(tabs)/atlas

/(tabs)/atlas      My Atlas — vendor list, FAB opens QuickActionSheet
/(tabs)/explore    Explore — nearby + Google search results
/(tabs)/mi-gente   Social hub (Pro only — free users see upgrade CTA)
/(tabs)/profile    Profile — stats, change password, upgrade card

/pin/add           Drop a Pin (isVisited: false saved)
/review/add        3-step wizard (isVisited: true saved)
/spot/[localId]    Spot detail (local) — delete navigates to /(tabs)/atlas
/vendor/[id]       Vendor detail (Supabase)
/mi-gente/add      Add friend — search / invite / QR
/mi-gente/friend/[username]   Friend detail — remove, block
/mi-gente/map/[username]      Friend's spot map
```

---

## Key Data Types

```typescript
type PrivacySetting = 'public' | 'mi_gente' | 'just_me'
type FoodCategory   = 'tacos' | 'burritos' | 'tortas' | 'salsas'
type HeatLevel      = 'mild' | 'medium' | 'hot' | 'fire' | 'volcano'
type ReturnIntent   = 'yes' | 'maybe' | 'no' | null
type SpotType       = 'Truck' | 'Food Cart' | 'Pop-up' | 'Restaurant' | 'House' | 'Brick & Mortar'

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
  returnIntent: ReturnIntent,
  notes, photoUris[],
  tacoEntries[], salsaEntries[],
  burritoEntries?: LocalBurritoEntry[],
  tortaEntries?: LocalTortaEntry[],
  condiments[], createdAt
}
```

---

## Review Wizard (3 Steps)

Step 1 — "The Spot": name, spot type chips (`Truck | Food Cart | Pop-up | Restaurant`), LocationPicker, privacy selector, collapsible spotNote

Step 2 — "What'd You Have?": FoodIconBar (tacos/burritos/tortas/salsas) + ChipScorecard per category + condiments row. Burritos and tortas are Pro-gated.

Step 3 — "Your Verdict": star rating, returnIntent ("Hell yes 🤙" / "Maybe" / "Nah"), notes

On submit: saves vendor with `isVisited: true` + privacy/spotNote; saves review with all entries.
Edit mode: pass `editReviewId` + `vendorLocalId` as params.

---

## Pin vs. Review

- Drop a Pin (`/pin/add`): saves vendor with `isVisited: false`. Shows with dashed border in atlas.
- Log a Visit (`/review/add`): saves vendor with `isVisited: true` + full review.
- Spot detail has "Log Your First Visit" CTA when `isVisited === false`.
- Deleting a spot navigates directly to `/(tabs)/atlas` (no modal animation conflict).

---

## Pro Gating

`useProStore().isPro` controls:
- FoodIconBar: burritos + tortas tabs locked for free users
- Mi Gente: entire screen locked with upgrade CTA (purchase flow wired to RevenueCat)
- Profile: upgrade card shown for non-Pro users
- Upgrade button calls: `proService.getProPackage()` → `proService.purchase(pkg)` → `checkPro()`

**DEV NOTE**: `proStore.ts` line 12 has `isPro: true` hardcoded for development. Change to `false` before any production release.

---

## Mi Gente (Social Features)

- Pro-only feature: free users see a locked screen with upgrade CTA
- Friends list with drag-to-reorder crew strip
- Pending friend requests with accept/decline
- Sent requests with cancel
- Activity feed (friends' recent reviews)
- Push notifications sent on friend request via Expo Push API (fire-and-forget)
- `miGenteService.ts` handles all Supabase friendship queries
- `notificationService.ts` handles push token registration and notification sending

---

## Push Notifications

- Registered in `_layout.tsx` on app init and on `SIGNED_IN` auth event
- Token saved to `profiles.push_token` in Supabase
- Friend request notifications sent client-to-device via `https://exp.host/--/api/v2/push/send`
- Not testable in Expo Go or Android emulator — requires a real device + EAS build
- Migration: `supabase/migrations/20260323000001_add_push_token.sql` (already applied)

---

## Supabase

- `profiles` table: `id`, `display_name`, `avatar_url`, `push_token`
- `vendors` table: user's spots (synced from local on sign-up/upgrade)
- `reviews` table: user's reviews
- `friendships` table: friend connections + status
- RLS enabled on all tables
- Storage bucket: `review-photos` — path format `${userId}/filename.jpg` (RLS requires userId as first segment)
- Trigger: `on_auth_user_created` → inserts into profiles

---

## Auth

- Sign up: creates Supabase account, syncs local data via `syncService`
- Sign in: restores cloud data, prompts if local guest data exists (`RestorePromptModal`)
- Change password: available on profile page (calls `authStore.changePassword`)
- Password field has show/hide toggle on sign-up screen

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

`metro.config.js` configures react-native-svg-transformer so `.svg` files import as React components.
FoodIconBar uses `-dk` (dark/active) and `-lt` (light/inactive) variants per category.
SVG source files live in `images/`; built copies live in `assets/`.

---

## EAS / Build Config

- Bundle ID / Package: `com.tacooatlas.app`
- EAS Project ID: `93ba132a-6393-4899-aa8a-b2c8c5436ee9`
- EAS account: `ggshubin`
- `app.json` version: `1.1.0`, versionCode: `2` (EAS `autoIncrement: true` overrides versionCode on production builds)
- App version displayed dynamically via `Constants.expoConfig?.version`
- `.npmrc`: `legacy-peer-deps=true`

### Build Commands

```bash
# Run on connected USB device (USB debugging required)
adb devices
npx expo run:android

# Build APK for sideloading / device testing
eas build --platform android --profile preview

# Build AAB for Play Store upload
eas build --platform android --profile production
```

### Play Store Notes

- **versionName** (user-visible): set via `version` in `app.json`
- **versionCode** (internal, must increment each upload): managed automatically by EAS `autoIncrement: true`
- Bump `version` in `app.json` when releasing a new user-visible version

---

## Known Issues / Open Items

- `pin/add.tsx` does not handle edit mode params yet (future: pass `editLocalId`)
- Profile page upgrade card `onPress` is still empty (`onPress={() => {}}`), needs same RevenueCat purchase flow wired as Mi Gente
- Push notifications require real device — not testable in emulator or Expo Go
- **`isPro: true` hardcoded in `proStore.ts` — MUST change to `false` before production release**
- No pagination on vendor/review lists
- `@expo/vector-icons` causes 2 test suites to fail to run (pre-existing env issue, all 53 tests pass)
