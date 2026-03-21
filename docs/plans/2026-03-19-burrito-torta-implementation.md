# Burrito & Torta Reviews (Pro Feature) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Pro users can rate burritos and tortas within the same spot visit review, controlled by a "What did you order?" chip selector at Step 1 of the review form.

**Architecture:** Four sequential tasks. First extend the type system and localStorage defaults (no migration needed). Then update the Zustand store to support dynamic step sequencing driven by `orderedItems`. Then update the review form UI. Finally update the spot detail screen to display burrito/torta entries.

**Tech Stack:** TypeScript, Zustand, React Native, Expo Router, AsyncStorage, Jest

---

## Task 1: Extend Types

**Files:**
- Modify: `src/types/app.ts`
- Test: `src/types/__tests__/app.test.ts`

### Step 1: Write the failing test

Create `src/types/__tests__/app.test.ts`:

```typescript
import type { LocalReview, LocalBurritoEntry, LocalTortaEntry } from '../app'

describe('LocalReview burritoEntries and tortaEntries', () => {
  it('LocalBurritoEntry has itemType, rating, notes', () => {
    const entry: LocalBurritoEntry = {
      itemType: 'carne asada',
      rating: 4,
      notes: null,
    }
    expect(entry.itemType).toBe('carne asada')
    expect(entry.rating).toBe(4)
    expect(entry.notes).toBeNull()
  })

  it('LocalTortaEntry has itemType, rating, notes', () => {
    const entry: LocalTortaEntry = {
      itemType: 'milanesa',
      rating: 5,
      notes: 'amazing bread',
    }
    expect(entry.itemType).toBe('milanesa')
    expect(entry.rating).toBe(5)
    expect(entry.notes).toBe('amazing bread')
  })

  it('LocalReview accepts burritoEntries and tortaEntries', () => {
    const review: LocalReview = {
      localId: 'abc',
      vendorLocalId: 'xyz',
      overallRating: 4,
      returnIntent: 'yes',
      notes: null,
      photoUris: [],
      tacoEntries: [],
      salsaEntries: [],
      condiments: [],
      burritoEntries: [{ itemType: 'pollo', rating: 3, notes: null }],
      tortaEntries: [],
      createdAt: new Date().toISOString(),
    }
    expect(review.burritoEntries).toHaveLength(1)
    expect(review.tortaEntries).toHaveLength(0)
  })
})
```

### Step 2: Run test to verify it fails

```bash
npx jest src/types/__tests__/app.test.ts --no-coverage
```

Expected: FAIL — `LocalBurritoEntry` and `LocalTortaEntry` do not exist

### Step 3: Add new types to `src/types/app.ts`

Add after the `LocalSalsaEntry` interface:

```typescript
export interface LocalBurritoEntry {
  itemType: string
  rating: number
  notes: string | null
}

export interface LocalTortaEntry {
  itemType: string
  rating: number
  notes: string | null
}
```

Update `LocalReview` — add two new fields after `salsaEntries`:

```typescript
burritoEntries: LocalBurritoEntry[]
tortaEntries: LocalTortaEntry[]
```

### Step 4: Run test to verify it passes

```bash
npx jest src/types/__tests__/app.test.ts --no-coverage
```

Expected: PASS

### Step 5: Fix existing code that constructs `LocalReview` objects

Search for every place that constructs a `LocalReview` and add the two new fields defaulted to `[]`. Run:

```bash
grep -rn "tacoEntries:" src/ app/ --include="*.ts" --include="*.tsx"
```

For each match that constructs a full `LocalReview` object (not just reads it), add:

```typescript
burritoEntries: [],
tortaEntries: [],
```

Also update `loadForEdit` in `src/store/reviewFormStore.ts` (covered in Task 2).

Also update any place that reads a `LocalReview` from AsyncStorage and passes it around — add a safety default so old stored reviews don't break:

In `src/services/localStorage.ts`, update `getReviews()` to normalize old data:

```typescript
async function getReviews(): Promise<LocalReview[]> {
  const raw = await AsyncStorage.getItem(REVIEWS_KEY)
  const reviews: LocalReview[] = raw ? JSON.parse(raw) : []
  // Normalize old reviews that predate burritoEntries/tortaEntries
  return reviews.map(r => ({
    ...r,
    burritoEntries: r.burritoEntries ?? [],
    tortaEntries: r.tortaEntries ?? [],
  }))
}
```

### Step 6: Commit

