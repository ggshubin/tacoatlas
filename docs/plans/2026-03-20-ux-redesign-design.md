# TacoAtlas — UX Redesign Design Doc
Date: 2026-03-20

## Overview

This document covers the full UX redesign of TacoAtlas — navigation architecture, screen-by-screen layouts, the social layer ("Mi Gente"), the revised review flow, free vs. Pro gating, and all interaction details agreed upon in the design session. It supersedes any layout decisions from the previous phase1 implementation doc.

The design goal: a fun, taco-obsessive app with tight UX best practices where they serve the experience — not a sterile design exercise. Puns, taco-branded language, and on-the-nose labels are intentional.

---

## Navigation Architecture

### 3-Tab Structure

```
[ Atlas ]   [ Explore ]   [ Profile ]
```

Tab bar uses title case labels. Icons use the existing Ionicons library where possible; custom SVG icons are required for the food category bar (see Review Wizard section).

| Tab | Icon | Label | Route |
|-----|------|-------|-------|
| 1 | map-outline | Atlas | (tabs)/atlas |
| 2 | location-outline | Explore | (tabs)/explore |
| 3 | person-circle-outline | Profile | (tabs)/profile |

`initialRouteName` = `"atlas"`

Settings is a **pushed screen** (`/settings`), not a tab. Accessed via gear icon in Profile header.

### Full Route Map

```
Landing (/)
  └── (tabs)
       ├── atlas                 ← My Collection (home base)
       ├── explore               ← Nearby + Google Places + Mi Gente feed
       └── profile               ← Stats + Mi Gente + Pro features
            └── /settings        ← Pushed from Profile gear icon

  /review/add                   ← Modal, 3-step wizard
  /spot/[localId]               ← Pushed from Atlas
  /vendor/[id]                  ← Pushed from Explore
  /auth/sign-in                 ← Pushed from Landing or Profile
  /auth/sign-up                 ← Pushed from Landing or Profile
```

---

## Landing Screen (`/`)

Shown on **first launch** and after **every logout**. After the user makes a choice, the app goes straight to Atlas on all future opens — never shown again until logout.

### Layout

- Full dark background (`colors.bg`)
- TacoAtlas logo centered, large
- Tagline below: *"Stop forgetting where the good tacos are."*
- Two buttons stacked:
  - **"Sign In / Create Account"** — amber filled, full width → pushes `/auth/sign-in`
  - **"Continue without account"** — ghost/outline, full width → navigates to Atlas tab
- Small legal note at bottom: privacy policy link

### Smart Gating (Free vs. Pro)

The landing screen is NOT the primary upgrade surface. After the user's first choice, upgrade prompts surface contextually at high-intent moments:

| Trigger | Upgrade Message |
|---------|----------------|
| Logging spot #16 | "Your atlas is full. Unlock unlimited spots with Pro." |
| Tapping a locked stat in Profile | "See your full taco stats with TacoAtlas Pro." |
| Tapping Burritos/Tortas icon in review | "Rate burritos and tortas with TacoAtlas Pro." |
| Tapping Mi Gente section | "Connect with your taco crew — unlock with TacoAtlas Pro." |
| Tapping Export | "Export your atlas with TacoAtlas Pro." |

Free users go straight to Atlas on every open after their first session. No blocking gates.

---

## Atlas Tab (`(tabs)/atlas.tsx`)

Home base. The user's personal taco collection.

### Header

- Eyebrow label: `"taco atlas"` (amber, small caps, not all-caps shouting)
- Title: `"My Atlas"` or `"George's Atlas"` when display name is set
- Stats pills row:
  - `"12 spots"` (always shown)
  - `"★ 3.8 avg"` (shown once user has 3+ reviewed spots)

### Controls Row (below header)

- **List / Map toggle** — pill buttons, same as current. List is default.
- **Sort control** — small dropdown or segmented: `Recent · Rating · Name`
- **Search bar** — full width, below controls
- **Spot type filter chips** — horizontal scroll row below search: `All · Truck · Cart · Street Tent · House · Brick & Mortar · Restaurant`

### List View

