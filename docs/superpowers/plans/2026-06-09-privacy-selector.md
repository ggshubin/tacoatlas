# Privacy Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One shared `PrivacySelector` component (segmented row + live caption, Pro-locked options for free users) used in the review wizard, drop-pin flow, and spot detail screen, plus a one-time post-conversion reminder that lets new Pro users publish their previously private spots.

**Architecture:** A presentational `PrivacySelector` component replaces the duplicated privacy rows. Privacy lives on `LocalVendor.privacy`; Supabase review rows get their `privacy` from the vendor at sync time inside `syncService.liveSync`. Two new `syncService` functions (`updateVendorPrivacy`, `bulkPublishPrivateSpots`) handle persistence + re-sync. The conversion reminder is a pure trigger function + AsyncStorage flag, wired into the existing `isPro` watcher in `app/_layout.tsx`, showing a new modal.

**Tech Stack:** Expo SDK 55 / React Native, Zustand, AsyncStorage, Jest + @testing-library/react-native (vector-icons and expo-updates mocks already registered in jest config).

**Spec:** `docs/superpowers/specs/2026-06-09-privacy-selector-design.md`

**Conventions:** Commit after every green test cycle. Run tests with `npm test -- --no-coverage <path>`. Several old suites have pre-existing failures (localStorage, VendorCard, vendorRepository, syncService, photoService) — never "fix" those as part of this work; only the suites you create must pass.

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `src/components/PrivacySelector.tsx` | Create | Segmented privacy control + caption + Pro lock/nudge |
| `src/components/__tests__/PrivacySelector.test.tsx` | Create | Component tests |
| `src/services/syncService.ts` | Modify | Add `updateVendorPrivacy`, `bulkPublishPrivateSpots` |
| `src/services/__tests__/privacySync.test.ts` | Create | Tests for the two new functions |
| `src/utils/proPrivacyReminder.ts` | Create | Trigger predicate + AsyncStorage flag helpers |
| `src/utils/__tests__/proPrivacyReminder.test.ts` | Create | Trigger predicate tests |
| `src/components/ProPrivacyReminderModal.tsx` | Create | Post-conversion modal (3 actions) |
| `src/components/__tests__/ProPrivacyReminderModal.test.tsx` | Create | Modal tests |
| `app/review/add.tsx` | Modify | Swap in PrivacySelector; delete dup options/styles |
| `app/pin/add.tsx` | Modify | Swap in PrivacySelector; add save-time privacy guard |
| `app/spot/[localId].tsx` | Modify | Add per-spot PrivacySelector |
| `app/_layout.tsx` | Modify | Conversion watcher + reminder modal |

---

### Task 1: PrivacySelector component

