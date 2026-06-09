# TacoAtlas — Third-Party Services & Tools

Quick reference for every external service the app depends on: what it does, why we use it, cost, and where to manage it.

---

## Backend & Data

### Supabase
- **What:** PostgreSQL database, file storage, and auth infrastructure
- **Why:** Hosts all user data (profiles, spots, reviews, friendships), enforces Row Level Security so users can only see data they're allowed to, and handles file/photo storage
- **Project ID:** `szblruvrajswbpksinkv`
- **Cost:** Free tier (Hobby plan) — upgrades to Pro ($25/mo) when needed
- **Manage:** [supabase.com/dashboard](https://supabase.com/dashboard) → project `szblruvrajswbpksinkv`
- **Used for:**
  - PostgreSQL database (all tables: profiles, spots, reviews, friendships, sub-entries, etc.)
  - Supabase Auth (email magic-link sign-in)
  - Supabase Storage (user-uploaded photos)
  - Row Level Security (RLS) policies enforcing `public` / `friends` / `private` visibility

---

## Authentication

### Supabase Auth *(part of Supabase above)*
- **What:** Email magic-link authentication
- **Why:** Passwordless sign-in — user enters email, gets a link, taps it to sign in. No passwords to manage or store.
- **Flow:** Supabase sends the magic link → link opens `tacoatlas.app/auth/confirm` in browser → page auto-redirects to `tacoatlas://auth/confirm` deep link → app completes sign-in
- **Manage:** Supabase dashboard → Authentication → Users / Email Templates

---

## Payments & Subscriptions

### RevenueCat
- **What:** In-app purchase and subscription management SDK
- **Why:** Handles all the complexity of Google Play Billing — purchase validation, entitlement checks, restore purchases, and webhook events. Single source of truth for who has Pro access.
- **Cost:** Free up to $2,500/mo revenue (2.5% fee beyond that)
- **Manage:** [app.revenuecat.com](https://app.revenuecat.com)
- **Used for:**
  - Validating TacoAtlas Pro one-time purchase
  - `TACOATLAS_PRO` entitlement gating features
  - Restore purchases flow
- **Note:** RevenueCat does NOT store payment card details — that stays with Google Play

### Google Play Billing *(via RevenueCat)*
- **What:** Underlying Android payment processor
- **Why:** Required by Google for all in-app purchases on Android
- **Manage:** [Google Play Console](https://play.google.com/console) → Monetization → Products
- **Package:** `com.tacooatlas.app`

---

## Maps & Location

### Google Maps Platform
- **What:** Interactive map SDK + Places API
- **Why:** Powers the core map view, spot searching, and geocoding (converting addresses to lat/lng coordinates)
- **Cost:** $200/month free credit — covers most small-app usage. Charges kick in beyond that.
- **Manage:** [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Google Maps Platform
- **APIs used:**
  - Maps SDK for Android
  - Places API (spot search / autocomplete)
  - Geocoding API

---

## Push Notifications

### Expo Push Notification Service
- **What:** Notification delivery infrastructure
- **Why:** Expo's push service sits between our app and Google's FCM (Firebase Cloud Messaging), abstracting away platform differences. We send one API call to Expo, they handle delivery.
- **Cost:** Free
- **Manage:** Automatically managed via EAS — no separate dashboard
- **Note:** Push notifications do NOT work in Expo Go — must use a dev client or production build

---

## OTA (Over-the-Air) Updates

### Expo Updates (`expo-updates`)
- **What:** Pushes JS bundle updates to devices without a full app store release
- **Why:** Allows fixing bugs and shipping non-native features instantly, bypassing the Play Store review cycle
- **Cost:** Included in EAS subscription
- **Manage:** EAS dashboard → Updates
- **Shown in app:** Profile page → App section → OTA version string

---

## Build & Distribution

### EAS (Expo Application Services)
- **What:** Cloud build service for React Native apps
- **Why:** Builds Android AAB / APK files in the cloud without needing a local Android SDK setup. Also manages OTA update channels.
- **Cost:** Free tier includes limited builds/month; paid plans for more
- **Manage:** [expo.dev](https://expo.dev) → TacoAtlas project
- **To build a production AAB:**
  ```bash
  eas build --platform android --profile production
  ```

### Google Play Console
- **What:** Android app store distribution
- **Why:** Where the app lives on the Play Store — manage releases, review beta testers, view crash reports and ratings
- **Cost:** One-time $25 developer registration fee
- **Manage:** [play.google.com/console](https://play.google.com/console)
- **App package:** `com.tacooatlas.app`
- **Tracks:** Internal → Closed testing (beta) → Production

---

## Web Hosting

### Vercel
- **What:** Static site hosting and CDN
- **Why:** Hosts `tacoatlas.app` — the landing page, auth bounce page, and legal pages. Zero-config deploys on every push to `main`.
- **Cost:** Free Hobby tier
- **Team:** `picturethatproperty-9826s`
- **Manage:** [vercel.com/picturethatproperty-9826s](https://vercel.com/picturethatproperty-9826s)
- **Repo:** `github.com/ggshubin/tacoatlas` (separate from the mobile app)
- **Pages live:**
  - `/` — landing page + beta signup
  - `/auth/confirm` — email auth bounce page (redirects mobile to deep link)
  - `/terms` — Terms of Service
  - `/privacy` — Privacy Policy
  - `/admin` — internal beta approval email sender

---

## Email

### Resend
- **What:** Transactional email API
- **Why:** Sends beta approval emails from the `/admin` page. Used for outbound only.
- **Cost:** Free tier: 3,000 emails/month, 100/day
- **Manage:** [resend.com](https://resend.com)
- **From address:** `hello@tacoatlas.app` (domain verified in Resend)
- **Used in:** `tacoatlas-web` repo → `/api/send-approval.js` (or similar admin API route)

### ImprovMX
- **What:** Email forwarding service
- **Why:** Forwards all mail sent to `hello@tacoatlas.app` → `mographguy@gmail.com`. Receiving-only — outbound sending still goes through Resend.
- **Cost:** Free tier (1 alias, 25 emails/day)
- **Manage:** [improvmx.com](https://improvmx.com)
- **Setup:** MX records added to tacoatlas.app DNS

---

## Source Control

### GitHub
- **What:** Git repository hosting
- **Why:** Version control and collaboration
- **Repos:**
  - Mobile app: *(private — check github.com/ggshubin)*
  - Web (tacoatlas.app): `github.com/ggshubin/tacoatlas`

---

## Development Tools

### Expo Go
- **What:** Expo's sandboxed dev client app
- **Why:** Fast iteration during development — scan QR code, see changes instantly
- **Limitation:** Does NOT support push notifications or any custom native modules outside Expo's SDK. For those features, use a dev build or production APK.

### Expo CLI / React Native
- **What:** Core mobile development framework
- **Version:** Expo SDK 55, React Native 0.83.6

---

## Fonts (Web only)

### Google Fonts
- **What:** Web font CDN
- **Why:** Serves Anton (display/headers) and Hanken Grotesk (body) on tacoatlas.app
- **Cost:** Free
- **Used:** All tacoatlas.app HTML pages via `<link>` tag

---

## Quick Cost Summary

| Service | Current Cost |
|---------|-------------|
| Supabase | Free (Hobby) |
| RevenueCat | Free (< $2,500 MRR) |
| Google Maps Platform | Free (< $200/mo usage) |
| EAS | Free tier |
| Vercel | Free (Hobby) |
| Resend | Free (< 3k emails/mo) |
| Google Play Console | $25 one-time |
| Forward Email (future) | Free |
| **Total monthly** | **~$0** |

---

*Last updated: June 2026*
