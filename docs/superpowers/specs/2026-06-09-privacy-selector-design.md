# Privacy Selector — Design

**Date:** 2026-06-09
**Backlog item:** "Privacy clarity in the review composer" (priority polish #1)
**Status:** Approved by user (mockups reviewed in visual companion)

## Problem

The "Who can see this?" control appears in two places — the review wizard (`app/review/add.tsx`) and the drop-pin flow (`app/pin/add.tsx`) — as a duplicated three-button row (Public / Mi Gente / Just Me) with icons but no explanation of what each state means. Worse, the two flows contradict each other on gating:

- Review wizard: free users are forced to `private` at save time and see a locked row with a Sign Up button.
- Drop-pin flow: free users can select Public or Mi Gente and it saves as chosen — a Pro feature leaking to free.

## Product decision (confirmed 2026-06-09)

- **Free tier = personal log.** Sharing (Public and Mi Gente) is Pro-only, everywhere.
- Free users see all three options, but Public and Mi Gente are **greyed out with a PRO badge**; only Just Me is selectable.
- No schema or RLS changes in this pass — gating is client-side with a save-time guard. The broader guest/free/Pro security audit stays a separate backlog item.

## Design

### Component

New shared component `src/components/PrivacySelector.tsx`. Both flows render it; the duplicated `PRIVACY_OPTIONS` arrays and `privacy*` styles in `app/review/add.tsx` and `app/pin/add.tsx` are deleted.

```ts
interface PrivacySelectorProps {
  value: PrivacySetting              // 'public' | 'friends' | 'private'
  onChange: (value: PrivacySetting) => void
  isPro: boolean
  isSignedIn: boolean
}
```

### Layout (approved: "segmented row + live caption")

- The existing compact three-button segmented row (icon + short label per button) stays.
- Below it, one caption line that updates with the selection:
  - Public → "Anyone on TacoAtlas can see this spot and your review."
  - Mi Gente → "Only your friends can see this."
  - Just Me → "Saved to your personal log — only you can see it."
- Selected button: amber border/background (existing `privacyBtnActive` treatment).

### Free-tier (non-Pro) behavior

- Public and Mi Gente render at reduced opacity (~0.45) with a small amber **PRO** badge on the top-right corner of each button.
- Just Me is selected; `value` is forced to `private` (component calls `onChange('private')` if mounted with anything else while `!isPro`).
- Tapping a locked option does **not** select it. Instead the caption area swaps to an upgrade nudge: "Sharing your atlas is a Pro feature." plus an **Upgrade** button.
  - Signed-in user → Upgrade triggers the existing RevenueCat purchase flow (same `proService` path the profile page uses).
  - Guest (not signed in) → button reads **Sign Up** and routes to `/(auth)/sign-up` (existing behavior preserved).
- The nudge reverts to the normal Just Me caption when the user taps Just Me. No timer.

### Save-time guard (defense in depth)

Client gating alone can be bypassed by stale store state. Both flows keep/gain a one-line guard at save:

- `app/review/add.tsx`: keep existing `effectivePrivacy = isPro ? store.privacy : 'private'`.
- `app/pin/add.tsx`: add the same guard before `localStorageService.addVendor(...)` (currently missing — this is the leak fix).

### Out of scope

- RLS/policy changes on `vendors`/`reviews` (separate backlog item).
- The "free user opts in to registering the location publicly" idea — deferred; free saves are fully private for now.
- Any change to the 15-spot free cap or other Pro gates.

## Testing

Component tests (`src/components/__tests__/PrivacySelector.test.tsx`), following the existing testID-based query pattern:

1. Pro: renders all three options, none locked; tapping each fires `onChange` with the right value.
2. Pro: caption text matches the selected value.
3. Free: Public and Mi Gente render locked (PRO badge testIDs present); tapping them fires no `onChange`.
4. Free: tapping a locked option shows the upgrade nudge; Upgrade visible when `isSignedIn`, Sign Up when not.
5. Free: mounting with `value='public'` and `isPro=false` normalizes to `private`.

Integration check (manual): review wizard step 1 and drop-pin screen render the shared component; free-tier pin save stores `privacy='private'` regardless of prior store state.