Each spot card shows:
- Spot name (bold)
- Spot type badge (amber, uppercase, small)
- City + location icon
- TacoRating (if at least one visit with a rating)
- Visit count (right side, large amber number)
- Privacy icon (small, far right: globe / people / lock)
- **Dashed border** for "drop a pin" spots with no visits yet
- `"No visit yet"` label replaces rating/visit count for unvisited pins

### Map View

- All spots as pins on the map
- **Your pins**: amber/gold marker with taco icon
- **Friend pins** (Pro): warm terracotta marker with friend's avatar as pin face
- **Public community pins**: muted/dim version of the marker, no avatar
- Avatar stacking on shared locations: up to 5 circular avatars overlapping. At 6+, collapses to a count badge (`+12`)
- Filter chips above the map (toggleable layers):
  ```
  [ My Spots ]  [ Mi Gente ]  [ Public ]
  ```
  Default: all three on.
- Tapping a pin opens a **bottom sheet**: spot name, type, your rating (if visited), row of friend avatars with their ratings, "View Spot" button

### FAB (Floating Action Button)

- Amber, lower right, always visible on Atlas tab
- Tapping opens a **quick action sheet** with two options:
  - 🌮 **"Log a Visit"** → 3-step review wizard
  - 📍 **"Drop a Pin"** → lightweight single-screen flow

### Empty State

When 0 spots exist:
- Large taco icon (centered, 100px)
- `"Your atlas is empty"`
- `"Tap + to log your first spot."`
- No button — the FAB handles the action

### Sign-Up Nudge (unauthenticated only)

A slim banner pinned just above the tab bar (not overlapping content):
- `"Create an account to back up your atlas"` + `"Sign Up →"` link
- Amber background, subtle

---

## Drop a Pin Flow (Lightweight — No Review Required)

Accessed from FAB → "Drop a Pin." A single screen, not the full wizard.

### Fields

- Spot name (text input, required)
- Spot type chips (same preset grid as review wizard)
- Location picker (see Location Picker section below)
- Privacy toggle: `🌎 Public · 👥 Mi Gente Only · 🔒 Just Me` (default: Public)
- "About This Spot" note — optional freeform, collapsible (e.g., "Cash only," "Opens at 3pm")
- **"Save Pin"** button — amber, full width

### Behavior

- Saved pin appears in Atlas list with a **dashed border card**
- Shows `"No visit yet"` in place of rating/visit count
- Tapping the card on the spot detail screen shows a prominent **"Log Your Visit"** button that launches the review wizard pre-filled with the spot's name, type, and location

---

## Location Picker (Used in Both Drop a Pin and Review Wizard)

Three methods shown as tappable tiles:

```
[ 📍 I'm Here ]   [ 🔍 Search ]   [ 🗺️ Drop on Map ]
```

**📍 I'm Here** — fires GPS immediately, drops pin at current coordinates. Best for logging while present.

**🔍 Search** — text input with Google Places Autocomplete. User types a name or address, picks from dropdown. Works from anywhere, including from home logging a spot visited earlier.

**🗺️ Drop on Map** — opens full-screen interactive map with a fixed crosshair centered on screen. User scrolls and zooms to the exact location. A **"Set This Spot"** button at the bottom confirms. Reverse geocode runs silently to attempt city auto-fill. Best for temporary setups, pop-ups, street corners — anything without a permanent address.

All three methods produce the same result: a lat/lng stored on the spot, a map snapshot preview shown in the form. Snapshot shows a "tap to change" badge so location is always editable.

---

## Review Wizard — 3 Steps (`/review/add`)

Replaces the current 5-step wizard. Step indicator: 3 dots at top.

**X button** (top left) — dismisses with `"Ditch this visit?"` confirmation alert.

If launched from a Drop a Pin spot, Step 1 fields are pre-filled and locked (name, type, location). User jumps to Step 2.

---

### Step 1 — The Spot

- Spot name (text input)
- Spot type chips (preset grid: Truck / Food Cart / Street Tent / House / Brick & Mortar / Restaurant)
- Location picker (3-method tiles — see above)
- Privacy toggle: `🌎 Public · 👥 Mi Gente Only · 🔒 Just Me`
- "About This Spot" note — optional, collapsible, **spot-level** (persists across all visits, not per-visit)

