# Cloud Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist user spots and reviews across device reinstalls, add burrito/torta to Supabase, sync pins immediately on drop, and show a restore prompt on sign-in to a new device.

**Architecture:** Four targeted changes to the existing sync layer: (1) Supabase schema for burrito/torta entries, (2) `syncVendorOnly()` called from pin drop, (3) restore prompt in `_layout.tsx` using `hasCloudData()`, (4) burrito/torta wired into all sync/restore paths.

**Tech Stack:** Supabase (Postgres, RLS, JS client), React Native AsyncStorage, Zustand, Expo Router

---

## File Map

| File | Change |
|------|--------|
| Supabase migration (new) | Add `burrito_entries` + `torta_entries` tables with RLS |
| `src/services/reviewRepository.ts` | Extend `CreateReviewInput` + `createReview()` + `updateReview()` for burrito/torta |
| `src/services/syncService.ts` | Add `syncVendorOnly()`, `hasCloudData()`, update `liveSync()`, `restoreFromCloud()`, `syncGuestDataToSupabase()` |
| `src/store/authStore.ts` | Add `showRestorePrompt` state + `setShowRestorePrompt()` + `dismissRestorePrompt()` |
| `app/_layout.tsx` | Wire restore-prompt check into `init()` and `SIGNED_IN` handler; render `<RestorePromptModal />` |
| `src/components/RestorePromptModal.tsx` | New themed modal component (3 states: Idle / Loading / Error) |
| `app/pin/add.tsx` | Call `syncVendorOnly()` after saving pin locally |

---

## Task 1: Supabase schema — burrito_entries and torta_entries

**Files:**
- Apply via Supabase MCP migration tool

- [ ] **Step 1: Apply the migration**

Use the Supabase MCP `apply_migration` tool with project_id `szblruvrajswbpksinkv` and name `add_burrito_torta_entries`:

```sql
-- burrito_entries
CREATE TABLE burrito_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  burrito_type text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE burrito_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read burrito_entries" ON burrito_entries FOR SELECT USING (true);
CREATE POLICY "Owner insert burrito_entries" ON burrito_entries FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_id AND reviews.user_id = auth.uid())
);
CREATE POLICY "Owner delete burrito_entries" ON burrito_entries FOR DELETE USING (
  EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_id AND reviews.user_id = auth.uid())
);

-- torta_entries
CREATE TABLE torta_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  torta_type text NOT NULL,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE torta_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read torta_entries" ON torta_entries FOR SELECT USING (true);
CREATE POLICY "Owner insert torta_entries" ON torta_entries FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_id AND reviews.user_id = auth.uid())
);
CREATE POLICY "Owner delete torta_entries" ON torta_entries FOR DELETE USING (
  EXISTS (SELECT 1 FROM reviews WHERE reviews.id = review_id AND reviews.user_id = auth.uid())
);
```

- [ ] **Step 2: Verify tables exist**

Use Supabase MCP `execute_sql` to confirm:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('burrito_entries', 'torta_entries');
```
Expected: 2 rows returned.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add burrito_entries and torta_entries tables with RLS"
```

---

## Task 2: Extend reviewRepository for burrito/torta

**Files:**
- Modify: `src/services/reviewRepository.ts`

- [ ] **Step 1: Extend `CreateReviewInput` type**

In `src/services/reviewRepository.ts`, add two optional fields to the `CreateReviewInput` interface (after the existing `condiments` field):

```typescript
interface CreateReviewInput {
  vendorId: string
  userId: string
  overallRating: number
  returnIntent: Review['return_intent']
  notes: string | null
  photos: string[]
  privacy: 'public' | 'friends' | 'private'
  tacoEntries: Omit<TacoEntry, 'id' | 'review_id' | 'created_at'>[]
  salsaEntries: Omit<SalsaEntry, 'id' | 'review_id' | 'created_at'>[]
  condiments: string[]
  burritoEntries?: { burrito_type: string; rating: number; notes: string | null }[]  // ADD
  tortaEntries?: { torta_type: string; rating: number; notes: string | null }[]      // ADD
}
```

