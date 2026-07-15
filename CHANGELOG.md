# Changelog

All notable user-facing changes to TacoAtlas, newest first.

Format follows [Keep a Changelog](https://keepachangelog.com/) loosely. Android `versionCode` increments per build (store version was **1.3.0** through versionCode 45, **1.3.1** from versionCode 46), so entries are organized by versionCode + date. Gaps in versionCode numbers are EAS auto-increments or internal test builds with no user-facing changes.

Maintenance rule: when a production build is cut, add its entry here in the same commit/session.

## versionCode 48 — 2026-07-14 (v1.3.1, beta feedback fixes)

Fixes from the first beta-tester feedback round on the design-audit build, verified on device.

### Added
- **Save Visit button** — the review form now ends with a prominent sticky amber "Save Visit" button pinned above the bottom edge ("Save Changes" when editing). Replaces the small header Save pill that testers couldn't find.
- **Camera photos land in your gallery** — any photo taken with the in-app camera (review form, "Snap It" quick action, profile avatar) is also saved to the phone's photo gallery, not just inside the app. Asks once for add-to-gallery permission; if declined, the photo still attaches to the review.

### Fixed
- **Beta feedback form ghosting** — opening the beta feedback sheet over a map produced a "double vision" artifact on Android (and blocked input). Maps now render via TextureView instead of SurfaceView so overlays composite correctly.

### Internal
- New native dependency: expo-media-library (requires full rebuild).
- Test suite restored to green (26 suites / 132 tests): stale mocks updated for the vendor status filter and `upsertPersonalVendor` refactor, user-scoped storage keys in localStorage tests, jest env vars for the Supabase client, new mocks for expo-media-library and expo-image-manipulator, and removal of the obsolete mi-gente stub-data test.

## versionCode 47 — 2026-07-04 (v1.3.1, design audit release)

The July design-audit overhaul, built across versionCodes 44–47 (44–45 were internal test builds; 46 was superseded same-day by 47, which swaps in the final taco glyph artwork with a transparent background).

### Added
- **Save celebration** — logging a spot drops your new pin with a spring, a ripple, and your atlas count ("Spot #12"). Edits and repeat visits get quieter treatment.
- **Location-first logging** — tapping + near a saved spot (within ~150m) leads with "At {name}? You're right here — log this visit"; one tap opens the form prefilled.
- **Camera-first "Snap It"** — new quick action: camera opens first, the review form arrives with the photo already attached.
- **Taste profile** — the Profile screen now shows your identity from data you already logged: top taco, heat preference, cities, visits.
- **Navigate from the map** — pin callouts have a directions button that opens Apple/Google Maps.
- **Photo-forward atlas** — spots with photos show a full-width image banner in the list instead of a 48px thumbnail.

### Changed
- **The map wears the brand** — custom espresso-toned Mapbox style (dark warm land, muted roads, no POI clutter) on all map screens; your spots are amber taco-glyph pins, friends' and community spots are dot locators with an icon for the spot type (truck, cart, pop-up, restaurant...). Callouts are dark cards that spring up from the bottom.
- **Typographic identity** — Fraunces (warm editorial serif) on screen titles, spot names, and celebration moments.
- **Review form is one scroll** — the 4-page swipe wizard is gone; spot info, verdict (moved up from page 4), food details, photos, and notes are one scrollable form with Save always in the header.
- **One rating symbol** — the taco glyph replaces both the fork-and-knife and star ratings everywhere.
- **The free-tier meter is a passport page** — 15 dashed stamp slots; each logged spot lands a tilted taco stamp.
- **Motion & polish** — atlas list cascades in on load; expand/collapse animates gently; heat levels use drawn chili icons on the palette (no more emoji); the logo header now appears only on the Profile screen; the signed-out banner moved out of the FAB zone; small-text contrast improved.
- **Maps now powered by Mapbox** — all four map screens (Explore, My Atlas, Friend map, Drop-pin picker) migrated from Google Maps to Mapbox. Google Places search is unchanged.
- Spot notes ("About this spot") can now be added on Android too (was iOS-only).

### Internal
- New dependencies: react-native-reanimated 4, react-native-worklets, expo-font, @expo-google-fonts/fraunces (all native — require full rebuilds).
- **iOS build groundwork** — the project is config-ready for an iOS build: iOS permissions (camera QR-scan, location, photos) and export-compliance flag set in `app.json`, iOS build + submit profiles added to `eas.json`, and a full release runbook at `docs/ios-release.md`. No user-facing change yet; the App Store version still requires Apple Developer account setup.

## versionCode 35 — 2026-06-09

### Fixed
- My Atlas map now shows only your own recorded spots — friends' pins no longer appear there (the Mi Gente friend map is the place for those).

## versionCode 34 — 2026-06-09 (superseded by 35, not shipped)

### Added
- **Privacy selector** — picking who can see a spot is now one clear control with plain language ("Anyone on TacoAtlas can see this spot and your review" / "Only your friends can see this" / "Saved to your personal log — only you can see it"), used in the review wizard, the drop-pin flow, and the spot detail screen.
- **Per-spot privacy editing** — change a spot's visibility any time from its detail screen (previously locked in at creation).
- **Pro conversion reminder** — upgrading to Pro now offers a one-time choice to share previously private spots ("Make all Public", per-spot, or keep private). Nothing changes unless you choose.
- **Over-the-air updates** — this is the first build that can receive instant fixes without a Play Store update (and the profile screen shows the active OTA version).

### Fixed
- Free accounts could mark a dropped pin as Public from the pin flow; sharing is Pro — pins from free accounts now save privately, with locked options labeled PRO.

## versionCodes 29–33 — early June 2026

### Added
- Branded TacoAtlas emails (confirmation, password reset, email change) sent from the tacoatlas.app domain.
- Full password reset flow (forgot-password and reset screens, email deep links).
- In-app beta feedback banner for beta testers.
- Terms of Service and Privacy Policy published at tacoatlas.app/terms and /privacy (linked from the profile screen).

### Fixed
- New accounts now get their username and display name immediately at signup (previously profiles could be created blank).
- Email confirmation / recovery / email-change links now open the app and sign in correctly (PKCE deep-link handling).

## versionCode 25 — 2026-05-10

### Fixed
- Taking a photo no longer drops into a confusing OS crop screen — you get the native "Use Photo / Retake" choice.
- Bottom tab bar no longer overlaps Android gesture/3-button navigation.

### Added
- Show-password eye toggle on the sign-in screen.

## versionCode 21 — 2026-04-12 (first production submission, v1.3.0)

### Added
- Redesigned review wizard: horizontal swipe between steps, auto-save as you type, photos on their own page, full-screen photo lightbox.
- Free tier: 15-spot personal atlas with progress dots and an upgrade path to Pro (one-time purchase).
- Immersive edge-to-edge Android navigation bar.

### Fixed
- Profile "Upgrade" button now actually starts the purchase flow.
- "Already have an account" on sign-up navigates to sign-in.
- Scroll position no longer resets after picking a photo in a review.