---

### Step 2 — What'd You Have?

**The 4-Icon Bar** — no labels, icons only, centered:

```
  🌮      🫔      🥙      🌶
```

Tacos · Burritos · Tortas · Salsas

- Each icon has two states:
  - **Dim** (default) — nothing rated in this category for this visit
  - **Lit** (amber, full opacity) — at least one item rated
- **Burritos and Tortas**: amber "Pro" badge overlaid on icon for free users. Tapping opens paywall with message: "Rate burritos and tortas with TacoAtlas Pro."
- Active category tab highlighted in amber underline or background

> **Icon note:** Ionicons does not include taco, burrito, or torta icons. These require custom SVG assets matching the app's visual style. This is a design asset task. The salsa/chili icon can use Ionicons `flame-outline`.

**Inside each category — Chip Scorecard:**

Preset chips displayed in a grid:

- **Tacos**: Al Pastor, Carne Asada, Birria, Barbacoa, Pollo, Chorizo, Carnitas, Pescado, Camarón, Lengua, Other
- **Burritos**: same preset list + custom entry (Pro)
- **Tortas**: Milanesa, Cubana, Pierna, Al Pastor, Chorizo, Other (Pro)
- **Salsas**: free-form name entry (type the salsa name) — no preset chips

Tapping a chip expands it inline:
```
[ Al Pastor ]  ★★★★☆
[ Quick note... optional              ]
```
- TacoRating stars appear directly under the chip label
- One-line optional note field below the rating
- Chip snaps closed showing a compact summary: `"Al Pastor ★★★★"`
- Tap again to edit or remove

**For Salsas:**
- Text input: "Salsa name (e.g. Salsa Verde)"
- TacoRating: Flavor
- Heat level picker: 5 options with icons — Mild / Medium / Hot / Fire / Volcano (existing HeatIcon component)
- Quick note field
- "Add Salsa" button to commit and start another

**Skip behavior:** A small `"Skip →"` label below the icon bar lets users move to Step 3 without rating anything in the current category.

---

### Step 3 — Your Verdict

- **Overall rating** — large TacoRating component (this is the headline number for the visit)
- **"Coming back?"** — 3 pill buttons:
  - `"Hell yes"` (amber when active)
  - `"Maybe"` (muted amber when active)
  - `"Nah"` (subtle red when active)
- **Visit notes** — multiline freeform text: `"What stood out?"`
- **Photos** — grid of added photos with remove button. Camera and Library buttons below.
- **Privacy reminder** — small row showing current privacy setting with option to change

---

## Spot Detail (`/spot/[localId]`)

### Header

- Back chevron (left)
- Spot name (large, bold)
- Spot type badge + city
- Share icon (right) — same as current
- **Three-dot overflow menu** (`...`) replaces the trash icon in the header. Opens action sheet: `"Edit Spot Info"` / `"Delete Spot"`

### About This Spot (spot-level note)

Below the header, above visit cards:
- If note exists: shows note text with a small pencil edit icon
- If empty: shows `"Add a note about this spot"` in muted italic — tappable to add
- Examples: "Cash only." "Park on Valencia." "Opens at 3 on weekdays."

### Stats Row

- Visit count pill + avg rating pill (unchanged from current)

### Visit Cards (sorted newest first)

Each visit is a card. The **date is present but minimized** — small, muted color (`colors.creamDim`), lightweight font, tucked into the top-left corner of the card header. It should read as metadata, not as a headline.

**Visit card anatomy:**

```
Mar 15, 2026 (small, muted, top-left)    🌮● 🫔  🥙  🌶●  (icon bar, top-right)

★★★★  Hell yes ✓

[ photo strip if photos exist ]

TACOS
  Al Pastor  ★★★★  "Extra crispy"
  Birria     ★★★★★

SALSAS
  Salsa Verde  ★★★  medium  "A bit thin"

VISIT NOTES
  "The birria was transcendent."
```