**Files:**
- Create: `src/components/PrivacySelector.tsx`
- Test: `src/components/__tests__/PrivacySelector.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/__tests__/PrivacySelector.test.tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { PrivacySelector } from '../PrivacySelector'

const noop = () => {}

describe('PrivacySelector — Pro', () => {
  it('renders all three options unlocked and fires onChange per option', () => {
    const onChange = jest.fn()
    const { getByTestId, queryByTestId } = render(
      <PrivacySelector value="private" onChange={onChange} isPro isSignedIn onUpgradePress={noop} />
    )
    expect(queryByTestId('privacy-pro-badge-public')).toBeNull()
    expect(queryByTestId('privacy-pro-badge-friends')).toBeNull()
    fireEvent.press(getByTestId('privacy-opt-public'))
    expect(onChange).toHaveBeenCalledWith('public')
    fireEvent.press(getByTestId('privacy-opt-friends'))
    expect(onChange).toHaveBeenCalledWith('friends')
    fireEvent.press(getByTestId('privacy-opt-private'))
    expect(onChange).toHaveBeenCalledWith('private')
  })

  it('caption matches the selected value', () => {
    const { getByTestId, rerender } = render(
      <PrivacySelector value="public" onChange={noop} isPro isSignedIn onUpgradePress={noop} />
    )
    expect(getByTestId('privacy-caption').props.children)
      .toBe('Anyone on TacoAtlas can see this spot and your review.')
    rerender(<PrivacySelector value="friends" onChange={noop} isPro isSignedIn onUpgradePress={noop} />)
    expect(getByTestId('privacy-caption').props.children)
      .toBe('Only your friends can see this.')
    rerender(<PrivacySelector value="private" onChange={noop} isPro isSignedIn onUpgradePress={noop} />)
    expect(getByTestId('privacy-caption').props.children)
      .toBe('Saved to your personal log — only you can see it.')
  })
})

describe('PrivacySelector — free', () => {
  it('locks Public and Mi Gente with PRO badges and fires no onChange on locked taps', () => {
    const onChange = jest.fn()
    const { getByTestId } = render(
      <PrivacySelector value="private" onChange={onChange} isPro={false} isSignedIn onUpgradePress={noop} />
    )
    expect(getByTestId('privacy-pro-badge-public')).toBeTruthy()
    expect(getByTestId('privacy-pro-badge-friends')).toBeTruthy()
    fireEvent.press(getByTestId('privacy-opt-public'))
    fireEvent.press(getByTestId('privacy-opt-friends'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows the upgrade nudge after a locked tap, with Upgrade when signed in', () => {
    const onUpgradePress = jest.fn()
    const { getByTestId, queryByTestId } = render(
      <PrivacySelector value="private" onChange={noop} isPro={false} isSignedIn onUpgradePress={onUpgradePress} />
    )
    expect(queryByTestId('privacy-nudge')).toBeNull()
    fireEvent.press(getByTestId('privacy-opt-public'))
    expect(getByTestId('privacy-nudge')).toBeTruthy()
    expect(getByTestId('privacy-upgrade-btn-text').props.children).toBe('Upgrade')
    fireEvent.press(getByTestId('privacy-upgrade-btn'))
    expect(onUpgradePress).toHaveBeenCalled()
  })

  it('shows Sign Up label on the nudge when signed out', () => {
    const { getByTestId } = render(
      <PrivacySelector value="private" onChange={noop} isPro={false} isSignedIn={false} onUpgradePress={noop} />
    )
    fireEvent.press(getByTestId('privacy-opt-friends'))
    expect(getByTestId('privacy-upgrade-btn-text').props.children).toBe('Sign Up')
  })

  it('nudge reverts to caption when Just Me is tapped', () => {
    const { getByTestId, queryByTestId } = render(
      <PrivacySelector value="private" onChange={noop} isPro={false} isSignedIn onUpgradePress={noop} />
    )
    fireEvent.press(getByTestId('privacy-opt-public'))
    expect(getByTestId('privacy-nudge')).toBeTruthy()
    fireEvent.press(getByTestId('privacy-opt-private'))
    expect(queryByTestId('privacy-nudge')).toBeNull()
    expect(getByTestId('privacy-caption')).toBeTruthy()
  })

  it('normalizes a non-private value to private on mount', () => {
    const onChange = jest.fn()
    render(
      <PrivacySelector value="public" onChange={onChange} isPro={false} isSignedIn onUpgradePress={noop} />
    )
    expect(onChange).toHaveBeenCalledWith('private')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --no-coverage src/components/__tests__/PrivacySelector.test.tsx`
Expected: FAIL — `Cannot find module '../PrivacySelector'`

- [ ] **Step 3: Implement the component**

