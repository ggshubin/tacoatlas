# TacoAtlas Backlog

Single source of truth for outstanding work. Keep entries short — link to design docs in `docs/plans/` for anything that needs real planning.

---

## Future features

### Priority polish (next implementation pass)

Four small/medium items the user has flagged for near-term work. Surgical, mostly contained, each ships independently.

- **Privacy clarity in the review composer.** Data model is fine (`reviews.privacy` = `public | friends | private`). UI surfaces it as a single tap with three obvious states + icons + plain language: "Anyone can see this," "Friends only," "Just me." Same data model, much clearer UX. Touches: the review wizard (`app/review/add.tsx`) and the spot/add flow.

- **Public profile screen.** New screen at `app/profile/[username].tsx` (or similar). Display the existing fields a visitor would see — avatar, display_name, username, bio, home_city, favorite_taco, plus stats (spots logged, reviews written). Link to it from `mi-gente` friend rows. Friend-vs-stranger view: friends see private/friends-scope spots, strangers see only public. Already-stored fields, so it's mostly UI work + one query.

- **Onboarding first-win flow.** The first-launch onboarding should drive the user to one successful action — log one spot — before any paywall, sign-up nag, or feature noise. Audit the current onboarding screens (`app/onboarding.tsx` etc.), measure drop-off if instrumentation exists, then re-sequence so the "I just logged my first taco" moment lands inside the first session. Probably: skip the account ask, use guest mode, prompt sign-up only after the first successful log.

- **Closed-spot / duplicate reporting.** "Report this listing" affordance on every vendor card. Reasons: permanently closed, duplicate of another spot, inappropriate, wrong location. Schema: new `vendor_reports` table (id, vendor_id, reporter_id, reason enum, notes, created_at, resolved_at, resolution). Admin moderation queue (gated on `profiles.is_admin = true`). Becomes essential before the paid-vendor portal ships.

### Map & discovery

- **Per-category map icons.** Today every pin uses the same generic taco marker. Render distinct icons by `vendors.spot_type` (`food_truck`, `restaurant`, `pop_up`, `street_cart`, `brick_mortar`, etc.). Likely needs: a small icon set (SVG or PNG) plus a switch in the map marker component to pick the asset by spot_type. Confirm the full enum first — current schema check shows it's a free-text column on `vendors`, may want to normalize to an enum.

- **Check-in / re-visit flow.** When a user is at (or taps) a vendor they've already reviewed, surface a quick "Check in again" path rather than forcing a full new review. Two sub-features:
  - Detect existing review by `(vendor_id, user_id)` and offer a lightweight check-in (date + optional photo + optional updated rating) instead of the full review wizard.
  - Add a `check_ins` table (or reuse `reviews` with a `check_in_only` flag) and show a visit-count on the profile / vendor page.

- **Popularity indicator on the map.** When multiple users log entries at the same vendor, show a count badge on the pin (e.g. a small "12" or a heatmap intensity). Needs: aggregate query on `reviews` grouped by `vendor_id`, plus marker UI that overlays the count. Decide whether this counts unique users or total reviews — friends-only vs. public vs. all users will affect the privacy story.

### Social & engagement

- **Friend activity feed (priority once growth picks up).** Surface a chronological stream of friends' recent activity — new spots logged, ratings, photos — gated by each entry's privacy setting. Likely on the `mi-gente` tab or a new "Feed" tab. The network already exists (`friendships`), so this is the lowest-cost way to convert one person's logging into a reason their friends keep opening the app. Network-effect lever; should jump to top priority the moment user growth signals warrant it.

- **Year-in-review / Taco Wrapped.** Generate a shareable card (Instagram-story-friendly aspect ratio, branded) at end-of-year and on-demand. Stats: total tacos, top spot, longest streak, new cities visited, rare dishes tried, top friend you "matched" with most often. Sharing = free acquisition. Render server-side or with `react-native-view-shot` to PNG.

