# TacoAtlas — Burrito & Torta Reviews (Pro Feature) Design
Date: 2026-03-19

## Overview

Pro users can rate and review burritos and tortas within the same spot visit review as tacos. A "What did you order?" chip selector at Step 1 of the review form drives which food steps appear. Free users only see Tacos.

---

## Data Model Changes

### New types in `src/types/app.ts`

```typescript
export interface LocalBurritoEntry {
  itemType: string   // e.g. "carne asada", "pollo"
  rating: number     // 1–5
  notes: string | null
}

export interface LocalTortaEntry {
  itemType: string   // e.g. "milanesa", "carnitas"
  rating: number     // 1–5
  notes: string | null
}
```

Both share the same shape as `LocalTacoEntry`. This is intentional — consistent UX and simple extension path if more food types are added later.

### Updated `LocalReview` in `src/types/app.ts`

Add two new optional arrays:

```typescript
burritoEntries: LocalBurritoEntry[]   // default: []
tortaEntries: LocalTortaEntry[]       // default: []
```

No migration needed. Existing reviews read from AsyncStorage will simply lack these fields — callers default them to `[]` on read.

---

## Review Form Changes

### Step 1 addition: "What did you order?" selector

A chip/pill row added at the bottom of Step 1 (The Spot). Each chip is a toggle.

**Free users:** Only the "Tacos" chip is shown. It is pre-selected and cannot be deselected.

**Pro users:** All three chips are shown — Tacos, Burritos, Tortas. Any combination is valid. At least one must be selected to proceed.

### Dynamic step sequence

Steps are computed from `orderedItems` selection:

| Selection | Step sequence |
|---|---|
| Tacos only (free or pro) | Spot → Tacos → Salsas → Condiments → Verdict |
| Burritos only | Spot → Burritos → Salsas → Condiments → Verdict |
| Tortas only | Spot → Tortas → Salsas → Condiments → Verdict |
| Tacos + Burritos | Spot → Tacos → Burritos → Salsas → Condiments → Verdict |
| Tacos + Tortas | Spot → Tacos → Tortas → Salsas → Condiments → Verdict |
| All three | Spot → Tacos → Burritos → Tortas → Salsas → Condiments → Verdict |

The step dot indicator at the top updates to reflect the actual step count.

### Burrito and Torta steps

Visually identical to the existing Tacos step. Same `TacoRating` component for 1–5 rating. Same add-entry flow. Labels swapped:

- Tacos step: title "The Tacos", chip label "Taco type"
- Burritos step: title "The Burritos", chip label "Burrito type"
- Tortas step: title "The Tortas", chip label "Torta type"

---

## Store Changes (`src/store/reviewFormStore.ts`)

New state fields:

```typescript
orderedItems: ('tacos' | 'burritos' | 'tortas')[]  // default: ['tacos']
burritoEntries: LocalBurritoEntry[]
tortaEntries: LocalTortaEntry[]
```

New actions:

```typescript
setOrderedItems(items: ('tacos' | 'burritos' | 'tortas')[]) => void
addBurritoEntry(entry: LocalBurritoEntry) => void
updateBurritoEntry(index: number, entry: LocalBurritoEntry) => void
removeBurritoEntry(index: number) => void
addTortaEntry(entry: LocalTortaEntry) => void
updateTortaEntry(index: number, entry: LocalTortaEntry) => void
removeTortaEntry(index: number) => void
```

The `currentStep` logic is computed from `orderedItems`. The store tracks a `steps` array derived from selection, e.g. `['spot', 'tacos', 'burritos', 'salsas', 'condiments', 'verdict']`.

Reset clears all three entry arrays and resets `orderedItems` to `['tacos']`.

---

## Pro Gate

The Burritos and Tortas chips in Step 1 are only rendered when `useProStore().isPro` is true.

If a free user somehow reaches the save step with `orderedItems` containing `'burritos'` or `'tortas'` (defensive check), those entries are stripped before saving.

---

## Spot Detail Display

The spot detail screen (`app/spot/[localId].tsx`) shows burrito and torta entries per visit, the same way taco entries are shown — a labeled section per food type, only rendered if the array is non-empty.

---

## Out of Scope

- Separate salsa/condiment tracking per food type (tacos, burritos, tortas share the same salsa/condiment steps)
- Custom heat level or ingredient fields on burritos/tortas
- Burrito/torta-specific filters in the atlas list
