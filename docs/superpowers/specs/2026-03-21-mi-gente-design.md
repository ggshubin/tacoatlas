# Mi Gente — Feature Design Spec

Date: 2026-03-21
Status: Approved
Branch target: `feat/mi-gente`

---

## Overview

Mi Gente is a Pro-gated social layer that lets users follow friends, see their shared taco spot pins and reviews, and navigate to those spots via native Maps. It surfaces as a dedicated 4th tab in the bottom nav.

This spec covers UI design only. All friend and activity data will be hardcoded stubs in `src/data/mi-gente-stubs.ts` until the backend is built.

---

## Navigation Restructure

### Current state (before)
`app/(tabs)/_layout.tsx` has 4 tabs: **Atlas / Explore / Profile / Settings**
The Settings tab (`name="settings"`) is a full tab — not just a pushed screen.

### After
Tabs become: **Atlas / Explore / Mi Gente / Profile**

Changes to `_layout.tsx`:
- Position 3: replace `name="profile"` → `name="mi-gente"`, icon `people-outline`, title "Mi Gente"
- Position 4: replace `name="settings"` → `name="profile"`, icon `person-outline`, title "Profile"
- `app/(tabs)/settings.tsx` **does not exist as a tab file** (the pushed `app/settings.tsx` is what gets deleted)

The gear icon and `router.push('/settings')` are removed from Profile header.
`app/settings.tsx` (the pushed screen) is deleted.

### Tab order
| Position | Tab | Icon | Route file |
|---|---|---|---|
| 1 | Atlas | `map-outline` | `(tabs)/atlas` |
| 2 | Explore | `location-outline` | `(tabs)/explore` |
| 3 | Mi Gente | `people-outline` | `(tabs)/mi-gente` — **new** |
| 4 | Profile | `person-outline` | `(tabs)/profile` |

---

## Profile Tab — Changes

### Remove Mi Gente section
The existing Mi Gente section in `profile.tsx` (the locked card for free users and "coming soon" card for Pro users, lines ~121–135) is **removed entirely**. Mi Gente now lives in its own tab.

### Remove settings gear
Remove `gearBtn` touchable and `router.push('/settings')` from the Profile header row.

### Add Account section (after stats, before any remaining sections)
```
Section label: "ACCOUNT"
Row 1: ✉️ icon | user email | "Signed in" subtitle | chevron (no-op tap)
Row 2: 🚪 icon | "Sign Out" text in colors.terracotta | calls existing handleSignOut()
Guest state: replace Row 1 with ☁️ "Back up your atlas" CTA → router.push('/(auth)/sign-in')
             remove Row 2 (no sign out for guests)
```

### Add App section (below Account)
```
Section label: "APP"
Row: ℹ️ icon | "TacoAtlas v1.0" | no chevron
```