- [ ] **Step 2: Update `createReview()` to insert burrito/torta entries**

In the `Promise.all` block inside `createReview()`, add two more parallel inserts after the condiments insert:

```typescript
await Promise.all([
  input.tacoEntries.length > 0
    ? supabase.from('taco_entries').insert(
        input.tacoEntries.map(t => ({ ...t, review_id: review.id }))
      )
    : Promise.resolve(),
  input.salsaEntries.length > 0
    ? supabase.from('salsa_entries').insert(
        input.salsaEntries.map(s => ({ ...s, review_id: review.id }))
      )
    : Promise.resolve(),
  input.condiments.length > 0
    ? supabase.from('condiments').insert(
        input.condiments.map(name => ({ name, review_id: review.id }))
      )
    : Promise.resolve(),
  // ADD:
  (input.burritoEntries ?? []).length > 0
    ? supabase.from('burrito_entries').insert(
        (input.burritoEntries ?? []).map(b => ({ ...b, review_id: review.id }))
      )
    : Promise.resolve(),
  (input.tortaEntries ?? []).length > 0
    ? supabase.from('torta_entries').insert(
        (input.tortaEntries ?? []).map(t => ({ ...t, review_id: review.id }))
      )
    : Promise.resolve(),
])
```

- [ ] **Step 3: Update `updateReview()` to replace burrito/torta entries**

`updateReview()` currently only patches the `reviews` row. Extend it to also accept and replace burrito/torta entries:

Replace the existing `updateReview` signature and body:

```typescript
interface UpdateReviewInput {
  overallRating?: number
  returnIntent?: Review['return_intent']
  notes?: string | null
  privacy?: 'public' | 'friends' | 'private'
  burritoEntries?: { burrito_type: string; rating: number; notes: string | null }[]
  tortaEntries?: { torta_type: string; rating: number; notes: string | null }[]
}

async updateReview(id: string, input: UpdateReviewInput): Promise<void> {
  await supabase.from('reviews').update({
    ...(input.overallRating !== undefined && { overall_rating: input.overallRating }),
    ...(input.returnIntent !== undefined && { return_intent: input.returnIntent }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.privacy !== undefined && { privacy: input.privacy, is_public: input.privacy === 'public' }),
  }).eq('id', id)

  // Replace burrito entries if provided
  if (input.burritoEntries !== undefined) {
    await supabase.from('burrito_entries').delete().eq('review_id', id)
    if (input.burritoEntries.length > 0) {
      await supabase.from('burrito_entries').insert(
        input.burritoEntries.map(b => ({ ...b, review_id: id }))
      )
    }
  }

  // Replace torta entries if provided
  if (input.tortaEntries !== undefined) {
    await supabase.from('torta_entries').delete().eq('review_id', id)
    if (input.tortaEntries.length > 0) {
      await supabase.from('torta_entries').insert(
        input.tortaEntries.map(t => ({ ...t, review_id: id }))
      )
    }
  }
},
```

- [ ] **Step 4: Commit**

```bash
git add src/services/reviewRepository.ts
git commit -m "feat: extend reviewRepository with burrito/torta entry sync"
```

---

## Task 3: Extend syncService with new functions and burrito/torta paths

**Files:**
- Modify: `src/services/syncService.ts`

- [ ] **Step 1: Add `hasCloudData()` function**

Add this new function to the `syncService` object, after `syncGuestDataToSupabase`:

```typescript
/**
 * Returns true if the user has any personal vendors in Supabase.
 * Used to decide whether to show the restore prompt on a new device.
 * Never throws — returns false on error.
 */
async hasCloudData(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('id')
      .eq('submitted_by', userId)
      .eq('status', 'personal')
      .limit(1)
    return !error && (data?.length ?? 0) > 0
  } catch {
    return false
  }
},
```

- [ ] **Step 2: Add `syncVendorOnly()` function**