- **Free Pro trial on signup (7-day).** Right now a new user hits the 15-spot wall cold. Give every new signup 7 days of full Pro automatically, so they feel the value before being asked to pay. Track via `profiles.trial_started_at` and the existing RC + `is_pro` plumbing. Trial expiry should fall back to free tier cleanly, not lock them out.

- **Referral mechanic.** Both inviter and invitee get +1 month of Pro when an invite results in a confirmed signup. Pairs naturally with `mi-gente`'s invite flow (`mi-gente/add.tsx` already has an invite-via-SMS path). Schema: `referrals (id, inviter_id, invitee_id, redeemed_at)`. Mechanics: RevenueCat promotional entitlements (1-month grants) or the `is_pro` flag with an expiry column — pick whichever is simpler to revoke.

### Map filtering & data depth

- **Open-now filter.** Use existing `vendors.hours` (currently free text). Parse to structured form (per-day open/close, optional), then expose an "Open now" chip on the map. Highest-utility filter for "where do I eat right now?" Likely needs a normalization migration on existing `hours` data first.

- **Price logging on review entries.** Add an optional `price_cents` column to `taco_entries`, `burrito_entries`, `torta_entries`, `salsa_entries`. Powers personal stats — "$312 spent on tacos this year, avg $9.40, best value at El Chato." Sticky, shareable, easy to ignore if a user doesn't care. Display in currency formatted to user's locale.

### Visibility & contribution policy