### Color token note
Use `colors.creamMuted` (`#B8A898`) for subtitles and secondary text in new rows. Both `creamMuted` and `creamDim` exist in `theme.ts`; `creamMuted` is lighter (#B8A898), `creamDim` is darker/dimmer (#6B5B4E).

---

## Mi Gente Tab — Screen 1: Recent Activity (`(tabs)/mi-gente.tsx`)

### Pro gate
At the top of the component, check `useProStore().isPro`. If `!isPro`:
- Render a locked placeholder identical in style to the existing `lockedCard` in profile.tsx
- Show `setShowPaywall(true)` stub (local boolean state, same pattern as profile.tsx — no actual paywall sheet component exists yet, this is a stub to be wired to RevenueCat later)
- Return early — do not render the rest of the screen

### Header
- Eyebrow: "taco atlas"
- Title: "Mi Gente"
- Right: small amber pill button "+ Add" → `router.push('/mi-gente/add')`

### State A — No friends (`STUB_FRIENDS.length === 0`)
- Centered empty state: `people-outline` icon (32px, amber), "Find your taco crew" title, subtitle: "Add friends to see where they're eating and share your spots"
- Large amber CTA button: "+ Add Friends" → `router.push('/mi-gente/add')`
- Divider
- 3-button strip (each navigates to `/mi-gente/add` with method param):
  - "🔍 Search" → `router.push('/mi-gente/add?method=search')`
  - "🔗 Invite Link" → `router.push('/mi-gente/add?method=invite')`
  - "📷 QR Code" → `router.push('/mi-gente/add?method=qr')`

### State B — Friends present, no activity (`STUB_ACTIVITY.length === 0`)
- Crew avatar strip (see below)
- Section label: "YOUR CREW"
- One row per friend: avatar (initials) + username + "Hasn't shared yet" subtitle + **"🌮 Poke"** button
  - Poke button: calls stub `handlePoke(username)` → shows toast "Poke sent to [username]!" via a simple alert or toast library

### State C — Active feed (`STUB_ACTIVITY.length > 0`)
- Crew avatar strip
- Section label: "RECENT ACTIVITY"
- Activity list — accordion behavior:
  - **Collapsed**: avatar, `[username] pinned/reviewed`, spot name, star rating (if reviewed), timestamp, chevron ▼
  - **Expanded** (tap to toggle): spot name (large), spot type + distance, stars, review note in italic with left border, **"🌮 Get these tacos"** button
  - Only one item expanded at a time
  - First item defaults to expanded on mount

### Crew avatar strip (State B + C)
- Horizontal `ScrollView` (horizontal, no scroll indicator)
- Each item: avatar circle (initials, `colors.amberSubtle` bg, `colors.amberDim` border), username label below
- Green border (`#27AE60`) if friend marked `isActive: true` in stub data
- Last item: dashed circle "+" → `router.push('/mi-gente/add')`
- Tap any avatar → `router.push('/mi-gente/friend/[username]')`

### "Get these tacos" button
- Full-width amber button at bottom of expanded activity card
- On press:
  ```typescript
  const scheme = Platform.OS === 'ios' ? 'maps://' : 'geo:'
  const url = Platform.OS === 'ios'
    ? `maps://?daddr=${item.lat},${item.lng}&dirflg=d`
    : `geo:${item.lat},${item.lng}?q=${item.lat},${item.lng}(${encodeURIComponent(item.spotName)})`
  Linking.openURL(url)
  ```
- **This is a navigation action only — not social**

---

## Screen 2: Friend Profile (`app/mi-gente/friend/[username].tsx`)

Route param: `username` (string). Look up from `STUB_FRIENDS` by username.

### Back nav
`router.back()` — renders "← Mi Gente" style back text in header

### Hero card (`colors.surface` bg, `surfaceBorder` border)
- Large avatar circle (44px, initials, amber border)
- Username (17px bold cream), active status line ("🟢 Active" or "Last seen N days ago")
- 3 stat boxes: **Pins** / **Reviews** / **Avg ★** (from stub data)

### Map CTA
- Full-width button (amber subtle bg, amber dim border): "🗺️ See [username]'s Pins on Map →"
- `router.push('/mi-gente/map/[username]')`

### Their drops list
- Section label: "THEIR DROPS (N)"
- List of `STUB_ACTIVITY` filtered to this friend
- Each row: food emoji (🌮 if reviewed, 📍 if pinned-only), spot name, spot type + star rating, small **"🌮 Go"** amber pill
  - "Pinned — not yet reviewed" shown as subtitle when `type === 'pinned'` and no rating
  - Go pill: same `Linking.openURL()` Maps call as "Get these tacos"
- Show first **5** items inline
- If more than 5: show "＋ N more →" row that expands the full list (toggle)

---

## Screen 3: Friend Pin Map (`app/mi-gente/map/[username].tsx`)

### Header
- Back button "← [username]"
- Title: "[username]'s Pins", subtitle: "N spots"

### Map (`react-native-maps` MapView)
- Amber `Marker` for each spot from `STUB_ACTIVITY` where `friend.username === username`
- Dimmed amber marker (`#B37318`) for `type === 'pinned'` (not yet reviewed)
- Blue pulsing dot for current user location using `expo-location`
  - **If location permission denied or unavailable**: silently omit the blue dot — do not show a permission prompt on this screen

### Bottom panel (below map)
- "Showing N of [username]'s pins" label
- Flat list of up to 3 closest pins: colored dot, spot name + distance, "🌮 Go" pill
- Distance calculated from current location if available, else omit distance label

---

## Screen 4: Add Friends (`app/mi-gente/add.tsx`)

Route params (optional query): `method?: 'search' | 'invite' | 'qr'`
On mount, read `useLocalSearchParams().method` and scroll/focus to the corresponding section. Default: show all sections, no pre-focus.

### Search by Username
- `TextInput` with placeholder "@username", `colors.surface` bg
- "Find" button (amber): stub — always shows Alert "User not found. Invite them with a link!"

### Invite Link
- Description: "Share your personal invite link"
- Read-only display of stub URL: `tacooatlas.app/join/[username]` (username from `authStore.profile` or "guest")
- "Copy" button: `Clipboard.setStringAsync(url)` from `expo-clipboard` + toast "Copied!"
- "📤 Share" button: `Share.share({ message: url })` from React Native's built-in `Share` API
- "💬 Text" button: `Linking.openURL('sms:?body=...')` with pre-filled message

### QR Code
- Install dependency: `npx expo install react-native-qrcode-svg` (not currently in package.json)
- Display QR code of the invite link using `react-native-qrcode-svg`
- "📷 Scan a Friend's" button: stub — shows Alert "QR scanning coming soon!"

---

## Stub Data (`src/data/mi-gente-stubs.ts`)

```typescript
import { SpotType } from '../types/app'  // import path from src/data/

export interface FriendStub {
  username: string
  initials: string
  isActive: boolean
  pinCount: number
  reviewCount: number
  avgRating: number
}

export interface ActivityStub {
  id: string
  friend: FriendStub
  type: 'pinned' | 'reviewed'
  spotName: string
  spotType: SpotType
  lat: number
  lng: number
  address: string
  rating?: number        // undefined if type === 'pinned'
  note?: string
  timestamp: string      // display string: "1h", "2d", "5d"
}

export const STUB_FRIENDS: FriendStub[] = [
  { username: 'marcos_r', initials: 'MR', isActive: true, pinCount: 14, reviewCount: 9, avgRating: 4.6 },
  { username: 'jlo_tacos', initials: 'JL', isActive: false, pinCount: 6, reviewCount: 4, avgRating: 4.1 },
  { username: 'd_perez', initials: 'DP', isActive: true, pinCount: 8, reviewCount: 7, avgRating: 4.4 },
]

export const STUB_ACTIVITY: ActivityStub[] = [
  // ... 4–5 entries referencing the above friends
]
```

---

## Pro Gating Summary

| Screen | Free user behavior |
|---|---|
| Mi Gente tab | Locked placeholder + paywall stub (`showPaywall` boolean) |
| Friend Profile | Unreachable (only navigated to from Mi Gente feed) |
| Friend Map | Unreachable |
| Add Friends | Unreachable |

---

## Files to Create / Modify / Delete

| Action | File | Notes |
|---|---|---|
| **Create** | `app/(tabs)/mi-gente.tsx` | Main feed screen |
| **Create** | `app/mi-gente/add.tsx` | Add friends screen |
| **Create** | `app/mi-gente/friend/[username].tsx` | Friend profile screen |
| **Create** | `app/mi-gente/map/[username].tsx` | Friend pin map screen |
| **Create** | `src/data/mi-gente-stubs.ts` | Stub data + types |
| **Modify** | `app/(tabs)/_layout.tsx` | Swap tab 3 to mi-gente, tab 4 to profile |
| **Modify** | `app/(tabs)/profile.tsx` | Remove Mi Gente section + gear icon; add Account + App sections |
| **Delete** | `app/settings.tsx` | Pushed settings screen — content absorbed into Profile tab |
| **Delete** | `app/(tabs)/settings.tsx` | Settings tab file — tab slot replaced by mi-gente |

---

## Out of Scope (Backend Phase)

- Real friend relationships in Supabase
- Friend request / accept / decline flow
- Push notifications for pokes or new friend activity
- Privacy controls on which pins are visible to friends
- QR code scanning (camera permissions)
- Real invite links / deep link handling
- RevenueCat paywall wiring (stub boolean only for now)
