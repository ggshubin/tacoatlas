# Cloud Sync Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure user spots and reviews persist across device reinstalls and new devices, including Pro-only entry types (burrito, torta).

**Architecture:** Extend the existing `syncService.ts` with targeted additions — pin-only sync on drop, restore prompt on sign-in, and burrito/torta support in both the Supabase schema and sync logic.

**Tech Stack:** Supabase (Postgres + RLS), React Native AsyncStorage, existing `syncService.ts` / `vendorRepository.ts` / `reviewRepository.ts` / `authStore.ts` / `app/_layout.tsx`

---

## Problem

User spots and reviews are stored in local AsyncStorage, scoped by user ID. When a user installs the app on a new device and signs in, local storage is empty — their data is gone from that device even though it exists in Supabase (for spots that had reviews synced via `liveSync`). Additionally:

- Pin-only spots (no review) are never synced to Supabase — they are lost permanently on reinstall
- Pro entry types (burrito, torta) have no Supabase schema — they are lost on reinstall even for reviewed spots
- `restoreFromCloud()` exists in `syncService.ts` but is never called after sign-in to an existing account on a new device

---

## Approach

**Approach A: Targeted fixes to existing syncService**

Three specific additions:
1. Sync vendors to Supabase immediately when a pin is dropped (not just when a review is saved)
2. Show a themed restore prompt when the app starts with a session but empty local storage
3. Add burrito/torta tables to Supabase and wire them into all sync and restore paths

---

## Section 1: Database Schema

### New table: `burrito_entries`

```sql
CREATE TABLE burrito_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  burrito_type text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE burrito_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read burrito_entries" ON burrito_entries
  FOR SELECT USING (true);

CREATE POLICY "Owner insert burrito_entries" ON burrito_entries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_id AND reviews.user_id = auth.uid())
  );

CREATE POLICY "Owner delete burrito_entries" ON burrito_entries
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_id AND reviews.user_id = auth.uid())
  );
```

### New table: `torta_entries`

```sql
CREATE TABLE torta_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  torta_type text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE torta_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read torta_entries" ON torta_entries
  FOR SELECT USING (true);

CREATE POLICY "Owner insert torta_entries" ON torta_entries
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_id AND reviews.user_id = auth.uid())
  );

CREATE POLICY "Owner delete torta_entries" ON torta_entries
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_id AND reviews.user_id = auth.uid())
  );
```

Note: UPDATE policies are intentionally omitted — sub-entries are always replaced via delete+reinsert, matching the existing `taco_entries` pattern.

---

## Section 2: Sync Flow

### 2a. Pin-only sync (immediate on drop)

**Trigger:** `app/pin/add.tsx` — after saving vendor to local storage, if `session?.user.id` exists.

**New function in `syncService.ts`:** `syncVendorOnly(vendor: LocalVendor, userId: string): Promise<void>`

Steps:
1. Call `vendorRepository.upsertPersonalVendor(vendor.supabaseVendorId ?? null, { name, lat, lng, address, spotType, hours, photoUri, submitted_by: userId })`
   - Note: `submitted_by` (snake_case) matches the actual `upsertPersonalVendor` parameter signature
2. Receive returned Supabase UUID
3. Call `localStorageService.updateVendor(vendor.localId, { supabaseVendorId: returnedId })`
4. Wrap in try/catch — on failure, log a warning and return (never throw)

### 2b. Restore prompt on cold start / sign-in

**Where the check lives: `app/_layout.tsx`**

The check must run in `_layout.tsx`'s `init()` function (which runs on cold start for returning users) AND in the `SIGNED_IN` auth state change handler (which runs after fresh sign-in). Both paths converge on the same logic:

```
if (session exists) {
  localCount = localStorageService.getVendorCount()
  if (localCount === 0) {
    cloudHasData = syncService.hasCloudData(userId)
    if (cloudHasData) {
      authStore.setShowRestorePrompt(true)
    }
  }
}
```