Add this new function to the `syncService` object:

```typescript
/**
 * Syncs a pin-only vendor to Supabase immediately after it's saved locally.
 * Does not require a review. Fire-and-forget safe — never throws.
 */
async syncVendorOnly(vendor: LocalVendor, userId: string): Promise<void> {
  try {
    const supabaseVendorId = await vendorRepository.upsertPersonalVendor(
      vendor.supabaseVendorId ?? null,
      {
        name: vendor.name,
        lat: vendor.lat ?? 0,
        lng: vendor.lng ?? 0,
        address: vendor.address,
        spot_type: vendor.spotType,
        submitted_by: userId,
      }
    )
    if (!vendor.supabaseVendorId) {
      await localStorageService.updateVendor(vendor.localId, { supabaseVendorId })
    }
  } catch (e) {
    console.warn('[syncService] syncVendorOnly failed:', e)
  }
},
```

**Update the existing import line** — `LocalVendor` is NOT currently imported in `syncService.ts`. Replace the existing types import:
```typescript
import type { LocalReview } from '../types/app'
```
with:
```typescript
import type { LocalVendor, LocalReview } from '../types/app'
```

- [ ] **Step 3: Update `liveSync()` — create branch**

In `liveSync()`, find the `createReview` call (the `else` branch, around line 44). Add `burritoEntries` and `tortaEntries` to the call:

```typescript
const sbReview = await reviewRepository.createReview({
  vendorId: supabaseVendorId,
  userId,
  overallRating: localReview.overallRating,
  returnIntent: localReview.returnIntent,
  notes: localReview.notes,
  photos: [],
  privacy: (vendor.privacy ?? 'public') as any,
  tacoEntries: localReview.tacoEntries.map(t => ({
    taco_type: t.tacoType, rating: t.rating, notes: t.notes,
  })),
  salsaEntries: localReview.salsaEntries.map(s => ({
    salsa_name: s.salsaName, flavor_rating: s.flavorRating, heat_level: s.heatLevel,
  })),
  condiments: localReview.condiments,
  // ADD:
  burritoEntries: (localReview.burritoEntries ?? []).map(b => ({
    burrito_type: b.burritoType, rating: b.rating, notes: b.notes,
  })),
  tortaEntries: (localReview.tortaEntries ?? []).map(t => ({
    torta_type: t.tortaType, rating: t.rating, notes: t.notes,
  })),
})
```

- [ ] **Step 4: Update `liveSync()` — update branch**

In `liveSync()`, find the `updateReview` call (the `if (localReview.supabaseReviewId)` branch, around line 37). Add burrito/torta entries:

```typescript
await reviewRepository.updateReview(localReview.supabaseReviewId, {
  overallRating: localReview.overallRating,
  returnIntent: localReview.returnIntent,
  notes: localReview.notes,
  privacy: (vendor.privacy ?? 'public') as any,
  // ADD:
  burritoEntries: (localReview.burritoEntries ?? []).map(b => ({
    burrito_type: b.burritoType, rating: b.rating, notes: b.notes,
  })),
  tortaEntries: (localReview.tortaEntries ?? []).map(t => ({
    torta_type: t.tortaType, rating: t.rating, notes: t.notes,
  })),
})
```

- [ ] **Step 5: Update `restoreFromCloud()` — change return type and fetch burrito/torta**

Replace the current `restoreFromCloud` signature and its internal catch block:

**Three edits to `restoreFromCloud`:**

**Edit A** — Return type change. Replace:
```typescript
async restoreFromCloud(userId: string): Promise<void> {
```
with:
```typescript
async restoreFromCloud(userId: string): Promise<{ success: boolean }> {
```

**Edit B** — Early-exit on Supabase vendor fetch error (around line 111). Replace:
```typescript
if (vErr || !vendors) return
```
with:
```typescript
if (vErr || !vendors) return { success: false }
```

