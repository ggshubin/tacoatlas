# Changelog

All notable user-facing changes to TacoAtlas, newest first.

Format follows [Keep a Changelog](https://keepachangelog.com/) loosely. The store version has stayed **1.3.0** while Android `versionCode` increments per build, so entries are organized by versionCode + date. Gaps in versionCode numbers are EAS auto-increments or internal test builds with no user-facing changes.

Maintenance rule: when a production build is cut, add its entry here in the same commit/session.

## Unreleased

_Nothing yet._

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
