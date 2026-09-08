# TacoAtlas — "Apply for access to production" answers

Drafted from your repo (CHANGELOG.md, HANDOFF.md, docs/services.md, CLAUDE.md, tasks/todo.md) plus your confirmation that you've been carrying the current build on your own phone. One flag left — read it first, it matters more than the wording.

## Flags

1. **Hard gate — count's covered, duration still unverified by me.** New personal developer accounts need 12 testers opted in *continuously* for 14 days. You're at 27 testers, which clears the headcount with room to spare. The part I can't see from here is the *continuous 14 days* — if any of those 27 opted in recently, or the list has had gaps, check Play Console's own tester-opt-in timeline before you submit. Headcount alone doesn't satisfy the rule.
2. ~~Device-verification gap~~ — resolved. You've confirmed you've been running the current build on your own phone for a while and it's solid, so Q9 below now says that directly instead of hedging.

The beta tester guide PDF and its generator script are retired — moved to `_to_delete/` in your tacooatlas folder since I can't permanently delete files on your machine from here. Delete that folder yourself once you've confirmed you don't need them, or say the word and I'll leave it moved as-is.

Everything else below is drawn from real, verifiable facts in the repo (family test-account emails, the vc48 "first beta-tester feedback round" fixes, `PRO_FOR_ALL`, the founder admin dashboard) plus what you told me directly. Where I'm inferring rather than quoting a fact, I've said so.

---

## Step 1 — About your closed test

**Q: How did you recruit users for your closed test?** (259/300)

> Recruited friends and family first, using a PDF Beta Tester Guide with scripted tasks (drop a spot, leave a review, add a friend). Since expanded to 27 testers, including people outside my immediate circle — recruited directly, no paid testing provider used.

**Q: How easy was it to recruit testers?** (radio button — your call, not mine)

I don't have data on this — it's your lived experience recruiting. Growing to 27 testers without a paid provider is a real result, so "Very difficult" probably undersells it — but whether that felt like "Easy" or more like "Neither difficult or easy" depends on how much effort it actually took you. Answer from what happened, not from how the number looks.

**Q: Describe the engagement you received from testers** (273/300)

> Testers used the app organically over weeks: logging real spots, writing reviews, adding friends, and reporting bugs via an in-app feedback banner. An admin dashboard shows each tester's spot/review counts and last-active date, confirming repeat use, not one-time installs.

**Q: Provide a summary of the feedback you received** (297/300)

> Collected via an in-app beta feedback banner/sheet. The first round (July 2026) surfaced three issues: the Save button was hard to find, camera photos weren't saved to the phone gallery, and the feedback sheet visually glitched over the map on Android. All three were fixed and verified on device.

---

## Step 2 — About your app (inferred field list — Google doesn't publish the exact wording, so confirm against what you actually see)

**Q: Who is the intended audience for your app?** (276/300)

> Casual taco lovers who eat tacos often and want a fast, low-effort way to remember and revisit spots — logged in under a minute, often standing at the truck. Starts as a personal log; social discovery (friends' recommendations) unlocks as users connect with people they know.

**Q: Describe how your app provides value / what makes it unique** (280/300)

> TacoAtlas turns scattered taco memories into one searchable personal atlas (photos, ratings, notes), then layers in a friend graph so trusted recommendations surface automatically. It's built around one food category people already have strong opinions about, not generic reviews.

**Q: Expected installs (first year)** — dropdown, your call. You're not running paid acquisition or ASO yet and the app is still friends/family-plus-a-few. Don't pick an aspirational number to look impressive — Google can see your actual install trajectory later and a wildly wrong estimate reads worse than a modest, honest one.

---

## Step 3 — Your production readiness

**Q: What changes did you make based on your closed test feedback?** (294/300)

> Shipped fixes tied directly to tester reports: a prominent sticky Save button, camera photos now also save to the phone gallery, and a fix for an Android bug that broke the feedback sheet over the map. Also completed a UX overhaul (custom map style, one-screen review form) from early feedback.

**Q: How did you decide your app is ready for production?** (269/300)

> Core flows — logging a spot, reviews, photos, friend requests, purchase entitlements — have been running on my own phone as the daily build for weeks and hold up well, including the newest admin/onboarding screens. Automated test suite is green (28 suites/144 tests).

---

## What I didn't verify

- Continuous opt-in duration for your 27 testers in Play Console — you've told me the count, but not how long they've been opted in without a gap.
- Whether your Google Play developer account is classified as "new personal developer account" (the 12-tester/14-day rule applies there specifically) — worth confirming in Play Console before you submit.
- Step 2/3's exact question wording and character limits — Google doesn't publish these and they can vary by account; the questions above are the commonly reported ones, but check your actual screens before pasting.

---

## Photo and video permissions (separate publishing-overview flag)

**This isn't a "justify frequent access" situation — it's an unused-permission situation.** I traced it: `app.json`'s `expo-media-library` plugin config defaults to declaring READ_MEDIA_IMAGES, READ_MEDIA_VIDEO, and READ_MEDIA_AUDIO regardless of use. Your actual code (`src/services/photoService.ts`) only ever calls `MediaLibrary.requestPermissionsAsync(true)` — write-only, to save captured photos to the gallery. Picking an existing photo goes through `expo-image-picker`'s system Photo Picker instead, which doesn't require these permissions at all (confirmed in its own AndroidManifest — no READ_MEDIA_* entries). The app has no video feature anywhere in the codebase. Both permissions were dead weight.

**Fixed:** added `"granularPermissions": []` to the `expo-media-library` plugin block in `app.json` (uncommitted, in your working tree — diff is a two-line addition). Your next build will stop declaring these permissions and the Play Console flag should clear once that build is live. This does **not** retroactively fix whatever AAB is currently under review — you'll need a new build for it to take effect.

**If Play Console needs an answer on the current build before your next upload ships, here's honest stopgap text** (both under the 250-char limit, both true right now):

**READ_MEDIA_IMAGES** (242/250):

> Not used by app functionality. Photos taken in-app save to the gallery via write-only MediaStore access, and existing photos are picked one at a time via Android's system Photo Picker — neither needs this permission. Removed in next release.

**READ_MEDIA_VIDEO** (238/250):

> Unused: TacoAtlas has no video feature — no video capture, playback, or upload anywhere in the app. This permission was an unintended default from a config plugin, not a real functional need. Already removed in our next app.json / build.

My honest read: shipping the fixed build before this gets reviewed is cleaner than submitting a justification for access you don't use — a reviewer who checks your actual runtime behavior against "we need frequent access" would find a mismatch. If a new build isn't realistic on your timeline, the stopgap text above is accurate and defensible as written.