**Edit C** — End of try/catch block. Replace:
```typescript
      console.log('[syncService] restoreFromCloud complete:', vendors.length, 'vendors processed')
    } catch (e) {
      console.warn('[syncService] restoreFromCloud failed:', e)
    }
  },
```
with:
```typescript
      console.log('[syncService] restoreFromCloud complete:', vendors.length, 'vendors processed')
      return { success: true }
    } catch (e) {
      console.warn('[syncService] restoreFromCloud failed:', e)
      return { success: false }
    }
  },
```

**Add burrito/torta fetch** — find the `Promise.all` block that fetches `taco_entries`, `salsa_entries`, `condiments` (around line 151). Add two more fetches:

```typescript
const [
  { data: tacoEntries },
  { data: salsaEntries },
  { data: condiments },
  { data: burritoEntries },   // ADD
  { data: tortaEntries },     // ADD
] = await Promise.all([
  supabase.from('taco_entries').select('taco_type, rating, notes').eq('review_id', r.id),
  supabase.from('salsa_entries').select('salsa_name, flavor_rating, heat_level').eq('review_id', r.id),
  supabase.from('condiments').select('name').eq('review_id', r.id),
  supabase.from('burrito_entries').select('burrito_type, rating, notes').eq('review_id', r.id),   // ADD
  supabase.from('torta_entries').select('torta_type, rating, notes').eq('review_id', r.id),       // ADD
])
```

Then in the `addReview` call, add the mapped entries:

```typescript
await localStorageService.addReview({
  vendorLocalId,
  overallRating: r.overall_rating,
  returnIntent: r.return_intent as any,
  notes: r.notes ?? null,
  photoUris: [],
  tacoEntries: (tacoEntries ?? []).map((t: any) => ({
    tacoType: t.taco_type, rating: t.rating, notes: t.notes ?? null,
  })),
  salsaEntries: (salsaEntries ?? []).map((s: any) => ({
    salsaName: s.salsa_name, flavorRating: s.flavor_rating, heatLevel: s.heat_level,
  })),
  condiments: (condiments ?? []).map((c: any) => c.name),
  // ADD:
  burritoEntries: (burritoEntries ?? []).map((b: any) => ({
    burritoType: b.burrito_type, rating: b.rating, notes: b.notes ?? null,
  })),
  tortaEntries: (tortaEntries ?? []).map((t: any) => ({
    tortaType: t.torta_type, rating: t.rating, notes: t.notes ?? null,
  })),
  supabaseReviewId: r.id,
})
```

- [ ] **Step 6: Update `syncGuestDataToSupabase()` — pass burrito/torta**

In `syncGuestDataToSupabase()`, find the `createReview` call (around line 201). Add burrito/torta:

```typescript
await reviewRepository.createReview({
  vendorId: supabaseVendorId,
  userId,
  overallRating: r.overallRating,
  returnIntent: r.returnIntent,
  notes: r.notes,
  photos: [],
  privacy: localVendor.privacy ?? 'private',
  tacoEntries: r.tacoEntries.map(t => ({
    taco_type: t.tacoType,
    rating: t.rating,
    notes: t.notes,
  })),
  salsaEntries: r.salsaEntries.map(s => ({
    salsa_name: s.salsaName,
    flavor_rating: s.flavorRating,
    heat_level: s.heatLevel,
  })),
  condiments: r.condiments,
  // ADD:
  burritoEntries: (r.burritoEntries ?? []).map(b => ({
    burrito_type: b.burritoType,
    rating: b.rating,
    notes: b.notes,
  })),
  tortaEntries: (r.tortaEntries ?? []).map(t => ({
    torta_type: t.tortaType,
    rating: t.rating,
    notes: t.notes,
  })),
})
```

- [ ] **Step 7: Commit**

```bash
git add src/services/syncService.ts
git commit -m "feat: add syncVendorOnly, hasCloudData, burrito/torta in all sync paths"
```

---

## Task 4: Add restore prompt state to authStore

**Files:**
- Modify: `src/store/authStore.ts`

- [ ] **Step 1: Add `showRestorePrompt` to the `AuthState` interface**