```tsx
// src/components/PrivacySelector.tsx
import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'
import type { PrivacySetting } from '../types/app'

const OPTIONS: { value: PrivacySetting; label: string; icon: string }[] = [
  { value: 'public', label: 'Public', icon: 'earth-outline' },
  { value: 'friends', label: 'Mi Gente', icon: 'people-outline' },
  { value: 'private', label: 'Just Me', icon: 'lock-closed-outline' },
]

const CAPTIONS: Record<PrivacySetting, string> = {
  public: 'Anyone on TacoAtlas can see this spot and your review.',
  friends: 'Only your friends can see this.',
  private: 'Saved to your personal log — only you can see it.',
}

interface PrivacySelectorProps {
  value: PrivacySetting
  onChange: (value: PrivacySetting) => void
  isPro: boolean
  isSignedIn: boolean
  onUpgradePress: () => void
}

export function PrivacySelector({ value, onChange, isPro, isSignedIn, onUpgradePress }: PrivacySelectorProps) {
  const [showNudge, setShowNudge] = useState(false)

  // Free accounts only save privately — normalize any stale value (e.g. a
  // vendor created before gating, or a form store defaulting to 'public').
  useEffect(() => {
    if (!isPro && value !== 'private') onChange('private')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, value])

  function handlePress(opt: PrivacySetting) {
    if (!isPro && opt !== 'private') {
      setShowNudge(true)
      return
    }
    setShowNudge(false)
    onChange(opt)
  }

  return (
    <View>
      <View style={styles.row}>
        {OPTIONS.map(opt => {
          const locked = !isPro && opt.value !== 'private'
          const active = value === opt.value
          return (
            <TouchableOpacity
              key={opt.value}
              testID={`privacy-opt-${opt.value}`}
              style={[styles.btn, active && styles.btnActive, locked && styles.btnLocked]}
              onPress={() => handlePress(opt.value)}
            >
              {locked && (
                <View style={styles.proBadge} testID={`privacy-pro-badge-${opt.value}`}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
              <Ionicons
                name={opt.icon as any}
                size={18}
                color={active ? colors.amber : locked ? colors.creamDim : colors.creamMuted}
                style={styles.icon}
              />
              <Text style={[styles.label, active && styles.labelActive, locked && styles.labelLocked]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
      {showNudge && !isPro ? (
        <View style={styles.nudgeRow} testID="privacy-nudge">
          <Text style={styles.caption}>Sharing your atlas is a Pro feature.</Text>
          <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgradePress} testID="privacy-upgrade-btn">
            <Text style={styles.upgradeBtnText} testID="privacy-upgrade-btn-text">
              {isSignedIn ? 'Upgrade' : 'Sign Up'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.caption} testID="privacy-caption">{CAPTIONS[value]}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  btn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  btnActive: { borderColor: colors.amber, backgroundColor: colors.amberSubtle },
  btnLocked: { borderColor: colors.border },
  proBadge: {
    position: 'absolute', top: -7, right: -4, backgroundColor: colors.amber,
    paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6,
  },
  proBadgeText: { color: colors.charcoal, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  icon: { marginBottom: 2 },
  label: { fontSize: 11, color: colors.creamMuted, fontWeight: '600' },
  labelActive: { color: colors.amber },
  labelLocked: { color: colors.creamDim },
  caption: { fontSize: 12, color: colors.creamMuted, marginTop: spacing.xs, flex: 1 },
  nudgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  upgradeBtn: {
    backgroundColor: colors.amber, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.sm,
  },
  upgradeBtnText: { color: colors.charcoal, fontSize: 11, fontWeight: '800' },
})
```

**Theme check:** before running, confirm the token names used above exist in `src/utils/theme.ts` (`colors.border`, `colors.charcoal`, `colors.creamDim`, `colors.creamMuted`, `colors.amber`, `colors.amberSubtle`, `spacing.xs`, `spacing.sm`, `radius.sm`, `radius.md`). If a name differs (e.g. no `charcoal`), substitute the closest existing token — look at how `app/review/add.tsx` styles `privacyBtn` (border color) and `UpgradeNudge.tsx` (button text color on amber) and reuse those exact tokens. Do not add new tokens to the theme.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --no-coverage src/components/__tests__/PrivacySelector.test.tsx`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/PrivacySelector.tsx src/components/__tests__/PrivacySelector.test.tsx
git commit -m "feat: add shared PrivacySelector component with Pro gating"
```

---

### Task 2: Wire into the review wizard

**Files:**
- Modify: `app/review/add.tsx` (PRIVACY_OPTIONS at ~line 25; privacy UI at ~lines 471–496; styles at ~lines 837–859)

- [ ] **Step 1: Replace the privacy UI**

In `app/review/add.tsx`:

1. Delete the `PRIVACY_OPTIONS` constant (the 5-line block starting `const PRIVACY_OPTIONS`).
2. Add imports:

```tsx
import { PrivacySelector } from '../../src/components/PrivacySelector'
import { ProPaywallModal } from '../../src/components/ProPaywallModal'
```

3. Add paywall state next to the other `useState` calls in the component:

```tsx
const [showPaywall, setShowPaywall] = useState(false)
```

4. Replace the entire block from `{isPro ? (` through the closing `)}` after the `privacyLockedRow` view (the conditional right under `<Text style={styles.fieldLabel}>Who can see this?</Text>`) with:

```tsx
<PrivacySelector
  value={store.privacy}
  onChange={v => store.setField('privacy', v)}
  isPro={isPro}
  isSignedIn={!!session}
  onUpgradePress={() => session ? setShowPaywall(true) : router.push('/(auth)/sign-up')}
/>
```

5. Render the paywall modal next to the screen's other modals (just before the component's closing tag):

```tsx
<ProPaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
```