```bash
git add src/types/app.ts src/types/__tests__/app.test.ts src/services/localStorage.ts
git commit -m "feat: add LocalBurritoEntry and LocalTortaEntry types, normalize old reviews"
```

---

## Task 2: Update reviewFormStore

**Files:**
- Modify: `src/store/reviewFormStore.ts`
- Test: `src/store/__tests__/reviewFormStore.test.ts`

### Step 1: Write the failing tests

Create `src/store/__tests__/reviewFormStore.test.ts`:

```typescript
import { useReviewFormStore } from '../reviewFormStore'

// Reset store state before each test
beforeEach(() => {
  useReviewFormStore.getState().reset()
})

describe('orderedItems', () => {
  it('defaults to tacos only', () => {
    const { orderedItems } = useReviewFormStore.getState()
    expect(orderedItems).toEqual(['tacos'])
  })

  it('setOrderedItems updates the selection', () => {
    useReviewFormStore.getState().setOrderedItems(['tacos', 'burritos'])
    expect(useReviewFormStore.getState().orderedItems).toEqual(['tacos', 'burritos'])
  })
})

describe('burritoEntries', () => {
  it('starts empty', () => {
    expect(useReviewFormStore.getState().burritoEntries).toEqual([])
  })

  it('addBurritoEntry appends an entry', () => {
    useReviewFormStore.getState().addBurritoEntry({ itemType: 'pollo', rating: 4, notes: null })
    expect(useReviewFormStore.getState().burritoEntries).toHaveLength(1)
    expect(useReviewFormStore.getState().burritoEntries[0].itemType).toBe('pollo')
  })

  it('removeBurritoEntry removes by index', () => {
    useReviewFormStore.getState().addBurritoEntry({ itemType: 'pollo', rating: 4, notes: null })
    useReviewFormStore.getState().addBurritoEntry({ itemType: 'res', rating: 3, notes: null })
    useReviewFormStore.getState().removeBurritoEntry(0)
    expect(useReviewFormStore.getState().burritoEntries).toHaveLength(1)
    expect(useReviewFormStore.getState().burritoEntries[0].itemType).toBe('res')
  })
})

describe('tortaEntries', () => {
  it('starts empty', () => {
    expect(useReviewFormStore.getState().tortaEntries).toEqual([])
  })

  it('addTortaEntry appends an entry', () => {
    useReviewFormStore.getState().addTortaEntry({ itemType: 'milanesa', rating: 5, notes: 'great' })
    expect(useReviewFormStore.getState().tortaEntries).toHaveLength(1)
  })

  it('removeTortaEntry removes by index', () => {
    useReviewFormStore.getState().addTortaEntry({ itemType: 'milanesa', rating: 5, notes: null })
    useReviewFormStore.getState().removeTortaEntry(0)
    expect(useReviewFormStore.getState().tortaEntries).toHaveLength(0)
  })
})

describe('dynamic step navigation', () => {
  it('maxStep is 5 for tacos only (default)', () => {
    const { getMaxStep } = useReviewFormStore.getState()
    // steps: spot(1) + tacos(2) + salsas(3) + condiments(4) + verdict(5)
    expect(getMaxStep()).toBe(5)
  })

  it('maxStep is 6 for tacos + burritos', () => {
    useReviewFormStore.getState().setOrderedItems(['tacos', 'burritos'])
    expect(useReviewFormStore.getState().getMaxStep()).toBe(6)
  })

  it('maxStep is 7 for all three food types', () => {
    useReviewFormStore.getState().setOrderedItems(['tacos', 'burritos', 'tortas'])
    expect(useReviewFormStore.getState().getMaxStep()).toBe(7)
  })

  it('getStepName returns correct step name for index', () => {
    useReviewFormStore.getState().setOrderedItems(['tacos', 'burritos'])
    // steps: spot(1), tacos(2), burritos(3), salsas(4), condiments(5), verdict(6)
    expect(useReviewFormStore.getState().getStepName(1)).toBe('spot')
    expect(useReviewFormStore.getState().getStepName(2)).toBe('tacos')
    expect(useReviewFormStore.getState().getStepName(3)).toBe('burritos')
    expect(useReviewFormStore.getState().getStepName(4)).toBe('salsas')
  })

  it('nextStep does not exceed maxStep', () => {
    // default: 5 steps, start at 1
    const store = useReviewFormStore.getState()
    for (let i = 0; i < 10; i++) store.nextStep()
    expect(useReviewFormStore.getState().currentStep).toBe(5)
  })
})

describe('reset', () => {
  it('clears burritoEntries, tortaEntries, and orderedItems', () => {
    const store = useReviewFormStore.getState()
    store.setOrderedItems(['tacos', 'burritos', 'tortas'])
    store.addBurritoEntry({ itemType: 'pollo', rating: 4, notes: null })
    store.addTortaEntry({ itemType: 'milanesa', rating: 5, notes: null })
    store.reset()
    const s = useReviewFormStore.getState()
    expect(s.orderedItems).toEqual(['tacos'])
    expect(s.burritoEntries).toEqual([])
    expect(s.tortaEntries).toEqual([])
  })
})
```