The restore modal is rendered in `app/_layout.tsx` and is only mounted after `ready === true` (i.e., after the Stack has resolved), preventing rendering issues before navigation is ready.

**New function in `syncService.ts`:** `hasCloudData(userId: string): Promise<boolean>`

```typescript
const { data, error } = await supabase
  .from('vendors')
  .select('id')
  .eq('submitted_by', userId)
  .eq('status', 'personal')
  .limit(1)

return !error && (data?.length ?? 0) > 0
```

On error: return `false` silently (do not show prompt, do not block sign-in).

**Restore flow:**
1. `showRestorePrompt` is `true` → modal renders over the tab layout
2. User taps **Restore** → call `syncService.restoreFromCloud(userId)` with loading spinner
3. On success → dismiss modal (`authStore.dismissRestorePrompt()`)
4. On failure → show "Something went wrong. Try again." with a Retry button inside the modal
5. User taps **Skip** → `authStore.dismissRestorePrompt()`

**Error propagation from `restoreFromCloud()`:**

`restoreFromCloud()` currently catches all errors internally (fire-and-forget). To support the modal error state, change its return type to `Promise<{ success: boolean }>`:

```typescript
// Before: Promise<void> with internal catch
// After:
async function restoreFromCloud(userId: string): Promise<{ success: boolean }> {
  try {
    // existing restore logic...
    return { success: true }
  } catch (e) {
    console.warn('[syncService] restoreFromCloud failed', e)
    return { success: false }
  }
}
```

The caller in `_layout.tsx` checks the result:
```typescript
const result = await syncService.restoreFromCloud(userId)
if (!result.success) {
  // keep modal open in error state — user can retry
} else {
  authStore.dismissRestorePrompt()
}
```

### 2c. liveSync() — burrito/torta on both create and update branches

`liveSync()` has two branches when syncing a review:

**Create branch** (no `supabaseReviewId`): calls `reviewRepository.createReview()`. The call-site in `liveSync()` must explicitly pass the new fields:

```typescript
await reviewRepository.createReview({
  // existing fields...
  tacoEntries: localReview.tacoEntries,
  salsaEntries: localReview.salsaEntries,
  condiments: localReview.condiments,
  burritoEntries: localReview.burritoEntries ?? [],   // ADD
  tortaEntries: localReview.tortaEntries ?? [],        // ADD
})
```

**Update branch** (has `supabaseReviewId`): currently calls `reviewRepository.updateReview()` which only patches the `reviews` row. This must be extended to also replace sub-entries:

After calling `updateReview()`, additionally:
1. Delete all existing `burrito_entries` for the review ID
2. Delete all existing `torta_entries` for the review ID
3. Insert fresh `burritoEntries` and `tortaEntries` from the local review

This is identical to what `liveSync()` should also do for `taco_entries` on the update branch if it doesn't already — verify and add if missing.

### 2d. syncGuestDataToSupabase() — must pass burrito/torta

`syncGuestDataToSupabase()` calls `reviewRepository.createReview()` for each local review. Once `createReview()` accepts `burritoEntries` and `tortaEntries`, `syncGuestDataToSupabase()` must pass those fields from the local review — otherwise Pro entry data is silently lost for users who signed up while offline.

Update the call in `syncGuestDataToSupabase()`:
```typescript
await reviewRepository.createReview({
  // existing fields...
  tacoEntries: review.tacoEntries,
  salsaEntries: review.salsaEntries,
  condiments: review.condiments,
  burritoEntries: review.burritoEntries ?? [],   // ADD
  tortaEntries: review.tortaEntries ?? [],        // ADD
})
```

---

## Section 3: Service Layer Changes

### `syncService.ts`

**Add:** `syncVendorOnly(vendor, userId)` — described in 2a.

**Add:** `hasCloudData(userId)` — described in 2b.

**Update `liveSync()`:**
- Create branch: pass `burritoEntries` and `tortaEntries` to `reviewRepository.createReview()`
- Update branch: after `updateReview()`, delete+reinsert `burrito_entries` and `torta_entries` for the review (see 2c)

