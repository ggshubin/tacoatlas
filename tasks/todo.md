# Build: review-form Photos reorder + commit pending work (versionCode 51, 2026-09-07)

## Why

The "Log a Visit" form put Photos down near the bottom, next to Notes. Adding a
photo is part of capturing the spot, so it belongs with the spot details, not as
an afterthought after the food scorecards.

Separately, the working tree had ~52 files of uncommitted work spanning multiple
prior sessions (beta-feedback removal, admin/welcome features, Supabase migrations)
that had never been committed or shipped in a clean build. The last production
build (vc50) recorded git commit `a7fe4dd` (= HEAD), so its contents were not
reproducible from a commit.

## Plan

- [x] 1. `app/review/add.tsx` — move the Photos section from between the food
      scorecards and Notes to directly after the spot details (below "About this
      spot", above "The Verdict"). New order: Name → Type → Location → Privacy →
      About → **Photos** → The Verdict → What'd You Have? → Notes.
- [x] 2. Verify: `tsc --noEmit` clean.
- [x] 3. Commit all pending work except the throwaway `_to_delete/` folder
      (commit `eac3d56`); gitignore `_to_delete/` so the tree is clean.
- [x] 4. Production AAB **versionCode 51** built from the clean tree via EAS.
- [x] 5. CHANGELOG entry (versionCode 51).

## Build versionCode 51

AAB: https://expo.dev/artifacts/eas/pDf0cOmtefT4s_nVC-Ee1sgKec0grR5z54alyAZ_iDI.aab
(EAS build `1054aa4e-e9b7-4826-96a7-6ba8e2d8d0d6`, git commit `eac3d56`)

EAS auto-incremented versionCode 50 → 51. Built with the production keystore and
production env vars (Supabase, Maps, RevenueCat, Mapbox).

## Before promoting to production

- [ ] Confirm the three Supabase migrations are applied to the Supabase project:
      `founder_auto_friend`, `admin_activity_rpcs`, `lock_privileged_profile_columns`.
      The admin/founder features in this build call those RPCs and expect those
      columns; if the migrations are not live, those screens error at runtime.
- [ ] Remove the stale `android.versionCode` from `app.json` (ignored under remote
      version source; kept only to avoid confusion in future builds).

---

# Fix: undeclared photo/video permissions flagged by Play Console (2026-08-24)

## Why

Play Console's Photo and video permissions review flagged the app for declaring
`READ_MEDIA_IMAGES` and `READ_MEDIA_VIDEO` (Android 13+ granular media permissions)
without describing their use. expo-media-library's config plugin requests all three
granular permissions (`photo`/`video`/`audio`) by default; the app doesn't need any
of them — `photoService` only ever calls the library with `writeOnly: true` to mirror
captured photos into the gallery, there's no video feature, and existing photos are
picked via expo-image-picker's system Photo Picker (no media-library read access
needed).

## Plan

- [x] 1. `app.json` — set `granularPermissions: []` on the `expo-media-library` plugin
      config, verified against `node_modules/expo-media-library/plugin/src/withMediaLibrary.ts`
      (v55.0.18) that this is a real option and maps directly to the three flagged
      permissions (`GRANULAR_PERMISSIONS_MAP`), leaving `READ_MEDIA_VISUAL_USER_SELECTED`
      and storage permissions (which are actually used) untouched.
- [x] 2. Verify: `tsc` clean, jest 28 suites / 144 tests green (app.json-only change,
      no code touched).
- [x] 3. CHANGELOG entry (versionCode 50).
- [x] 4. Production AAB **versionCode 50** built and manifest verified to no longer
      declare the three permissions (see below).

## Verification performed

- Confirmed in `expo-media-library`'s plugin source that `granularPermissions` defaults
  to `['photo', 'video', 'audio']` (→ `READ_MEDIA_IMAGES`/`READ_MEDIA_VIDEO`/`READ_MEDIA_AUDIO`)
  and that passing `[]` filters all three out of `AndroidConfig.Permissions.withPermissions`.