- **Tighten the read/write split between guests, free, and Pro users.** Intent:
  - **Read public spots** — guests, free, and Pro users can all see any vendor / review marked `public`. (Confirm current RLS allows this — the security-hardening migration restricted `profiles` reads to authenticated users; check `vendors` and `reviews` SELECT policies do the same or don't, and align.)
  - **Write to the public pile** — only signed-in users (free or Pro). Guests can still log spots, but their entries are stored locally / privately and never enter the shared public pool. To contribute publicly, they need to create an account.
  - **Free vs. Pro** — Pro gating stays where it already is (e.g. the 15-spot cap for free users). This change is specifically about the guest-vs-signed-in boundary, not the free-vs-Pro one.
  - Work breakdown: audit RLS on `vendors` and `reviews` for SELECT (must allow anon for `privacy = 'public'` / `status = 'approved'` rows), then audit the client-side "add spot" / "add review" flows to require a session before any insert with `privacy = 'public'`, plus give guests a nudge ("Sign up to share this spot publicly — or save it just for yourself").

### Vendor accounts (B2B monetization)

- **Paid vendor portal.** A separate account type so vendors can claim their listing and pay for enhanced presence. Distinct from the user-side Pro subscription — different audience, different pricing, different value prop. What a paid vendor can do:
  - Claim an existing `vendors` row (or create a new verified one) — single source of truth so the same vendor doesn't fork into two listings
  - Upload logo, cover photo, gallery
  - Maintain contact info (phone, website, social, email)
  - Maintain hours (per-day + special hours for holidays)
  - Post promotions / specials ("Taco Tuesday $1 al pastor") with start/end dates
  - Push notifications to followers / users who've reviewed them (rate-limited)
  - Analytics — how many users viewed the listing, how many reviewed, average rating trend
  - Optional: respond to public reviews
  - Optional: featured placement on the map (subtle — e.g. slightly larger pin or a "verified" badge), with disclosure
- **Verification model.** How do we prove the vendor actually owns the spot? Options to evaluate:
  - Address-based postcard with a code (Google's model — slow, manual, expensive)
  - Phone verification matching the business phone listed in public records
  - Manual review of a business doc (license, lease, utility bill) — staffing cost
  - "Verified by reviews" — if N existing TacoAtlas users vouch in-app
  - Pick whichever has the lowest fraud risk for the price point we charge
- **Schema sketch.** Likely a new `vendor_accounts` table (or extension of `profiles` with a `role` enum), plus a `vendor_claims` table tracking pending/approved/rejected claims linking `auth.users` ↔ `vendors`. RLS so a vendor account can only update the `vendors` row(s) they've claimed.
- **Monetization plumbing.** Probably a separate RevenueCat offering with a B2B price (monthly + annual). Could also be Stripe direct if RC pricing/tax handling isn't a fit for businesses. Decide before building.
- **Conflict resolution.** What happens if two people claim the same vendor? What if the vendor disputes a public review? Need a moderation queue and policy.

### Localization & platforms

- **Spanish language toggle.** Add an in-app language switch (English / Español) covering every visible string, error message, email template, and notification copy. Likely stack: `i18next` + `react-i18next` (or `expo-localization` + a hand-rolled dictionary if we want zero deps). Work breakdown:
  - Sweep the codebase for hardcoded strings, extract to a translations file
  - Default to device locale on first launch, override via Settings toggle
  - Re-translate the three Resend email templates (Supabase supports multiple templates per language via the dashboard's locale selector)
  - Decide on tone — formal vs. informal `tú` — and document it in the translations file so future copy stays consistent
  - Test pluralization edge cases (`1 taco logged` vs `2 tacos registrados`)

- **iOS port.** Gated on reaching a paying-user threshold that makes the Apple Developer Program fee + the time investment worth it. The Expo / React Native codebase is largely platform-agnostic, but expect:
  - Apple Developer account ($99/year)
  - RevenueCat App Store side (separate offerings, products, sandbox testing)
  - iOS-specific permission strings in `app.json` (camera, photos, location, push)
  - Universal Links / Associated Domains setup for the same email-link deep linking we set up on Android
  - First-build code signing dance (provisioning profiles, certs — EAS can manage these)
  - Re-test the entire signup / Pro purchase / map flows on a real iOS device before submitting
  - Apple App Review (usually 24–48h, can be longer for first submissions or anything they flag)

---

## Known issues / fixes

- **Three test accounts stuck with NULL username.** `mashashubin@gmail.com`, `kyrashubin@gmail.com`, `georgie.shubin@gmail.com` were created before the signup metadata fix and have `profiles.username = NULL`. They appear in-app without usernames. Either ask each to edit their profile in-app, or backfill via SQL.

- **Existing profile rows for new signups still empty if metadata wasn't passed.** Same root cause as above. Going forward (v29+) this can't recur, but worth a one-time sweep if any test users got created between v27 and v29.

---

## Recently shipped

For context; remove entries from this list as they age out.

### June 8–9, 2026

- Terms of Service + Privacy Policy pages live at `tacoatlas.app/terms` and `/privacy` — profile links now resolve
- Desktop browser bounce page live at `tacoatlas.app/auth/confirm`
- Beta feedback banner shipped and working
- EAS Update configured (`updates.url`, `runtimeVersion`, preview/production channels) — OTA delivery works starting with the next binary build
- All pre-existing TypeScript errors fixed and Expo SDK 55 packages aligned (`1af0d49`)

### June 6, 2026

- Resend SMTP wired through Supabase (Auth → Emails → SMTP) — domain `tacoatlas.app` verified
- Branded email templates in `docs/email-templates/` for confirm-signup, reset-password, change-email
- Signup metadata trigger — `username` + `display_name` flow into `profiles` even before email confirmation; `search_path` pinned on `SECURITY DEFINER` functions
- PKCE deep-link handler — confirmation / recovery / email-change links now exchange the code via `supabase.auth.exchangeCodeForSession` and route correctly
- Password reset flow end-to-end (forgot-password screen, reset-password screen, deep-link wiring)
- Server-side `is_pro` override on `profiles` — 9 existing test users grandfathered to lifetime Pro; new signups default to false
- Production AAB v29 (versionCode 29) shipped to Internal testing track

---

## Conventions for this file

- **Status implied by section.** "Future features" = not started. "Known issues" = needs fixing. "Recently shipped" = done within ~30 days.
- **Link out for anything > a paragraph.** Put design / impl plans in `docs/plans/YYYY-MM-DD-name.md` and reference from here.
- **Trim ruthlessly.** When something ships, move it to "Recently shipped"; when "Recently shipped" gets long, prune the oldest entries.