### Step 2: Run to verify it fails

```bash
npx jest src/store/__tests__/reviewFormStore.test.ts --no-coverage
```

Expected: FAIL — `orderedItems`, `addBurritoEntry`, etc. do not exist

### Step 3: Rewrite `src/store/reviewFormStore.ts`

Replace the entire file with:

```typescript
import { create } from 'zustand'
import type {
  LocalTacoEntry,
  LocalSalsaEntry,
  LocalReview,
  LocalBurritoEntry,
  LocalTortaEntry,
  SpotType,
} from '../types/app'

export type FoodItem = 'tacos' | 'burritos' | 'tortas'
export type StepName = 'spot' | 'tacos' | 'burritos' | 'tortas' | 'salsas' | 'condiments' | 'verdict'

function buildStepList(orderedItems: FoodItem[]): StepName[] {
  return ['spot', ...orderedItems, 'salsas', 'condiments', 'verdict']
}

interface ReviewFormState {
  // Step 1: Vendor info
  vendorName: string
  spotType: SpotType | null
  lat: number | null
  lng: number | null
  address: string | null
  cityName: string | null
  // Food type selection
  orderedItems: FoodItem[]
  // Step: Tacos
  tacoEntries: LocalTacoEntry[]
  // Step: Burritos (Pro)
  burritoEntries: LocalBurritoEntry[]
  // Step: Tortas (Pro)
  tortaEntries: LocalTortaEntry[]
  // Step: Salsas
  salsaEntries: LocalSalsaEntry[]
  // Step: Condiments
  condiments: string[]
  // Step: Summary
  overallRating: number
  returnIntent: 'yes' | 'maybe' | 'no' | null
  notes: string
  photoUris: string[]
  // Edit mode
  editingReviewLocalId: string | null
  editingVendorLocalId: string | null
  // Navigation
  currentStep: number
  // Actions
  setField: <K extends keyof ReviewFormState>(key: K, value: ReviewFormState[K]) => void
  setOrderedItems: (items: FoodItem[]) => void
  addTacoEntry: (entry: LocalTacoEntry) => void
  removeTacoEntry: (index: number) => void
  addBurritoEntry: (entry: LocalBurritoEntry) => void
  removeBurritoEntry: (index: number) => void
  addTortaEntry: (entry: LocalTortaEntry) => void
  removeTortaEntry: (index: number) => void
  addSalsaEntry: (entry: LocalSalsaEntry) => void
  removeSalsaEntry: (index: number) => void
  toggleCondiment: (name: string) => void
  loadForEdit: (review: LocalReview, vendorName: string) => void
  addPhoto: (uri: string) => void
  removePhoto: (uri: string) => void
  nextStep: () => void
  prevStep: () => void
  getMaxStep: () => number
  getStepName: (step: number) => StepName
  reset: () => void
}

const initialState = {
  vendorName: '',
  spotType: null as SpotType | null,
  lat: null,
  lng: null,
  address: null,
  cityName: null,
  orderedItems: ['tacos'] as FoodItem[],
  tacoEntries: [] as LocalTacoEntry[],
  burritoEntries: [] as LocalBurritoEntry[],
  tortaEntries: [] as LocalTortaEntry[],
  salsaEntries: [] as LocalSalsaEntry[],
  condiments: [] as string[],
  overallRating: 0,
  returnIntent: null as null,
  notes: '',
  photoUris: [] as string[],
  editingReviewLocalId: null,
  editingVendorLocalId: null,
  currentStep: 1,
}

export const useReviewFormStore = create<ReviewFormState>((set, get) => ({
  ...initialState,

  setField: (key, value) => set({ [key]: value } as Partial<ReviewFormState>),

  setOrderedItems: (items) => set({ orderedItems: items }),

  addTacoEntry: (entry) => set(s => ({ tacoEntries: [...s.tacoEntries, entry] })),
  removeTacoEntry: (i) => set(s => ({ tacoEntries: s.tacoEntries.filter((_, idx) => idx !== i) })),

  addBurritoEntry: (entry) => set(s => ({ burritoEntries: [...s.burritoEntries, entry] })),
  removeBurritoEntry: (i) => set(s => ({ burritoEntries: s.burritoEntries.filter((_, idx) => idx !== i) })),

  addTortaEntry: (entry) => set(s => ({ tortaEntries: [...s.tortaEntries, entry] })),
  removeTortaEntry: (i) => set(s => ({ tortaEntries: s.tortaEntries.filter((_, idx) => idx !== i) })),

  addSalsaEntry: (entry) => set(s => ({ salsaEntries: [...s.salsaEntries, entry] })),
  removeSalsaEntry: (i) => set(s => ({ salsaEntries: s.salsaEntries.filter((_, idx) => idx !== i) })),

  toggleCondiment: (name) =>
    set(s => ({
      condiments: s.condiments.includes(name)
        ? s.condiments.filter(c => c !== name)
        : [...s.condiments, name],
    })),

  getMaxStep: () => buildStepList(get().orderedItems).length,

  getStepName: (step: number): StepName => {
    const steps = buildStepList(get().orderedItems)
    return steps[step - 1] ?? 'verdict'
  },

  nextStep: () =>
    set(s => ({
      currentStep: Math.min(s.currentStep + 1, buildStepList(s.orderedItems).length),
    })),

  prevStep: () => set(s => ({ currentStep: Math.max(1, s.currentStep - 1) })),

  loadForEdit: (review, vendorName) => {
    const orderedItems: FoodItem[] = ['tacos']
    if ((review.burritoEntries ?? []).length > 0) orderedItems.push('burritos')
    if ((review.tortaEntries ?? []).length > 0) orderedItems.push('tortas')
    set({
      editingReviewLocalId: review.localId,
      editingVendorLocalId: review.vendorLocalId,
      vendorName,
      orderedItems,
      tacoEntries: review.tacoEntries,
      burritoEntries: review.burritoEntries ?? [],
      tortaEntries: review.tortaEntries ?? [],
      salsaEntries: review.salsaEntries,
      condiments: review.condiments,
      overallRating: review.overallRating,
      returnIntent: review.returnIntent,
      notes: review.notes ?? '',
      photoUris: review.photoUris,
      currentStep: 1,
      lat: null,
      lng: null,
      address: null,
      cityName: null,
    })
  },

  addPhoto: (uri) => set(s => ({ photoUris: [...s.photoUris, uri] })),
  removePhoto: (uri) => set(s => ({ photoUris: s.photoUris.filter(u => u !== uri) })),

  reset: () => set(initialState),
}))
```

