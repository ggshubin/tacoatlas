# Changelog

All notable user-facing changes to TacoAtlas, newest first.

Format follows [Keep a Changelog](https://keepachangelog.com/) loosely. Android `versionCode` increments per build (store version was **1.3.0** through versionCode 45, **1.3.1** from versionCode 46), so entries are organized by versionCode + date. Gaps in versionCode numbers are EAS auto-increments or internal test builds with no user-facing changes.

Maintenance rule: when a production build is cut, add its entry here in the same commit/session.

## versionCode 52 — 2026-09-08 (rebuild for fresh version code)

Identical app contents to versionCode 51 (same commit `7e15c15`). Rebuilt only because versionCode 51 was consumed by a Play Console upload attempt and could not be reused ("Version code 51 has already been used"), so it was never rolled out. See the versionCode 51 entry below for the actual changes (review-form Photos reorder, etc.).

### Internal
- EAS auto-incremented versionCode 51 → 52 (remote version source). No code changes.
- AAB: https://expo.dev/artifacts/eas/REFV-m7SZGITjWQfrKYsGC1RrSY9rUeM8fIiXcGLosI.aab (EAS build `19d24257-db40-4125-92c5-35e050adba78`).
- Unrelated to any AAB: the Play Console privacy-policy declaration pointed at the retired `ggshubin.github.io/tacoatlas/privacy-policy.html` (404). Corrected to the live `https://tacoatlas.app/privacy`.

## versionCode 51 — 2026-09-07 (review-form reorder)

### Changed
- **Photos moved up the logging flow** — on the "Log a Visit" form, the Photos section now sits directly below the spot details (name, type, location, privacy, about-this-spot) and above The Verdict, instead of down near the bottom by Notes. Adding a photo is part of capturing the spot, so it now lives with the rest of the spot info.

### Internal
- First production build cut from a fully committed working tree (commit `eac3d56`). Earlier builds were cut with a large amount of uncommitted work in the tree; that work is now committed, so this build's contents are reproducible from `HEAD`. The commit also carries the previously-uncommitted beta-feedback removal (BetaBanner, BetaFeedbackModal, betaFeedbackService, orphaned GooglePlaceCard/VendorCard components) and the admin-activity / welcome-onboarding features.
- EAS auto-incremented versionCode 50 → 51 (remote version source). The stale `android.versionCode` value in `app.json` is ignored and should be removed to avoid confusion.
- AAB: https://expo.dev/artifacts/eas/pDf0cOmtefT4s_nVC-Ee1sgKec0grR5z54alyAZ_iDI.aab (EAS build `1054aa4e-e9b7-4826-96a7-6ba8e2d8d0d6`).

## versionCode 50 — 2026-08-24 (undeclared permissions fix)

### Fixed
- **Play Console "undeclared permissions" flag** — expo-media-library's config plugin defaulted to requesting `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, and `READ_MEDIA_AUDIO` on Android, none of which the app actually uses: `photoService` only calls the library with `writeOnly: true` (mirroring captured photos to the gallery), there's no video feature, and existing photos are picked via expo-image-picker's system Photo Picker, which needs none of these. Set `granularPermissions: []` in `app.json` to stop declaring them.

### Internal
- This build also carries the already-live "open the gates" changes from versionCode 49 (Pro-for-all, founder auto-friend, founder dashboard, quick-start guide) — see that entry below; nothing new there, `PRO_FOR_ALL` remains `true`.
- Test suite green at 28 suites / 144 tests, `tsc` clean.

## versionCode 49 — 2026-07-25 (open the gates)

Every feature is now free while TacoAtlas recruits early adopters, and a new account is never alone or unguided on first open.

### Changed
- **Pro is now the standard experience** — every account gets the full feature set at no charge: unlimited spots (the 15-spot cap is gone), public and friends-only privacy, Mi Gente, cloud sync, all food categories, and unlimited spot search. A crowdsourced atlas needs contributions, and the free tier was gating exactly the behaviours that create them. Paid accounts show as "Founding Member".
- **Privacy Policy updated and live** — tacoatlas.app/privacy gains section 4, "Beta Program: Founder Access and Automatic Connections", covering the automatic founder connection (and how to remove it), the founder's access to all app activity including private entries, and Pro features being free during the beta. Sections 1, 3 and 5 point at it. Shipped in the landing repo (`ggshubin/tacoatlas`, commit `ef0ac78`) and verified live on 2026-07-25.

### Added
- **Quick-start guide** — a three-step illustrated how-to (drop a pin, rate it, watch your atlas fill in) shown when you open the app. Turn it off with the switch on the guide itself or in Profile → App → "Show Guide on Launch", and reopen it any time from "View Quick Start".
- **You start with a crew** — every new account is automatically connected to the founder account, so Mi Gente and the activity feed have something in them from the first launch. The connection can be removed like any other friend.
- **Founder View** — an admin-only dashboard (Profile → Founder) listing every account with signup date, spot/review counts and last activity, plus a cross-user feed of everything being logged.

### Fixed
- **Admin screens were unreachable** — `is_admin` had never been granted to any account, so the pending-submissions queue could not be opened by anyone. The owner account is now an admin, and both admin screens have entry points in Profile.

### Internal
- Free-tier behaviour is switched off behind a single `PRO_FOR_ALL` flag (`src/config/features.ts`), not deleted — every gate, limit, nudge and paywall remains in the code and returns by setting the flag to `false`. Both sides of the flag are covered by tests.
- New migrations: `founder_auto_friend` (adds `profiles.is_founder`, a `SECURITY DEFINER` signup trigger that pairs new users with founders in both directions without overwriting existing `blocked`/`pending` rows, plus a backfill) and `admin_activity_rpcs` (`admin_user_roster`, `admin_recent_activity`, both gated on `is_admin` and raising rather than returning empty).
- Test suite green at 28 suites / 144 tests.

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
