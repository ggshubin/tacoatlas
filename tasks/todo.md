# Design Audit — Phase 3: Brand glyph, input flows, identity hooks (2026-07-04)

## Plan

- [x] 1. TacoPin + celebration + wizard empty state use assets/taco-glyph.svg; jest svg mock
- [x] 2. MapCallout gains navigate action (openMapsNavigation); lat/lng wired at call sites
- [x] 3. Spot-detail layout transitions: spring → LinearTransition.duration(180) (subtle)
- [x] 4. Issue 5: photo-forward atlas cards — 150px photo banner when a photo exists, compact row otherwise
- [x] 5. Location-first logging: FAB checks GPS, saved spot within 150m leads the sheet as "At {name}?" (one tap → prefilled form). Places fallback deliberately skipped — auto-burning the daily Places quota on every + tap felt wrong; revisit if saved-spot hit rate is low.
- [x] 6. Camera-first "Snap It": camera → review form with photo attached (and nearby spot prefilled when detected)
- [x] 7. TasteProfile card on Profile — top taco (freq + rating tiebreak), heat line from salsa mode, cities, visits; hidden until first review
- [x] 8. DotProgressIndicator → passport stamp page (dashed slots, tilted taco-glyph stamps; testID/a11y contract kept, tests green)
- [x] 9. Minor: TacoRating + ChipScorecard both rate with the brand glyph (★ and fork-knife gone); logo now only on profile (+ onboarding wordmark); heat ramp on palette (green→gold→amber→red→ember) in wizard + spot detail; MCI chili/fire icons replace 🌶🔥🌋 (🤙 kept — it's voice); Alert.prompt replaced with cross-platform note modal; creamDim #6B5B4E → #857160; signed-out banner now inline under header (bottom zone belongs to FAB + tabs)
- [x] 10. Verify: tsc clean; jest 125 passed / 6 failed (same pre-existing set)

Device check: glyph legibility inside pins at 40px, photo card height (150px), nearby suggestion latency on cold GPS, stamp tilt charm vs. gimmick.

## Builds shipped (2026-07-04)

- versionCode 44 (v1.3.0) — phase 1 test build (map style, motion, celebration)
- versionCode 45 (v1.3.0) — phase 2 test build (pin language, Fraunces, one-scroll form)
- versionCode 46 (v1.3.1) — phase 3, full design-audit release; CHANGELOG entry added
- All three via `eas build -p android --profile production`; artifacts on expo.dev

## Still open

- [ ] Commit the work on feat/ios-build-prep (suggest splitting: map identity / motion / typography+wizard / brand glyph+input flows) — waiting on device sign-off of vc46
- [ ] Device pass on vc46 (see device-check list above)
- [ ] Audit backlog not yet taken: "Taco Wrapped" yearly recap; Places fallback for location-first suggestion (quota question); simplified small-size glyph variant if pin legibility is poor

# Design Audit — Phase 1: Map Identity + Motion (2026-07-03)

Scope: audit priority issues 1 & 2. Custom espresso map style, designed pins,
dark callouts, pin-drop save celebration, staggered list entrance, animated
expand/collapse.

## Plan

- [x] 1. Install react-native-reanimated (expo install); add jest mock + moduleNameMapper
- [x] 2. `src/utils/mapStyle.ts` — custom espresso Mapbox style JSON (streets-v8, minimal layers, brand palette, no POI noise)
- [x] 3. `src/components/TacoPin.tsx` — SVG marker pin (amber "mine" variant, colored "friend", muted "public"), bottom-anchored
- [x] 4. `src/components/MapCallout.tsx` — dark bottom card, springs up via reanimated; replaces white floating callouts
- [x] 5. Apply style + pins + callout to `AtlasMapView.tsx` and `app/(tabs)/explore.tsx`
- [x] 6. `src/components/SaveCelebration.tsx` — pin drops with spring + "Spot #N" count; wire into review wizard save (new visits only, not edits) and pin/add save
- [x] 7. Motion pass: staggered FadeInDown entrance on Atlas list; spring layout transitions on spot-detail review card expand/collapse and ChipScorecard expansion
- [x] 8. Verify: `tsc --noEmit`, full jest suite green

Deliberately out of scope (later phases): typography (/typeset), wizard
restructure (/distill), photo-forward atlas cards (/arrange), @gorhom/bottom-sheet
adoption (existing Modal slide is acceptable; motion budget spent on the hero moment).

## Review (2026-07-03)

- Added deps: react-native-reanimated 4.2.1 + react-native-worklets 0.7.4
  (native module — requires a new dev client / EAS build before running).
- New files: src/utils/mapStyle.ts, src/components/TacoPin.tsx,
  src/components/MapCallout.tsx, src/components/SaveCelebration.tsx,
  src/__mocks__/react-native-reanimated.ts, src/__mocks__/react-native-svg.ts.
- Modified: AtlasMapView, explore (style + pins + callout; removed dead white
  callout styles), atlas (staggered entrance), spot/[localId] + ChipScorecard
  (spring expand/collapse), review/add + pin/add (SaveCelebration on save;
  edits skip celebration).
- Verification: `tsc --noEmit` clean. Jest: 125 passed / 6 failed — confirmed
  identical 6 failures on unmodified HEAD via temp worktree (pre-existing:
  VendorCard, mi-gente-stubs, localStorage, photoService, syncService,
  vendorRepository).
- Visual verification on device still needed (map style, pin anchors,
  celebration timing).

# Design Audit — Phase 2: Pin fixes + Typography + Wizard (2026-07-04)

- [x] TacoPin glyph redesigned (bowl-shaped shell + lettuce frill — no more
  "alien head"); pins now reserved for the user's own spots only.
- [x] New SpotDot (src/components/SpotDot.tsx): dot locator for friend/public
  spots with location-type icon (Truck/Food Cart/Pop-up/Restaurant/House/
  Brick & Mortar → truck/cart/tent/restaurant/home/storefront glyphs).
  Friend dots ringed in friend color; public dots muted. Applied in explore
  + mi-gente/map (which also got the espresso style). Vendor type gained
  optional spot_type.
- [x] Audit item 3 — typography: Fraunces (600/700) via @expo-google-fonts,
  loaded in _layout, tokens in theme (fonts.display/displayBold). Applied to
  Atlas header + card names, spot/vendor detail names, profile & mi-gente
  titles, onboarding app name, celebration title, map callout titles, wizard
  section headers. fontWeight removed wherever fontFamily set (Android).
- [x] Audit item 4 — review wizard: 4-page horizontal pager → single
  scrollable form. Order: The Spot → The Verdict (stars + return intent,
  moved up from page 4) → What'd You Have? → Photos → Notes. Step dots
  removed; Save lives in header; scrollToStep/FlatList hacks deleted.
- Verification: tsc clean; jest 125 passed / 6 failed (same pre-existing set).
- New deps: expo-font (native — needs new build), @expo-google-fonts/fraunces.
- Device check still needed: taco glyph legibility at 40-44px, SpotDot icon
  clarity at zoom, Fraunces sizing/line-height on real screens, wizard scroll
  feel with keyboard.