### Step 4: Run tests to verify they pass

```bash
npx jest src/store/__tests__/reviewFormStore.test.ts --no-coverage
```

Expected: PASS

### Step 5: Commit

```bash
git add src/store/reviewFormStore.ts src/store/__tests__/reviewFormStore.test.ts
git commit -m "feat: update reviewFormStore with orderedItems, burritoEntries, tortaEntries, dynamic steps"
```

---

## Task 3: Update Review Form UI

**Files:**
- Modify: `app/review/add.tsx`

This task has no automated tests — verify manually with `npx expo start`.

### Step 1: Add the "What did you order?" chip selector to Step 1

In `app/review/add.tsx`, add these imports at the top:

```typescript
import { useProStore } from '../../src/store/proStore'
import type { FoodItem } from '../../src/store/reviewFormStore'
```

Inside the `ReviewAddScreen` component, add:

```typescript
const { isPro } = useProStore()
```

Locate `{/* Step 1: Vendor Info */}` in the JSX. At the bottom of that step's View (before it closes), add the food selector:

```tsx
{/* What did you order? */}
<Text style={styles.sectionLabel}>What did you order?</Text>
<View style={styles.foodChipRow}>
  {(['tacos', 'burritos', 'tortas'] as FoodItem[]).map((food) => {
    const isLocked = food !== 'tacos' && !isPro
    const isSelected = store.orderedItems.includes(food)
    const label = food.charAt(0).toUpperCase() + food.slice(1)

    function handleToggle() {
      if (isLocked) return
      const current = store.orderedItems
      if (food === 'tacos') return // tacos always selected
      const next = isSelected
        ? current.filter(f => f !== food)
        : [...current, food]
      // Ensure tacos is always present
      if (!next.includes('tacos')) next.unshift('tacos')
      store.setOrderedItems(next)
    }

    return (
      <TouchableOpacity
        key={food}
        style={[
          styles.foodChip,
          isSelected && styles.foodChipSelected,
          isLocked && styles.foodChipLocked,
        ]}
        onPress={handleToggle}
        activeOpacity={isLocked ? 1 : 0.7}
      >
        <Text style={[styles.foodChipText, isSelected && styles.foodChipTextSelected]}>
          {label}
        </Text>
        {isLocked && (
          <Ionicons name="lock-closed" size={12} color={colors.creamMuted} style={{ marginLeft: 4 }} />
        )}
      </TouchableOpacity>
    )
  })}
</View>
```