Add to the interface (after `hasCompletedOnboarding`):

```typescript
showRestorePrompt: boolean
setShowRestorePrompt: (value: boolean) => void
dismissRestorePrompt: () => void
```

- [ ] **Step 2: Add initial state and action implementations**

In the `create<AuthState>` body, add (after `hasCompletedOnboarding: false`):

```typescript
showRestorePrompt: false,
```

And add the two action implementations (after `setHasCompletedOnboarding`):

```typescript
setShowRestorePrompt: (value) => set({ showRestorePrompt: value }),
dismissRestorePrompt: () => set({ showRestorePrompt: false }),
```

- [ ] **Step 3: Commit**

```bash
git add src/store/authStore.ts
git commit -m "feat: add showRestorePrompt state to authStore"
```

---

## Task 5: Build the RestorePromptModal component

**Files:**
- Create: `src/components/RestorePromptModal.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/RestorePromptModal.tsx` with the following content:

```typescript
import { useState } from 'react'
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { syncService } from '../services/syncService'
import { useAuthStore } from '../store/authStore'
import { colors, spacing, radius } from '../utils/theme'

export function RestorePromptModal() {
  const { showRestorePrompt, dismissRestorePrompt, session } = useAuthStore()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function handleRestore() {
    if (!session?.user.id) return
    setStatus('loading')
    const result = await syncService.restoreFromCloud(session.user.id)
    if (result.success) {
      dismissRestorePrompt()
      setStatus('idle')
    } else {
      setStatus('error')
    }
  }

  function handleSkip() {
    dismissRestorePrompt()
    setStatus('idle')
  }

  return (
    <Modal
      visible={showRestorePrompt}
      transparent
      animationType="fade"
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back!</Text>
          <Text style={styles.body}>
            {status === 'error'
              ? 'Something went wrong. Try again.'
              : 'You have spots saved in the cloud. Restore them to this device?'}
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleSkip}
              disabled={status === 'loading'}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restoreBtn}
              onPress={handleRestore}
              disabled={status === 'loading'}
            >
              {status === 'loading'
                ? <ActivityIndicator color={colors.bg} size="small" />
                : <Text style={styles.restoreText}>
                    {status === 'error' ? 'Try Again' : 'Restore'}
                  </Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: spacing.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.cream,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 14,
    color: colors.creamMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
  },
  skipText: {
    color: colors.cream,
    fontWeight: '600',
    fontSize: 14,
  },
  restoreBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.full,
    backgroundColor: colors.amber,
    alignItems: 'center',
  },
  restoreText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 14,
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RestorePromptModal.tsx
git commit -m "feat: add RestorePromptModal component"
```

---

## Task 6: Wire restore prompt into _layout.tsx

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Import RestorePromptModal and update useAuthStore destructure**

Add `RestorePromptModal` import at the top of `app/_layout.tsx`:

```typescript
import { RestorePromptModal } from '../src/components/RestorePromptModal'
```

Update the `useAuthStore` destructure to include `setShowRestorePrompt`:

```typescript
const { setSession, loadProfile, setHasCompletedOnboarding, setShowRestorePrompt } = useAuthStore()
```

- [ ] **Step 2: Replace the unconditional `restoreFromCloud` call in `init()`**

Currently in `init()` (around line 47):
```typescript
syncService.restoreFromCloud(session.user.id)
```

Replace with the conditional restore-prompt check:
```typescript
// Show restore prompt if cloud has data but local is empty
const localCount = await localStorageService.getVendorCount()
if (localCount === 0) {
  syncService.hasCloudData(session.user.id).then(hasData => {
    if (hasData) setShowRestorePrompt(true)
  })
}
```

Also add the missing import for `localStorageService` at the top of `app/_layout.tsx` if it's not already imported:
```typescript
import { migrateFromLegacyKeys, localStorageService } from '../src/services/localStorage'
```
(It may already import `migrateFromLegacyKeys` from localStorage — just add `localStorageService` to the same import.)