- **Icon bar** (4 icons, no labels): dim icons for categories not tried, lit amber for categories with at least one rating. Shown in the top-right corner of the card header — compact, not prominent.
- Edit and delete actions: small edit pencil icon + trash icon in the card's action row (already implemented, keep as-is)

---

## Explore Tab (`(tabs)/explore.tsx`)

Rename from `index.tsx`. Replaces "Find My Tacos."

### Header

- Title: `"Explore"`
- Subtitle: `"Near San Diego"` (or `"Searching nearby..."` while resolving, or `"Enable location to find spots"` if denied)

### Feed (single scroll, two sections)

**Section 1 — "In the Atlas"**
- Community/DB vendors near you (from `vendorRepository`)
- Each card: VendorCard component (existing)

**Section 2 — "On Google"**
- Google Places results shown inline (not as a footer afterthought)
- Free tier badge in section header: `"5 searches left today"` (hidden for Pro users)
- Each card: GooglePlaceCard component (existing)

### Empty / Error States

- Location denied: centered empty state, taco icon, `"Enable location to find nearby spots"`, `"Enable Location"` button
- No results: `"No spots found nearby."` + `"Be the first to put one on the map."` + `"+ Add a Spot"` button

### Pro — Mi Gente Feed (future addition to Explore)

When Pro social layer is active, a third section appears at the top of the Explore feed:

**Section 0 — "Mi Gente Near You"**
- Shows public spots from friends who are geographically nearby
- Friend's avatar + name above their spot card
- Toggled off via the [Mi Gente] chip in map view filter

---

## Profile Tab (`(tabs)/profile.tsx`) — New Screen

Replaces Settings as a tab. Gear icon (top-right corner of header) pushes to `/settings`.

### Top Section (all tiers)

- Avatar (tappable — same picker as current settings screen)
- Display name (large)
- Home city + favorite taco (if set, shown as small metadata row)
- Two stat pills: `"12 spots"` · `"34 visits"`

### Stats Section

Free users see 2 stats fully unlocked. The rest show as cards with a blur overlay and a small amber `"Pro"` badge. Tapping any locked stat opens the paywall.

| Stat | Free? |
|------|-------|
| Total spots logged | ✓ |
| Average overall rating | ✓ |
| Most visited city | Pro |
| Top-rated spot | Pro |
| Heat level breakdown | Pro |
| Favorite spot type | Pro |
| Best vs. worst rated | Pro |

### Mi Gente Section (Pro)

For free users: a locked card with blurred preview — `"Connect with your taco crew"` + Pro badge.

For Pro users:
- Friend request notification bell (top right of section)
- Friend list: avatar + display name + city + their spot count
- `"Find Friends"` button — search by username or share profile link
- Friend connections are **mutual** (both users must accept — not asymmetric following)
- Friend requests go through accept/decline flow

### Pro Features Section

Cards shown for all users — locked with Pro badge for free, full-access for Pro:

- **Wishlist** (note: "Want to Try" wishlist is now handled by the Drop a Pin "unvisited" state — this card links to the filtered Atlas view showing unvisited pins)
- **Taco Passport** — badge collection. One earned badge shown as teaser for free users.
- **Export Atlas** — styled image card or CSV download

### Upgrade Card (free users only)

A prominent amber card between Stats and Mi Gente:
- `"Unlock TacoAtlas Pro"` — `$3.99 one-time`
- Brief benefit list (3 bullets max)
- `"Upgrade Now"` button

---

## Settings Screen (`/settings`) — Pushed, Not a Tab

Accessed via gear icon in Profile. Standard back-chevron navigation.

Title: `"Settings"` (not `"SETTINGS"`)

### Sections

**Profile**
- Display name, bio, home city, favorite taco
- Avatar picker
- Save button

**Security**
- Change password (new password + confirm)
- Change button

**Account**
- Email address (read-only)
- Sign Out button
- Delete Account button (destructive)

---

## Vendor Detail (`/vendor/[id]`) — Retheme + Restructure

Currently uses `colors.cream` (light background) — an outlier in a dark-themed app. Full retheme to `colors.bg` / `colors.surface` palette.