Add styles:

```typescript
sectionLabel: {
  fontSize: 12,
  fontWeight: '700',
  color: colors.amber,
  letterSpacing: 1,
  textTransform: 'uppercase',
  marginTop: spacing.lg,
  marginBottom: spacing.sm,
},
foodChipRow: {
  flexDirection: 'row',
  gap: spacing.sm,
  flexWrap: 'wrap',
},
foodChip: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  borderRadius: radius.full,
  borderWidth: 1,
  borderColor: colors.surfaceBorder,
  backgroundColor: colors.surface,
},
foodChipSelected: {
  borderColor: colors.amber,
  backgroundColor: colors.amberSubtle,
},
foodChipLocked: {
  opacity: 0.5,
},
foodChipText: {
  fontSize: 14,
  fontWeight: '600',
  color: colors.creamMuted,
},
foodChipTextSelected: {
  color: colors.amber,
},
```

### Step 2: Make the step dots dynamic

Find the step dot row in the JSX:

```tsx
{/* Step indicator */}
<View style={styles.stepRow}>
```

Replace the hardcoded dots with dynamic ones based on `store.getMaxStep()`:

```tsx
<View style={styles.stepRow}>
  {Array.from({ length: store.getMaxStep() }, (_, i) => i + 1).map(n => (
    <View
      key={n}
      style={[styles.stepDot, store.currentStep >= n && styles.stepDotActive]}
    />
  ))}
</View>
```

### Step 3: Update step navigation bounds

Find `nextStep` button — currently it checks `store.currentStep < 5`. Replace with:

```tsx
{store.currentStep < store.getMaxStep() ? (
  <TouchableOpacity style={styles.nextBtn} onPress={store.nextStep}>
    ...
  </TouchableOpacity>
) : (
  // save button — no change needed here
)}
```

Find `prevStep` button — no change needed (already uses `store.currentStep > 1`).

### Step 4: Add Burritos step

Find `{/* Step 3: Salsas */}` in the JSX. Insert the Burritos step directly before it:

```tsx
{/* Step: Burritos (Pro) */}
{store.getStepName(store.currentStep) === 'burritos' && (
  <View style={styles.stepContent}>
    <Text style={styles.stepTitle}>The Burritos</Text>
    {store.burritoEntries.map((entry, i) => (
      <View key={i} style={styles.entryRow}>
        <Text style={styles.entryLabel}>{entry.itemType}</Text>
        <TacoRating
          value={entry.rating}
          onChange={(r) =>
            store.setField('burritoEntries',
              store.burritoEntries.map((e, idx) => idx === i ? { ...e, rating: r } : e)
            )
          }
          size={18}
        />
        <TouchableOpacity onPress={() => store.removeBurritoEntry(i)}>
          <Ionicons name="close-circle" size={20} color={colors.creamMuted} />
        </TouchableOpacity>
      </View>
    ))}
    <FoodEntryAdder
      placeholder="Burrito type (e.g. carne asada)"
      onAdd={(entry) => store.addBurritoEntry({ ...entry, notes: null })}
    />
  </View>
)}
```

### Step 5: Add Tortas step

Insert the Tortas step directly after the Burritos step:

```tsx
{/* Step: Tortas (Pro) */}
{store.getStepName(store.currentStep) === 'tortas' && (
  <View style={styles.stepContent}>
    <Text style={styles.stepTitle}>The Tortas</Text>
    {store.tortaEntries.map((entry, i) => (
      <View key={i} style={styles.entryRow}>
        <Text style={styles.entryLabel}>{entry.itemType}</Text>
        <TacoRating
          value={entry.rating}
          onChange={(r) =>
            store.setField('tortaEntries',
              store.tortaEntries.map((e, idx) => idx === i ? { ...e, rating: r } : e)
            )
          }
          size={18}
        />
        <TouchableOpacity onPress={() => store.removeTortaEntry(i)}>
          <Ionicons name="close-circle" size={20} color={colors.creamMuted} />
        </TouchableOpacity>
      </View>
    ))}
    <FoodEntryAdder
      placeholder="Torta type (e.g. milanesa)"
      onAdd={(entry) => store.addTortaEntry({ ...entry, notes: null })}
    />
  </View>
)}
```

### Step 6: Update existing step conditions

The existing steps use `store.currentStep === N` (hardcoded numbers). Replace ALL step conditionals to use `store.getStepName`:

| Old | New |
|---|---|
| `store.currentStep === 1` | `store.getStepName(store.currentStep) === 'spot'` |
| `store.currentStep === 2` | `store.getStepName(store.currentStep) === 'tacos'` |
| `store.currentStep === 3` | `store.getStepName(store.currentStep) === 'salsas'` |
| `store.currentStep === 4` | `store.getStepName(store.currentStep) === 'condiments'` |
| `store.currentStep === 5` | `store.getStepName(store.currentStep) === 'verdict'` |

### Step 7: Update the save call

Find where `localStorageService.addReview` or `updateReview` is called. Make sure `burritoEntries` and `tortaEntries` are included in the payload:

```typescript
// In the save handler, add to the review object:
burritoEntries: store.burritoEntries,
tortaEntries: store.tortaEntries,
```

### Step 8: Verify manually

```bash
npx expo start
```

Checklist:
- Free user: only "Tacos" chip visible on Step 1, form has 5 steps
- Pro user: all three chips visible, selecting Burritos adds a step, form adjusts
- Selecting all three: 7 steps total
- Deselecting Burritos mid-review: step disappears, step dots update
- Saving a review with burrito entries: entries persist and reload correctly in edit mode

### Step 9: Commit

```bash
git add app/review/add.tsx
git commit -m "feat: add burrito and torta steps to review form with dynamic step sequencing"
```

---

## Task 4: Display Burrito & Torta Entries in Spot Detail

**Files:**
- Modify: `app/spot/[localId].tsx`

### Step 1: Locate where taco entries are rendered

Search for `tacoEntries` in `app/spot/[localId].tsx`. Find the section that maps over taco entries and renders them per visit.

### Step 2: Add burrito and torta sections below taco entries

After the taco entries section for each visit, add:

```tsx
{/* Burritos */}
{(visit.burritoEntries ?? []).length > 0 && (
  <View style={styles.foodSection}>
    <Text style={styles.foodSectionLabel}>BURRITOS</Text>
    {visit.burritoEntries.map((entry, i) => (
      <View key={i} style={styles.foodEntryRow}>
        <Text style={styles.foodEntryType}>{entry.itemType}</Text>
        <TacoRating value={entry.rating} readonly size={13} />
      </View>
    ))}
  </View>
)}

{/* Tortas */}
{(visit.tortaEntries ?? []).length > 0 && (
  <View style={styles.foodSection}>
    <Text style={styles.foodSectionLabel}>TORTAS</Text>
    {visit.tortaEntries.map((entry, i) => (
      <View key={i} style={styles.foodEntryRow}>
        <Text style={styles.foodEntryType}>{entry.itemType}</Text>
        <TacoRating value={entry.rating} readonly size={13} />
      </View>
    ))}
  </View>
)}
```

Add styles (match existing taco entry styles):

```typescript
foodSection: { marginTop: spacing.sm },
foodSectionLabel: {
  fontSize: 10,
  fontWeight: '700',
  color: colors.amber,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  marginBottom: 4,
},
foodEntryRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingVertical: 3,
},
foodEntryType: {
  fontSize: 13,
  color: colors.cream,
  flex: 1,
},
```

### Step 3: Verify manually

Open a spot that has burrito or torta entries. Confirm they render correctly below the taco section. Old visits with no entries show nothing.

### Step 4: Commit

```bash
git add app/spot/[localId].tsx
git commit -m "feat: display burrito and torta entries in spot detail screen"
```

---

## Run All Tests

```bash
npx jest --no-coverage
```

Expected: all tests pass including new ones in `src/types/__tests__/app.test.ts` and `src/store/__tests__/reviewFormStore.test.ts`.