**Update `restoreFromCloud()`:**
- For each restored review, after fetching `taco_entries`, also fetch `burrito_entries` and `torta_entries`
- Map to `LocalBurritoEntry[]` / `LocalTortaEntry[]` and include in the local review object passed to `localStorageService.addReview()`

**Update `syncGuestDataToSupabase()`:**
- Pass `burritoEntries` and `tortaEntries` when calling `createReview()` (see 2d)

### `reviewRepository.ts`

**Update `CreateReviewInput` type:**
```typescript
burritoEntries?: LocalBurritoEntry[]   // default []
tortaEntries?: LocalTortaEntry[]       // default []
```

**Update `createReview()`:**
- After inserting `taco_entries`, also insert `burrito_entries` and `torta_entries` in parallel
- Pattern: `supabase.from('burrito_entries').insert(burritoEntries.map(e => ({ review_id, burrito_type: e.burritoType, rating: e.rating, notes: e.notes })))`

**Update `updateReview()`:**
- This function currently only patches the `reviews` row
- Add: delete all `burrito_entries` for `review_id`, then insert fresh from input
- Add: delete all `torta_entries` for `review_id`, then insert fresh from input
- Input type extended to accept `burritoEntries?: LocalBurritoEntry[]` and `tortaEntries?: LocalTortaEntry[]`

### `authStore.ts`

**Add state:**
```typescript
showRestorePrompt: boolean  // default false
```

**Add actions:**
```typescript
setShowRestorePrompt(value: boolean): void
dismissRestorePrompt(): void  // sets showRestorePrompt = false
```

### `app/_layout.tsx`

**Update `init()` and `SIGNED_IN` handler:**
- After session is confirmed, run the restore-prompt check (see 2b)
- Render `<RestorePromptModal />` after `ready === true`, reading `showRestorePrompt` from authStore

### `app/pin/add.tsx`

**Update save handler:**
- After `localStorageService.addVendor(vendor)` succeeds and user is authenticated
- Call `syncService.syncVendorOnly(savedVendor, session.user.id)` — fire and forget

---

## Section 4: Restore Modal UI

**Component:** `src/components/RestorePromptModal.tsx`

Rendered in `app/_layout.tsx` after `ready === true`. Uses React Native `Modal` (not `Alert.alert`).

Styled to match existing modals (reference: `src/components/ProPaywallModal.tsx` for exact token usage):
- Background overlay: `rgba(0,0,0,0.65)`
- Card: `colors.surface`, `borderRadius: radius.lg`, `borderWidth: 1`, `borderColor: colors.surfaceBorder`
- Title: `colors.cream`, `fontWeight: '800'`
- Body: `colors.creamMuted`
- **Restore** button: `backgroundColor: colors.amber`, `colors.bg` text, shows `ActivityIndicator` while restoring
- **Skip** button: `colors.surfaceRaised` background, `borderColor: colors.surfaceBorder`, `colors.cream` text

States:
1. **Idle** — title "Welcome back!", body "You have spots saved in the cloud. Restore them to this device?", [Skip] [Restore] buttons
2. **Loading** — Restore button replaced with `ActivityIndicator`, Skip disabled
3. **Error** — body "Something went wrong. Try again.", [Skip] [Try Again] buttons

---

## Error Handling

- `syncVendorOnly`: catch + warn, never throw, UI unaffected
- `hasCloudData`: on error return `false`, no prompt shown, sign-in unblocked
- `restoreFromCloud`: on error set modal to error state with retry option
- All other sync (liveSync, bulkSync, guestSync): existing fire-and-forget behavior unchanged

---

## Out of Scope

- Merge conflict resolution when data exists on both old and new device simultaneously (deferred)
- Real-time sync / Supabase subscriptions
- Offline sync queue with retry logic
- Salsa entry `notes` field already exists in Supabase schema — no change needed