### Zone 1 — The Spot (top, always visible)

- Hero photo — full width, no text overlay
- Name (large, `colors.cream`)
- Spot type badge + city (`colors.creamMuted`)
- Hours if known
- Small interactive map thumbnail showing the pin location — tappable to open full map

### Zone 2 — The Verdict (scrollable)

- **Community rating**: large TacoRating + avg score + review count
- **"Coming back?" bar**: horizontal segmented bar — green (Hell yes) / yellow (Maybe) / red (Nah) with percentages. Replaces the current text-only return counts.
- **Tacos section**: each taco type as a row — name (flex 1), avg TacoRating stars, count in parens: `"Al Pastor  ★★★★  (12)"`
- **Salsas section**: same row pattern, with a color-coded heat dot instead of text badge (blue=mild → dark red=volcano)
- **Condiments**: chip row (existing pattern)

### Footer

- `"Add Your Visit"` — amber, full width, pushes to review wizard pre-filled with vendor name/location

---

## Free vs. Pro — Full Feature Matrix

| Feature | Free | Pro |
|---------|------|-----|
| Log spots | Up to 15 | Unlimited |
| Review form (tacos, salsas, condiments) | ✓ | ✓ |
| Rate burritos + tortas | ✗ | ✓ |
| Drop a Pin | ✓ | ✓ |
| Location: GPS / Search / Drop on Map | ✓ | ✓ |
| List view + Map view | ✓ (up to 15 pins) | ✓ Unlimited |
| Share a spot ("Share My Taco") | ✓ | ✓ |
| Cloud sync + backup | ✗ | ✓ |
| Google Places searches | 5/day | Unlimited |
| Mi Gente (social friends) | ✗ | ✓ |
| Friend pins on map | ✗ | ✓ |
| Per-spot privacy controls | ✓ (public only for free) | ✓ All options |
| Stats dashboard | 2 stats | Full |
| Taco Passport (badges) | ✗ | ✓ |
| Export atlas | ✗ | ✓ |
| Cloud photo backup | ✗ | ✓ |
| Home screen widget | ✗ | ✓ |
| Public profile URL | ✗ | ✓ |

**Price:** $3.99 one-time unlock.

---

## Naming & Voice Decisions

| Element | Text |
|---------|------|
| Friends section | "Mi Gente" |
| Return intent options | "Hell yes" / "Maybe" / "Nah" |
| Atlas tab label | "Atlas" |
| Explore tab label | "Explore" |
| Profile tab label | "Profile" |
| FAB action: full review | "Log a Visit" |
| FAB action: pin only | "Drop a Pin" |
| Unvisited pin label | "No visit yet" |
| Review step 1 | "The Spot" |
| Review step 2 | "What'd You Have?" |
| Review step 3 | "Your Verdict" |
| Discard confirmation | "Ditch this visit?" |
| Pro paywall CTA | "Unlock TacoAtlas Pro" |
| Social paywall message | "Connect with your taco crew — unlock with TacoAtlas Pro." |

---

## Design Assets Required

The following assets need to be created before the review wizard icon bar can be implemented:

- Custom taco icon (SVG, two states: dim + amber lit)
- Custom burrito icon (SVG, two states: dim + amber lit + Pro badge overlay)
- Custom torta icon (SVG, two states: dim + amber lit + Pro badge overlay)
- Salsa/chili can use Ionicons `flame-outline` / `flame`

All icons should match the visual weight and style of the existing Ionicons used throughout the app.

---

## Known Existing Issues (Carry Forward)

From the previous design doc — still unresolved, now higher priority:

- Continuous cloud sync after sign-up (edits currently stay local only)
- Sign-in does not merge or sync existing local data
- `vendor/[id].tsx` theme mismatch (addressed in this doc — retheme required)
- No pagination on vendor/review lists
- `app/index.tsx` root redirect needs to be replaced with the Landing screen logic

---

## Out of Scope — Future Iterations

- Spanish version + language switch button
- International address fields (non-US address formats)
- Push notifications
- In-app messaging between users
- Taco recommendation engine
- Ads of any kind