6. Delete these now-unused styles: `privacyRow`, `privacyLockedRow`, `privacyLockedText`, `privacySignUpBtn`, `privacySignUpText`, `privacyBtn`, `privacyBtnActive`, `privacyIcon`, `privacyLabel`, `privacyLabelActive`.
7. **Keep** the save-time guard `const effectivePrivacy = isPro ? store.privacy : 'private'` exactly as is.

- [ ] **Step 2: Verify compile + existing tests**

Run: `npx tsc --noEmit`
Expected: exit 0 (no new errors)
Run: `npm test -- --no-coverage src/components/__tests__/PrivacySelector.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/review/add.tsx
git commit -m "refactor: review wizard uses shared PrivacySelector"
```

---

### Task 3: Wire into the drop-pin flow + close the privacy leak

**Files:**
- Modify: `app/pin/add.tsx` (PRIVACY_OPTIONS at lines 21–25; privacy UI at lines 132–146; `handleSave` at line 40; styles `privacyRow/privacyBtn/privacyBtnActive/privacyIcon/privacyLabel/privacyLabelActive` at ~lines 211–220)

- [ ] **Step 1: Replace the privacy UI and add the save guard**

1. Delete the `PRIVACY_OPTIONS` constant.
2. Add imports (same two as Task 2, adjusting nothing else):

```tsx
import { PrivacySelector } from '../../src/components/PrivacySelector'
import { ProPaywallModal } from '../../src/components/ProPaywallModal'
```

3. Add state inside `DropPinScreen`:

```tsx
const [showPaywall, setShowPaywall] = useState(false)
```

4. Replace the `<View style={styles.privacyRow}>…</View>` block (under `<Text style={styles.fieldLabel}>Who can see this?</Text>`) with:

```tsx
<PrivacySelector
  value={privacy}
  onChange={setPrivacy}
  isPro={isPro}
  isSignedIn={!!session}
  onUpgradePress={() => session ? setShowPaywall(true) : router.push('/(auth)/sign-up')}
/>
```

5. In `handleSave`, change the `addVendor` call's privacy field — this is the leak fix; free users could previously save `public` pins:

```tsx
privacy: isPro ? privacy : 'private',
```

6. Render `<ProPaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />` just before the closing `</KeyboardAvoidingView>`.
7. Delete the unused styles: `privacyRow`, `privacyBtn`, `privacyBtnActive`, `privacyIcon`, `privacyLabel`, `privacyLabelActive`.
8. Note: `privacy` state still defaults to `'public'`; the selector normalizes it to `'private'` for free users on mount (Task 1 behavior), and the save guard backstops it.

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add app/pin/add.tsx
git commit -m "fix: drop-pin flow uses PrivacySelector and enforces private saves for free users"
```

---

### Task 4: syncService privacy functions

**Files:**
- Modify: `src/services/syncService.ts`
- Test: `src/services/__tests__/privacySync.test.ts` (new file — do NOT touch the pre-existing `syncService.test.ts`)

- [ ] **Step 1: Write the failing tests**

```ts
// src/services/__tests__/privacySync.test.ts
import { syncService } from '../syncService'
import { localStorageService } from '../localStorage'

jest.mock('../localStorage', () => ({
  localStorageService: {
    updateVendor: jest.fn().mockResolvedValue(undefined),
    getVendors: jest.fn(),
    getReviewsForVendor: jest.fn(),
  },
}))
jest.mock('../supabase', () => ({ supabase: {} }))
jest.mock('../vendorRepository', () => ({ vendorRepository: {} }))
jest.mock('../reviewRepository', () => ({ reviewRepository: {} }))

const mockStorage = localStorageService as jest.Mocked<typeof localStorageService>

describe('updateVendorPrivacy', () => {
  beforeEach(() => jest.clearAllMocks())

  it('updates the local vendor and live-syncs each review when signed in', async () => {
    const liveSyncSpy = jest.spyOn(syncService, 'liveSync').mockResolvedValue(undefined)
    mockStorage.getReviewsForVendor.mockResolvedValue([
      { localId: 'r1' } as any,
      { localId: 'r2' } as any,
    ])
    await syncService.updateVendorPrivacy('v1', 'public', 'user-1')
    expect(mockStorage.updateVendor).toHaveBeenCalledWith('v1', { privacy: 'public' })
    expect(liveSyncSpy).toHaveBeenCalledTimes(2)
    expect(liveSyncSpy).toHaveBeenCalledWith('v1', { localId: 'r1' }, 'user-1')
    liveSyncSpy.mockRestore()
  })

  it('updates locally but skips sync when no userId', async () => {
    const liveSyncSpy = jest.spyOn(syncService, 'liveSync').mockResolvedValue(undefined)
    await syncService.updateVendorPrivacy('v1', 'friends')
    expect(mockStorage.updateVendor).toHaveBeenCalledWith('v1', { privacy: 'friends' })
    expect(liveSyncSpy).not.toHaveBeenCalled()
    liveSyncSpy.mockRestore()
  })
})