- `tsc --noEmit` clean; `jest` 28/28 suites, 144/144 tests passing.

## Build versionCode 50 — verified fixed

AAB: https://expo.dev/artifacts/eas/JLE1Ype5yyBqpoEMUBAn1UoZ1KJ2GkqY4zxDrT3xywo.aab
(EAS build `0d5de99d-7dc7-4d69-85c9-5ecc69c74039`)

Confirmed by extracting `base/manifest/AndroidManifest.xml` from the AAB
(`unzip -p tacoatlas.aab base/manifest/AndroidManifest.xml`) and searching its raw
bytes for permission strings — the protobuf manifest format keeps permission names
as plain UTF-8 substrings, so no decoder is needed, just `strings manifest.pb | grep
permission`. `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, and `READ_MEDIA_AUDIO` are
absent; `READ_MEDIA_VISUAL_USER_SELECTED` and the storage permissions (still
legitimately needed) are present as expected.

This build also carries the still-uncommitted "Open the Gates" work below (EAS builds
the working tree, not `HEAD`) — see that section for its own verification.

---

# Open the Gates — Pro-for-all, founder auto-friend, founder dashboard (2026-07-25)

## Why

TacoAtlas is crowdsourced: the atlas is only worth opening if other people
filled it in. The free tier gates exactly the behaviours that create that
value — public privacy, friends, cloud sync, more than 15 spots — so during
the land-grab phase it suppresses supply and confuses early adopters. Free
tier is being *switched off*, not deleted: every gated branch stays in the
codebase behind one flag so it can come back once adoption justifies it.

## Plan

- [x] 1. `src/config/features.ts` — single `PRO_FOR_ALL` flag with the rationale in a comment
- [x] 2. `src/store/proStore.ts` — when the flag is on, `isPro` starts `true`, `checkPro()` short-circuits (no RC/server round trip), `setPro` can't downgrade below the floor. Every one of the 9 consumers flips off this one value; no gate code deleted.
- [x] 3. `app/(tabs)/profile.tsx` — account label reads "Founding Member" under the flag, not "✦ Pro Member" (nobody paid; don't imply they did)
- [x] 4. Migration `founder_auto_friend`: add `profiles.is_founder`; mark the owner account (looked up by email, not a hardcoded UUID) as founder **and** admin; `SECURITY DEFINER` trigger on profile insert that writes an `accepted` friendship founder→new user; backfill existing profiles. Must check **both** directions — the unique index is directional `(requester_id, addressee_id)` — and never overwrite an existing `blocked`/`pending` row.
- [x] 5. Migration `admin_activity_rpcs`: `admin_user_roster()` + `admin_recent_activity(int)`, both `SECURITY DEFINER` and both hard-gated on the caller's `is_admin` (raise, don't return empty)
- [x] 6. `src/services/adminService.ts` + `app/admin/activity.tsx` — founder dashboard: roster (who signed up, pin/review counts, last active) and a cross-user activity feed. Reached from Profile → Founder, alongside a link to the existing queue.
- [x] 7. `src/types/database.ts` — `is_founder` on `Profile`
- [x] 8. Tests: proStore flag behaviour (on and off), welcomeStore persistence, auto-friend trigger verified against the live DB with a real signup
- [x] 9. Verify: `tsc` clean, jest 28 suites / 144 tests green, trigger + RPC gate proven by query
- [x] 10. CHANGELOG entry
- [x] 11. Privacy policy: section 4 (auto-friend, founder access, paid features free) written into the **landing repo's** `privacy.html`, pushed (`ef0ac78`), deployed, and verified live. The draft in this repo's `docs/privacy-policy.html` was the wrong file — see below.
- [x] 13. Production AAB **versionCode 49** built and contents verified (see below).
- [x] 12. Quick-start welcome screen (`app/welcome.tsx` + `src/components/welcome/QuickStartArt.tsx`), switch on the screen itself and in Profile → App, launch routing via `welcomeStore`

## Verification performed

- Migrations applied to the live project (`szblruvrajswbpksinkv`) and checked by query:
  all 12 non-founder profiles have exactly one founder link (no duplicates); the four
  pre-existing friendships — including two where the *user* was the requester — were
  left untouched, proving the both-directions check.
- Auto-friend trigger exercised by inserting a real `auth.users` row: exactly one
  `accepted` link created, test user then deleted (0 leftover).
- RPC gate exercised in both directions: founder gets rows, a normal user raises
  `insufficient_privilege` rather than receiving an empty list.
- Welcome screen art rendered to PNG and inspected. First pass showed the hand-drawn
  taco row reading as buns and overflowing its card — replaced with the real
  `taco-glyph.svg` at the same opacity ramp `TacoRating` uses.

## Not verified

The three new/changed screens (welcome, founder dashboard, profile settings rows)
have not been run on a device — the app needs a dev build for the native Mapbox
modules. Typecheck and the test suite pass; the visual check above was a static
HTML render of the same markup and colours, not the React Native screen.

## Build versionCode 49 — verified to contain this work

AAB: https://expo.dev/artifacts/eas/MyrY2_SK8dTE-qvJUKTG9T5U1cZNlsfD_U1IVpWX4EU.aab

EAS records `Commit fe15b91` (the previous commit) because this work is still
uncommitted — but EAS uploads the **working tree**, not `HEAD`, so the changes are
in the binary. Confirmed by extracting the AAB and grepping the Hermes bundle for
12 strings that only exist in this change (`Start my atlas`, `Founder View`,
`admin_user_roster`, `showWelcomeOnLaunch`, `Show Guide on Launch`, …) — all present.

Gotcha for next time: `grep` alone reports nothing on the Hermes bundle because it
is binary — use `grep -a`. And strings containing any non-ASCII character (e.g.
`✦ Founding Member`) are stored **UTF-16**, so an ASCII grep misses them; match
`F.o.u.n.d.i.n.g` or use `grep -a -P` instead. Both tripped me up and each looked
exactly like "the change isn't in the build".

## RESOLVED: the privacy disclosure is now live

Auto-friending every signup to the founder account means the founder sees their
`friends`-only content, and the dashboard reads across privacy settings entirely.
That needs to be disclosed *before* a build with these changes reaches users.

`docs/privacy-policy.html` in **this** repo is a stale copy and is not what users
read. Verified 2026-07-25 by fetching the live page:

| | this repo's `docs/privacy-policy.html` | live tacoatlas.app/privacy |
|---|---|---|
| Last updated | Mar 19, 2026 (now Jul 25 after this edit) | Jun 9, 2026 |
| Sections | 11, "1. Who We Are" … | 10, "1. Information We Collect" … |

The live document is served from the separate landing repo
**github.com/ggshubin/tacoatlas** (Vercel, `index.html` + static pages at repo root)
and has diverged — it is a different document, not an older revision of this one.
The in-app Legal → Privacy Policy link points at the live URL.

**Done 2026-07-25:** the disclosure was written into the landing repo's `privacy.html`
as section 4 (4a auto-connection + how to remove it, 4b founder access to private
entries, 4c paid features free), with sections 1, 3 and 5 cross-referencing it and a
dated entry in "Changes to This Policy". Pushed as `ef0ac78`, auto-deployed by Vercel,
and verified live by fetching the page: "Last updated: July 25, 2026", 11 sections,
section 4 present.

**Still open — decide what to do with `docs/privacy-policy.html` in this repo.** It is
a stale, divergent second copy of a legal document and is what caused this near-miss:
it was edited first, in good faith, and would have shipped as "done" while users saw
nothing. Recommend deleting it or reducing it to a one-line pointer at
tacoatlas.app/privacy. Left in place because deleting a legal doc should be your call.

## Reverting to a paid tier later

Set `PRO_FOR_ALL = false`. That restores the 15-spot cap, private-only
privacy, the Mi Gente gate, Pro-only food categories, the Places search
quota, the upgrade nudges and the paywall — all still present in the code.
The founder auto-friend and dashboard are independent of the flag.

---

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