- [ ] **Step 3: Add restore-prompt check to the SIGNED_IN auth state handler**

The `onAuthStateChange` callback is synchronous, so use an IIFE for the async check. Replace the entire `if (session) { ... }` block inside `onAuthStateChange` with:

```typescript
if (session) {
  loadProfile()
  getPendingRequests(session.user.id).then(p => setPendingFriendCount(p.length))
  ;(async () => {
    if (event === 'SIGNED_IN') {
      const localCount = await localStorageService.getVendorCount()
      if (localCount === 0) {
        syncService.hasCloudData(session.user.id).then(hasData => {
          if (hasData) setShowRestorePrompt(true)
        })
      }
      if (isPro) syncService.bulkSyncOnProUpgrade(session.user.id)
    }
  })()
}
```

- [ ] **Step 4: Render `<RestorePromptModal />` after `ready === true`**

In the `return` statement of `RootLayout`, add `<RestorePromptModal />` after the `<Stack>`:

```typescript
return (
  <>
    <Stack screenOptions={{ contentStyle: { backgroundColor: '#18140F' } }}>
      {/* ... all existing Stack.Screen entries unchanged ... */}
    </Stack>
    {ready && <RestorePromptModal />}
  </>
)
```

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: wire restore prompt into _layout init and SIGNED_IN handler"
```

---

## Task 7: Sync pin-only vendors on drop

**Files:**
- Modify: `app/pin/add.tsx`

- [ ] **Step 1: Import syncService and useAuthStore**

Add imports at the top of `app/pin/add.tsx`:

```typescript
import { useAuthStore } from '../../src/store/authStore'
import { syncService } from '../../src/services/syncService'
```

- [ ] **Step 2: Access session in the component**

Add inside `DropPinScreen()`, after the existing hooks:

```typescript
const { session } = useAuthStore()
```

- [ ] **Step 3: Call `syncVendorOnly` after saving**

In `handleSave()`, replace:

```typescript
      await localStorageService.addVendor({
        name: name.trim(),
        spotType,
        lat: location?.lat ?? 0,
        lng: location?.lng ?? 0,
        address: location?.address ?? null,
        cityName: location?.cityName ?? null,
        hours: null,
        photoUri: null,
        privacy,
        spotNote: spotNote.trim() || null,
        isVisited: false,
      })
      router.back()
```

with:

```typescript
      const savedVendor = await localStorageService.addVendor({
        name: name.trim(),
        spotType,
        lat: location?.lat ?? 0,
        lng: location?.lng ?? 0,
        address: location?.address ?? null,
        cityName: location?.cityName ?? null,
        hours: null,
        photoUri: null,
        privacy,
        spotNote: spotNote.trim() || null,
        isVisited: false,
      })
      // Fire-and-forget: sync pin to Supabase immediately if signed in
      if (session?.user.id) {
        syncService.syncVendorOnly(savedVendor, session.user.id)
      }
      router.back()
```

- [ ] **Step 4: Commit**

```bash
git add app/pin/add.tsx
git commit -m "feat: sync pin-only vendor to Supabase immediately on drop"
```

---

## Verification

After all tasks are complete, test the following manually:

**Test 1 — Pin sync:**
1. Sign in on device
2. Drop a pin (no review)
3. In Supabase dashboard, check `vendors` table — new row with `status = 'personal'` and `submitted_by = your user id` should appear within seconds

**Test 2 — Restore prompt:**
1. Sign in on device A, add a spot with a review
2. Uninstall the app
3. Reinstall and sign in with the same account
4. Restore prompt should appear — tap Restore
5. Spot should appear in the atlas list

**Test 3 — Burrito/torta sync (if Pro features are accessible):**
1. Add a review with burrito entries
2. Check `burrito_entries` table in Supabase — rows should appear

**Test 4 — Skip restore:**
1. Fresh install, sign in, tap Skip on restore prompt
2. Atlas is empty — no crash, no prompt reappears