describe('bulkPublishPrivateSpots', () => {
  beforeEach(() => jest.clearAllMocks())

  it('publishes only explicitly private vendors and returns the count', async () => {
    const updateSpy = jest.spyOn(syncService, 'updateVendorPrivacy').mockResolvedValue(undefined)
    mockStorage.getVendors.mockResolvedValue([
      { localId: 'v1', privacy: 'private' } as any,
      { localId: 'v2', privacy: 'public' } as any,
      { localId: 'v3', privacy: 'friends' } as any,
      { localId: 'v4' } as any, // undefined privacy = public by convention — untouched
      { localId: 'v5', privacy: 'private' } as any,
    ])
    const count = await syncService.bulkPublishPrivateSpots('user-1')
    expect(count).toBe(2)
    expect(updateSpy).toHaveBeenCalledTimes(2)
    expect(updateSpy).toHaveBeenCalledWith('v1', 'public', 'user-1')
    expect(updateSpy).toHaveBeenCalledWith('v5', 'public', 'user-1')
    updateSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --no-coverage src/services/__tests__/privacySync.test.ts`
Expected: FAIL — `updateVendorPrivacy is not a function`

- [ ] **Step 3: Implement the two functions**

In `src/services/syncService.ts`, add to the imports:

```ts
import type { PrivacySetting } from '../types/app'
```

(Check the existing import block first — `LocalVendor`/`LocalReview` types are likely already imported from `../types/app`; extend that line instead of duplicating.)

Add these two methods to the `syncService` object, after `syncVendorOnly`:

```ts
/**
 * Change a spot's privacy locally and propagate it to Supabase.
 * Review rows in Supabase carry the privacy value (liveSync reads it
 * from the vendor), so each review is re-synced after the update.
 * Fire-and-forget safe — never throws.
 */
async updateVendorPrivacy(vendorLocalId: string, privacy: PrivacySetting, userId?: string): Promise<void> {
  await localStorageService.updateVendor(vendorLocalId, { privacy })
  if (!userId) return
  try {
    const reviews = await localStorageService.getReviewsForVendor(vendorLocalId)
    for (const review of reviews) {
      await syncService.liveSync(vendorLocalId, review, userId)
    }
  } catch (e) {
    console.warn('[syncService] updateVendorPrivacy sync failed:', e)
  }
},

/**
 * Post-conversion bulk action: make every explicitly private spot public.
 * Vendors with undefined privacy default to 'public' and are untouched.
 * Returns the number of spots published.
 */
async bulkPublishPrivateSpots(userId?: string): Promise<number> {
  const vendors = await localStorageService.getVendors()
  const privateVendors = vendors.filter(v => v.privacy === 'private')
  for (const vendor of privateVendors) {
    await syncService.updateVendorPrivacy(vendor.localId, 'public', userId)
  }
  return privateVendors.length
},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --no-coverage src/services/__tests__/privacySync.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/syncService.ts src/services/__tests__/privacySync.test.ts
git commit -m "feat: add vendor privacy update and bulk-publish sync functions"
```

---

### Task 5: Conversion reminder trigger + flag helpers

**Files:**
- Create: `src/utils/proPrivacyReminder.ts`
- Test: `src/utils/__tests__/proPrivacyReminder.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/utils/__tests__/proPrivacyReminder.test.ts
import { shouldShowProPrivacyReminder } from '../proPrivacyReminder'

describe('shouldShowProPrivacyReminder', () => {
  const base = { wasPro: false, isPro: true, privateSpotCount: 3, alreadyShown: false }

  it('fires on a false→true Pro transition with private spots and unset flag', () => {
    expect(shouldShowProPrivacyReminder(base)).toBe(true)
  })

  it('never fires if already shown', () => {
    expect(shouldShowProPrivacyReminder({ ...base, alreadyShown: true })).toBe(false)
  })

  it('never fires without the transition (was already Pro)', () => {
    expect(shouldShowProPrivacyReminder({ ...base, wasPro: true })).toBe(false)
  })

  it('never fires when not Pro', () => {
    expect(shouldShowProPrivacyReminder({ ...base, isPro: false })).toBe(false)
  })

  it('never fires with zero private spots', () => {
    expect(shouldShowProPrivacyReminder({ ...base, privateSpotCount: 0 })).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --no-coverage src/utils/__tests__/proPrivacyReminder.test.ts`
Expected: FAIL — `Cannot find module '../proPrivacyReminder'`

- [ ] **Step 3: Implement**

```ts
// src/utils/proPrivacyReminder.ts
import AsyncStorage from '@react-native-async-storage/async-storage'

export const PRO_PRIVACY_REMINDER_KEY = 'proPrivacyReminderShown'

interface ReminderParams {
  wasPro: boolean
  isPro: boolean
  privateSpotCount: number
  alreadyShown: boolean
}

/** One-time reminder: fires only on the false→true Pro transition,
 *  when the user has private spots and hasn't seen it before. */
export function shouldShowProPrivacyReminder(params: ReminderParams): boolean {
  const { wasPro, isPro, privateSpotCount, alreadyShown } = params
  return !wasPro && isPro && privateSpotCount > 0 && !alreadyShown
}

export async function getReminderShown(): Promise<boolean> {
  return (await AsyncStorage.getItem(PRO_PRIVACY_REMINDER_KEY)) === 'true'
}

export async function setReminderShown(): Promise<void> {
  await AsyncStorage.setItem(PRO_PRIVACY_REMINDER_KEY, 'true')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --no-coverage src/utils/__tests__/proPrivacyReminder.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/proPrivacyReminder.ts src/utils/__tests__/proPrivacyReminder.test.ts
git commit -m "feat: add pro privacy reminder trigger logic"
```

---

### Task 6: ProPrivacyReminderModal component

**Files:**
- Create: `src/components/ProPrivacyReminderModal.tsx`
- Test: `src/components/__tests__/ProPrivacyReminderModal.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/__tests__/ProPrivacyReminderModal.test.tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { ProPrivacyReminderModal } from '../ProPrivacyReminderModal'

const props = {
  visible: true,
  spotCount: 4,
  onMakeAllPublic: jest.fn(),
  onChoosePerSpot: jest.fn(),
  onKeepPrivate: jest.fn(),
}

describe('ProPrivacyReminderModal', () => {
  beforeEach(() => jest.clearAllMocks())

  it('shows the spot count in the message', () => {
    const { getByTestId } = render(<ProPrivacyReminderModal {...props} />)
    const text = getByTestId('reminder-message').props.children.join('')
    expect(text).toContain('4')
  })

  it('does not render when not visible', () => {
    const { queryByTestId } = render(<ProPrivacyReminderModal {...props} visible={false} />)
    expect(queryByTestId('reminder-message')).toBeNull()
  })

  it('fires the right callback per button', () => {
    const { getByTestId } = render(<ProPrivacyReminderModal {...props} />)
    fireEvent.press(getByTestId('reminder-make-public'))
    expect(props.onMakeAllPublic).toHaveBeenCalled()
    fireEvent.press(getByTestId('reminder-per-spot'))
    expect(props.onChoosePerSpot).toHaveBeenCalled()
    fireEvent.press(getByTestId('reminder-keep-private'))
    expect(props.onKeepPrivate).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- --no-coverage src/components/__tests__/ProPrivacyReminderModal.test.tsx`
Expected: FAIL — `Cannot find module '../ProPrivacyReminderModal'`

- [ ] **Step 3: Implement**

```tsx
// src/components/ProPrivacyReminderModal.tsx
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors, spacing, radius } from '../utils/theme'

interface Props {
  visible: boolean
  spotCount: number
  onMakeAllPublic: () => void
  onChoosePerSpot: () => void
  onKeepPrivate: () => void
}

export function ProPrivacyReminderModal({ visible, spotCount, onMakeAllPublic, onChoosePerSpot, onKeepPrivate }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onKeepPrivate}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Ionicons name="sparkles" size={28} color={colors.amber} style={styles.sparkle} />
          <Text style={styles.title}>You're Pro!</Text>
          <Text style={styles.message} testID="reminder-message">
            You have {spotCount} spot{spotCount !== 1 ? 's' : ''} saved just for you. Want to share {spotCount !== 1 ? 'them' : 'it'}?
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onMakeAllPublic} testID="reminder-make-public">
            <Text style={styles.primaryBtnText}>Make All Public</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onChoosePerSpot} testID="reminder-per-spot">
            <Text style={styles.secondaryBtnText}>I'll Choose Per Spot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tertiaryBtn} onPress={onKeepPrivate} testID="reminder-keep-private">
            <Text style={styles.tertiaryBtnText}>Keep Private</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' },
  sparkle: { marginBottom: spacing.sm },
  title: { color: colors.cream, fontSize: 20, fontWeight: '800', marginBottom: spacing.xs },
  message: { color: colors.creamMuted, fontSize: 14, textAlign: 'center', marginBottom: spacing.lg },
  primaryBtn: {
    backgroundColor: colors.amber, borderRadius: radius.md, paddingVertical: 12,
    alignItems: 'center', alignSelf: 'stretch', marginBottom: spacing.sm,
  },
  primaryBtnText: { color: colors.charcoal, fontWeight: '800', fontSize: 14 },
  secondaryBtn: {
    borderWidth: 1, borderColor: colors.amber, borderRadius: radius.md, paddingVertical: 12,
    alignItems: 'center', alignSelf: 'stretch', marginBottom: spacing.sm,
  },
  secondaryBtnText: { color: colors.amber, fontWeight: '700', fontSize: 14 },
  tertiaryBtn: { paddingVertical: 10, alignItems: 'center', alignSelf: 'stretch' },
  tertiaryBtnText: { color: colors.creamMuted, fontWeight: '600', fontSize: 13 },
})
```

**Theme check:** same as Task 1 — verify `colors.surface`, `colors.charcoal`, `radius.lg`, `spacing.lg` exist in `src/utils/theme.ts`; if not, copy the overlay/card token choices from `src/components/ConfirmModal.tsx` (an existing modal in the same visual style) instead.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- --no-coverage src/components/__tests__/ProPrivacyReminderModal.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/ProPrivacyReminderModal.tsx src/components/__tests__/ProPrivacyReminderModal.test.tsx
git commit -m "feat: add post-conversion privacy reminder modal"
```

---

### Task 7: Wire the conversion watcher into the root layout

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Add the watcher and modal**

1. Extend the react import and react-native import at the top:

```tsx
import { useEffect, useRef, useState } from 'react'
import { Platform, Linking, Alert } from 'react-native'
```

2. Add imports:

```tsx
import { ProPrivacyReminderModal } from '../src/components/ProPrivacyReminderModal'
import { shouldShowProPrivacyReminder, getReminderShown, setReminderShown } from '../src/utils/proPrivacyReminder'
```

3. Inside `RootLayout`, next to the existing state hooks:

```tsx
const [privacyReminderCount, setPrivacyReminderCount] = useState<number | null>(null)
const prevIsPro = useRef(false)
```

4. Add this effect after the existing `useEffect` blocks (it watches the same `isPro` the layout already tracks):

```tsx
// One-time post-conversion reminder: when isPro flips false→true and the
// user has private spots, offer to publish them. Spec: default stays
// private; the flag ensures this shows exactly once per device.
useEffect(() => {
  async function maybeShowReminder() {
    const wasPro = prevIsPro.current
    prevIsPro.current = isPro
    if (!isPro || wasPro) return
    const [vendors, alreadyShown] = await Promise.all([
      localStorageService.getVendors(),
      getReminderShown(),
    ])
    const privateSpotCount = vendors.filter(v => v.privacy === 'private').length
    if (shouldShowProPrivacyReminder({ wasPro, isPro, privateSpotCount, alreadyShown })) {
      await setReminderShown()
      setPrivacyReminderCount(privateSpotCount)
    }
  }
  maybeShowReminder()
}, [isPro])
```

5. In the returned JSX, render the modal alongside the existing global modals (`RestorePromptModal` / `BetaFeedbackModal` — match their placement):

```tsx
<ProPrivacyReminderModal
  visible={privacyReminderCount !== null}
  spotCount={privacyReminderCount ?? 0}
  onMakeAllPublic={() => {
    const count = privacyReminderCount ?? 0
    Alert.alert(
      'Make all spots public?',
      `This makes ${count} spot${count !== 1 ? 's' : ''} visible to everyone on TacoAtlas.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Make Public',
          onPress: async () => {
            setPrivacyReminderCount(null)
            await syncService.bulkPublishPrivateSpots(session?.user.id)
          },
        },
      ]
    )
  }}
  onChoosePerSpot={() => {
    setPrivacyReminderCount(null)
    router.push('/(tabs)/atlas')
  }}
  onKeepPrivate={() => setPrivacyReminderCount(null)}
/>
```

- [ ] **Step 2: Verify compile + targeted tests**

Run: `npx tsc --noEmit`
Expected: exit 0
Run: `npm test -- --no-coverage src/utils/__tests__/proPrivacyReminder.test.ts src/components/__tests__/ProPrivacyReminderModal.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: show one-time privacy reminder when a user converts to Pro"
```

---

### Task 8: Per-spot privacy on the spot detail screen

**Files:**
- Modify: `app/spot/[localId].tsx`

- [ ] **Step 1: Add the selector**

1. Add imports:

```tsx
import { PrivacySelector } from '../../src/components/PrivacySelector'
import { ProPaywallModal } from '../../src/components/ProPaywallModal'
import { syncService } from '../../src/services/syncService'
import { useProStore } from '../../src/store/proStore'
import { useAuthStore } from '../../src/store/authStore'
```

(Check the existing import block first — some of these may already be present; add only what's missing.)

2. Inside `SpotDetailScreen`, next to the existing hooks:

```tsx
const isPro = useProStore(s => s.isPro)
const session = useAuthStore(s => s.session)
const [showPaywall, setShowPaywall] = useState(false)
```

3. In the ScrollView, directly **after** the "Stats row" `</View>` (the block with `styles.statsRow`), insert:

```tsx
{/* Privacy */}
<Text style={styles.privacyHeading}>Who can see this?</Text>
<PrivacySelector
  value={vendor.privacy ?? 'public'}
  onChange={v => {
    setVendor(prev => (prev ? { ...prev, privacy: v } : prev))
    syncService.updateVendorPrivacy(vendor.localId, v, session?.user.id)
  }}
  isPro={isPro}
  isSignedIn={!!session}
  onUpgradePress={() => session ? setShowPaywall(true) : router.push('/(auth)/sign-up')}
/>
```

Note: for a free user whose vendor was saved as public before the gating fix, the selector's normalization fires `onChange('private')` on mount — which persists the correction. That is intended enforcement of the free-tier model, not a bug.

4. Add the heading style to the StyleSheet (match the visual weight of the screen's existing section labels — check how `addSpotNoteText`/`statLabel` are styled and stay consistent):

```tsx
privacyHeading: { color: colors.cream, fontSize: 13, fontWeight: '700', marginTop: spacing.md, marginBottom: spacing.sm },
```

5. Render `<ProPaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />` next to the screen's other modals (after the lightbox `Modal`).

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add "app/spot/[localId].tsx"
git commit -m "feat: per-spot privacy control on spot detail screen"
```

---

### Task 9: Full verification

- [ ] **Step 1: Run the new suites together**

Run: `npm test -- --no-coverage src/components/__tests__/PrivacySelector.test.tsx src/components/__tests__/ProPrivacyReminderModal.test.tsx src/services/__tests__/privacySync.test.ts src/utils/__tests__/proPrivacyReminder.test.ts`
Expected: PASS — 19 tests, 4 suites

- [ ] **Step 2: Run the whole suite and compare against baseline**

Run: `npm test -- --no-coverage 2>&1 | tail -20`
Expected: the only failing suites are the pre-existing ones (localStorage, VendorCard, vendorRepository, mi-gente-stubs, syncService, photoService — verify against `git stash` baseline if unsure). No suite that passed before this work may fail now.

- [ ] **Step 3: TypeScript + final commit**

Run: `npx tsc --noEmit`
Expected: exit 0

```bash
git status --short   # confirm nothing left unstaged
```

- [ ] **Step 4: Manual smoke test (device/emulator)**

1. Free account: review wizard step 1 shows Just Me selected, Public/Mi Gente with PRO badges; tapping one shows the nudge; Upgrade opens the paywall (signed in) / Sign Up navigates (guest).
2. Free account: drop a pin → saved vendor has `privacy: 'private'`.
3. Pro account: all three options selectable in wizard, pin flow, and spot detail; captions update.
4. Conversion: with a free account holding ≥1 private spot, complete a (sandbox) purchase → reminder modal appears once; "Make All Public" asks for confirmation then flips spots; relaunching never re-shows the modal.
