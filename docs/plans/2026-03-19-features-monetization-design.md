# TacoAtlas — Features & Monetization Design
Date: 2026-03-19

## Overview

TacoAtlas is a personal taco spot logger for iOS and Android. The target audience is casual food explorers who want to remember where the good tacos are, with a secondary social layer for sharing spots with friends or the public.

The goal is side income with passion project energy. Monetization is a one-time unlock ("TacoAtlas Pro") at $3.99. No ads anywhere.

---

## Monetization Model

**Free tier (forever):**
- Log up to 15 spots
- Full review form (tacos, salsas, condiments, photos, notes)
- Local storage only
- Basic "Find My Tacos" nearby search (5 Google Places searches/day)
- Map view of your spots (up to 15 pins)
- "Share My Taco" — send a single spot as a link or card to anyone (no account needed to view)

**TacoAtlas Pro — $3.99 one-time unlock:**
- Unlimited spots (map and atlas scale with you)
- Continuous cloud sync and backup via Supabase
- Unlimited Google Places searches in "Find My Tacos"
- Social atlas — per-spot privacy: private / friends-only / public
- Public profile with shareable URL (e.g. tacooatlas.app/george)
- "Want to Try" wishlist
- Statistics dashboard
- Export your atlas (image card or CSV)
- Cloud photo backup
- Home screen widget (iOS + Android)

**Upgrade trigger:** When a free user tries to log spot #16, they see the Pro paywall. This moment is high-intent — they're actively out eating tacos and engaged with the app.

---

## New Features to Build

### Free Tier Improvements

**Search and filter — My Tacos tab**
- Search by spot name
- Filter by spot type (Truck, Cart, Brick & Mortar, etc.)
- Sort by rating or date added

**Continuous cloud sync**
- Currently, edits after initial sign-up stay local only
- All creates, edits, and deletes should sync to Supabase in real time

**Map view (free, capped at 15 spots)**
- Show all logged spots as pins on a map
- Color-code pins by overall rating
- Tap a pin to see the spot card and navigate to spot detail

**"Share My Taco" (free)**
- Tap any spot, hit Share
- Generates a link or visual card showing spot name, type, photo, and your rating
- Recipient does not need a TacoAtlas account to view

### Google Places Integration — "Find My Tacos" tab

- Show real taco spots from Google Places API alongside user-logged spots in nearby search
- Tap a Google Places result to see name, address, hours, and location
- Hit "Add to My Atlas" to pre-fill a new spot with Google Places data (name, address, lat/lng)
- User completes their own TacoAtlas review from scratch — no Google ratings shown
- Adding a spot from Google Places counts toward the 15-spot free limit
- Free tier: 5 Google Places searches/day. Pro: unlimited.

### Pro Features

**Statistics dashboard**
- Total spots logged
- Average overall rating
- Favorite spot type
- Heat level breakdown (mild through volcano)
- Most-visited city
- Best and worst rated spot

**Social atlas**
- Per-spot privacy toggle: private / friends-only / public
- Public profile at a shareable URL
- Friends can follow you and see your public spots in their Find My Tacos tab

**"Taco Passport"**
- Visual badge collection
- Badges unlock by logging different spot types, cities, and heat levels
- Adds gamification without being intrusive

**Export**
- Share atlas as a styled image card
- Download as CSV

**Cloud photo backup**
- Photos currently live on-device only
- Pro syncs all photoUris to Supabase Storage

**Home screen widget**
- Shows top-rated spot or most recent visit
- iOS and Android

**"Want to Try" wishlist**
- Log a spot you haven't visited yet
- Separate from reviewed spots in the atlas
- Tap to convert to a full review when you visit

---

## App Store Positioning

**Category:** Food & Drink
**Name:** TacoAtlas
**Subtitle:** Log, rate & share your taco spots
**Hook:** Stop forgetting where the good tacos are.

**Keywords:** taco tracker, taco app, taco log, food journal, street tacos, taco spots, taco finder, food diary, taco rating, taco map

**Positioning:** TacoAtlas sits in a gap that doesn't exist on the App Store. Yelp is too broad. Google Maps has no personal log. No dedicated taco app exists with a personal atlas plus a social layer. Lead with that specificity — this is for people who take tacos seriously.

**Screenshot flow:**
1. Map view with pins — visual proof the app is fun
2. Review form — shows depth (salsa heat levels, taco entries, condiment chips)
3. Atlas list — your personal collection
4. "Share My Taco" card — social proof in one tap
5. Stats dashboard — aspirational, shows what Pro unlocks

**Price:** $3.99 one-time for Pro. Not $1.99 (feels disposable). $3.99 signals real value and is still an impulse buy.

---

## Known Issues to Fix (prerequisite work)

These are existing gaps that need to be resolved before or alongside the new features:

- Continuous cloud sync after sign-up (edits currently stay local)
- Sign-in does not merge or sync existing local data
- Find My Tacos 20,000km fallback radius when GPS is unavailable
- Supabase vendor detail screen (vendor/[id].tsx) is stubbed — needs implementation
- No pagination on vendor/review lists

---

## Intentionally Out of Scope

- Push notifications
- In-app messaging between users
- Taco recommendation engine
- Ads of any kind
