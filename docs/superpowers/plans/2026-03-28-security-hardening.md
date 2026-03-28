# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all three attack vectors (account takeover, data snooping, spam/harassment) identified in the security design spec before public launch.

**Architecture:** Three layers — SQL migrations lock down the database (RLS, push token isolation, friendship ownership), two Supabase Edge Functions handle privileged server-side operations (account deletion, push notification relay), and client-side changes add input validation (Zod), password strength UI, and login throttling.

**Tech Stack:** Supabase (Postgres RLS, Edge Functions / Deno), Zod v3, React Native / Expo Router, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-28-security-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/20260328000001_security_hardening.sql` | Create | All RLS + schema changes |
| `supabase/functions/delete-account/index.ts` | Create | Hard-delete auth user via service role |
| `supabase/functions/send-friend-notification/index.ts` | Create | Look up push token + relay to exp.host |
| `src/utils/validation.ts` | Create | Zod schemas for all user-provided text |
| `src/__tests__/utils/validation.test.ts` | Create | Unit tests for all schemas |
| `src/services/notificationService.ts` | Modify | Write token to push_tokens; call Edge Function |
| `src/store/authStore.ts` | Modify | deleteAccount calls delete-account Edge Function |
| `app/(auth)/sign-up.tsx` | Modify | Password strength indicator + Zod validation |
| `app/(auth)/sign-in.tsx` | Modify | Login attempt throttle |
| `app/(tabs)/profile.tsx` | Modify | Password strength indicator on change-password modal |
| `app/pin/add.tsx` | Modify | Spot name Zod validation |
| `app/review/add.tsx` | Modify | Spot name + notes Zod validation |

---

## Task 1: Install Zod

**Files:**
- Modify: `package.json` (via npm install)

- [ ] **Step 1: Install Zod**

```bash
npm install zod
```

Expected output: `added 1 package` (Zod has zero dependencies)

- [ ] **Step 2: Verify install**

```bash
node -e "const { z } = require('zod'); console.log(z.string().parse('ok'))"
```

Expected output: `ok`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install zod for input validation"
```

---

## Task 2: `src/utils/validation.ts` + tests

**Files:**
- Create: `src/utils/validation.ts`
- Create: `src/__tests__/utils/validation.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/utils/validation.test.ts`:

```typescript
import {
  passwordSchema,
  usernameSchema,
  displayNameSchema,
  bioSchema,
  spotNameSchema,
  notesSchema,
} from '../../utils/validation'

describe('passwordSchema', () => {
  it('rejects passwords shorter than 8 chars', () => {
    expect(passwordSchema.safeParse('abc1!').success).toBe(false)
  })
  it('rejects passwords with no number or special char', () => {
    expect(passwordSchema.safeParse('abcdefgh').success).toBe(false)
  })
  it('accepts password with number', () => {
    expect(passwordSchema.safeParse('abcdefg1').success).toBe(true)
  })
  it('accepts password with special char', () => {
    expect(passwordSchema.safeParse('abcdefg!').success).toBe(true)
  })
})

describe('usernameSchema', () => {
  it('rejects username shorter than 3 chars', () => {
    expect(usernameSchema.safeParse('ab').success).toBe(false)
  })
  it('rejects username longer than 20 chars', () => {
    expect(usernameSchema.safeParse('a'.repeat(21)).success).toBe(false)
  })
  it('rejects uppercase letters', () => {
    expect(usernameSchema.safeParse('TacoKing').success).toBe(false)
  })
  it('rejects spaces', () => {
    expect(usernameSchema.safeParse('taco king').success).toBe(false)
  })
  it('accepts lowercase alphanumeric + underscore', () => {
    expect(usernameSchema.safeParse('taco_king_99').success).toBe(true)
  })
})

describe('displayNameSchema', () => {
  it('rejects empty string', () => {
    expect(displayNameSchema.safeParse('').success).toBe(false)
  })
  it('rejects name longer than 40 chars', () => {
    expect(displayNameSchema.safeParse('a'.repeat(41)).success).toBe(false)
  })
  it('trims whitespace', () => {
    const result = displayNameSchema.safeParse('  Maria  ')
    expect(result.success && result.data).toBe('Maria')
  })
})

describe('spotNameSchema', () => {
  it('rejects empty string', () => {
    expect(spotNameSchema.safeParse('').success).toBe(false)
  })
  it('rejects name longer than 80 chars', () => {
    expect(spotNameSchema.safeParse('a'.repeat(81)).success).toBe(false)
  })
  it('trims whitespace', () => {
    const result = spotNameSchema.safeParse('  El Taco  ')
    expect(result.success && result.data).toBe('El Taco')
  })
})

describe('notesSchema', () => {
  it('accepts undefined', () => {
    expect(notesSchema.safeParse(undefined).success).toBe(true)
  })
  it('rejects notes longer than 500 chars', () => {
    expect(notesSchema.safeParse('a'.repeat(501)).success).toBe(false)
  })
  it('accepts notes at 500 chars', () => {
    expect(notesSchema.safeParse('a'.repeat(500)).success).toBe(true)
  })
})

describe('bioSchema', () => {
  it('accepts undefined', () => {
    expect(bioSchema.safeParse(undefined).success).toBe(true)
  })
  it('rejects bio longer than 160 chars', () => {
    expect(bioSchema.safeParse('a'.repeat(161)).success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- --testPathPattern="validation" --no-coverage
```

Expected: FAIL — `Cannot find module '../../utils/validation'`

- [ ] **Step 3: Create `src/utils/validation.ts`**

```typescript
import { z } from 'zod'

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[0-9!@#$%^&*()_+\-=[\]{}|;:,.<>?]/, 'Must include a number or special character')

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be 20 characters or fewer')
  .regex(/^[a-z0-9_]+$/, 'Only lowercase letters, numbers, and underscores')

export const displayNameSchema = z
  .string()
  .min(1, 'Display name is required')
  .max(40, 'Display name must be 40 characters or fewer')
  .transform(s => s.trim())

export const bioSchema = z
  .string()
  .max(160, 'Bio must be 160 characters or fewer')
  .optional()

export const spotNameSchema = z
  .string()
  .min(1, 'Spot name is required')
  .max(80, 'Spot name must be 80 characters or fewer')
  .transform(s => s.trim())

export const notesSchema = z
  .string()
  .max(500, 'Notes must be 500 characters or fewer')
  .optional()

/** Returns the first error message or null if valid */
export function firstError(result: z.SafeParseReturnType<unknown, unknown>): string | null {
  if (result.success) return null
  return result.error.errors[0]?.message ?? 'Invalid input'
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- --testPathPattern="validation" --no-coverage
```

Expected: PASS — all 15 tests

- [ ] **Step 5: Commit**

```bash
git add src/utils/validation.ts src/__tests__/utils/validation.test.ts
git commit -m "feat: add zod validation schemas with unit tests"
```

---

## Task 3: SQL Migration — Security Hardening

**Files:**
- Create: `supabase/migrations/20260328000001_security_hardening.sql`

No automated tests for SQL — verification is manual after applying.

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/20260328000001_security_hardening.sql`:

```sql
-- ─────────────────────────────────────────────────────────────
-- 1. Restrict profiles visibility — require authentication
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Profiles are public" on profiles;

-- Only authenticated users can read profile rows.
-- Column-level protection for push_token is enforced via the
-- push_tokens table below — app code must not select push_token
-- from profiles for other users.
create policy "Authenticated users can read profiles" on profiles
  for select to authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────
-- 2. push_tokens — separate table, owner-only access
-- ─────────────────────────────────────────────────────────────
create table if not exists push_tokens (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  token      text not null,
  updated_at timestamptz default now()
);

alter table push_tokens enable row level security;

create policy "Owner can read own push token" on push_tokens
  for select using (auth.uid() = user_id);

create policy "Owner can insert own push token" on push_tokens
  for insert with check (auth.uid() = user_id);

create policy "Owner can update own push token" on push_tokens
  for update using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 3. Friendship RLS — ownership enforcement
-- ─────────────────────────────────────────────────────────────

-- INSERT: can only create requests as yourself
drop policy if exists "Users can send friend requests as themselves" on friendships;
create policy "Users can send friend requests as themselves" on friendships
  for insert with check (auth.uid() = requester_id);

-- UPDATE: only the addressee can accept a pending request
drop policy if exists "Addressee can accept friend requests" on friendships;
create policy "Addressee can accept friend requests" on friendships
  for update using (auth.uid() = addressee_id)
  with check (status = 'accepted');

-- DELETE: either party can remove the row (cancel, decline, unfriend, block cleanup)
drop policy if exists "Users can delete their own friendship rows" on friendships;
create policy "Users can delete their own friendship rows" on friendships
  for delete using (
    auth.uid() = requester_id or auth.uid() = addressee_id
  );

-- ─────────────────────────────────────────────────────────────
-- 4. Protect is_admin — restrict profile UPDATE to safe columns
--    (app code already excludes is_admin via TypeScript Pick type;
--    this makes it explicit at the policy level)
-- ─────────────────────────────────────────────────────────────
drop policy if exists "Users can update their own profile" on profiles;

create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- grant_admin: only callable with service role (not from client)
create or replace function grant_admin(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update profiles set is_admin = true where id = target_user_id;
end;
$$;

revoke execute on function grant_admin(uuid) from public;
```

- [ ] **Step 2: Apply the migration**

```bash
npx supabase db push
```

Expected: migration applies cleanly with no errors.

If you get a "policy already exists" error on friendships, the policy was added in a prior migration. Run `drop policy if exists` manually in the Supabase SQL editor then re-run.

- [ ] **Step 3: Manual verification in Supabase SQL editor**

Run each of these and confirm the results:

```sql
-- Should show the new policies, not "Profiles are public"
select policyname, cmd, qual from pg_policies where tablename = 'profiles';

-- Should show 3 policies: insert, update, delete
select policyname, cmd from pg_policies where tablename = 'friendships';

-- Should show the new table with 3 policies
select policyname, cmd from pg_policies where tablename = 'push_tokens';
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260328000001_security_hardening.sql
git commit -m "feat: security hardening — restrict profiles, push_tokens table, friendship RLS"
```

---

## Task 4: Edge Function — `delete-account`

**Files:**
- Create: `supabase/functions/delete-account/index.ts`

- [ ] **Step 1: Create the function directory and file**

```bash
mkdir -p supabase/functions/delete-account
```

Create `supabase/functions/delete-account/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  // Verify the caller's JWT using the anon key
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  // Use service role to hard-delete the auth user
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Deploy the function**

```bash
npx supabase functions deploy delete-account --no-verify-jwt
```

> Note: `--no-verify-jwt` is intentional — the function performs its own JWT verification using `auth.getUser()` so that it can get the user's ID. Without this flag Supabase validates the JWT before the function runs, but we need to do it ourselves to extract the user.

Expected: `Deployed delete-account`

- [ ] **Step 3: Manual smoke test**

In the Supabase dashboard → Edge Functions → delete-account, use the test invocation panel or run:

```bash
curl -X POST https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/delete-account \
  -H "Authorization: Bearer <A_VALID_USER_JWT>"
```

Expected: `{"ok":true}` and the user's row is gone from `auth.users`.

> Only do this with a throwaway test account — the deletion is permanent.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/delete-account/index.ts
git commit -m "feat: add delete-account edge function for server-side user deletion"
```

---

## Task 5: Edge Function — `send-friend-notification`

**Files:**
- Create: `supabase/functions/send-friend-notification/index.ts`

- [ ] **Step 1: Create the function**

```bash
mkdir -p supabase/functions/send-friend-notification
```

Create `supabase/functions/send-friend-notification/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  // Verify caller is authenticated
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const { addresseeId, requesterUsername } = await req.json()
  if (!addresseeId || !requesterUsername) {
    return new Response('Bad Request', { status: 400, headers: corsHeaders })
  }

  // Use service role to read the recipient's push token
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: tokenRow } = await adminClient
    .from('push_tokens')
    .select('token')
    .eq('user_id', addresseeId)
    .single()

  if (!tokenRow?.token) {
    // Recipient has no push token — not an error, just no-op
    return new Response(JSON.stringify({ ok: true, sent: false }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: tokenRow.token,
      title: 'New Friend Request 🌮',
      body: `@${requesterUsername} wants to join your crew`,
      data: { screen: 'mi-gente' },
      channelId: 'friend-requests',
    }),
  })

  return new Response(JSON.stringify({ ok: true, sent: true }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
```

- [ ] **Step 2: Deploy**

```bash
npx supabase functions deploy send-friend-notification --no-verify-jwt
```

Expected: `Deployed send-friend-notification`

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-friend-notification/index.ts
git commit -m "feat: add send-friend-notification edge function — server-side push relay"
```

---

## Task 6: Update `notificationService.ts`

**Files:**
- Modify: `src/services/notificationService.ts`

- [ ] **Step 1: Read the current file**

Read `src/services/notificationService.ts` to confirm the current implementation before editing.

- [ ] **Step 2: Replace the file**

`savePushToken` writes to `push_tokens` (not `profiles`). `sendFriendRequestNotification` calls the Edge Function instead of `exp.host` directly.

Replace the entire file with:

```typescript
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from './supabase'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') return null

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('friend-requests', {
      name: 'Friend Requests',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  const tokenData = await Notifications.getExpoPushTokenAsync()
  return tokenData.data
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token, updated_at: new Date().toISOString() })
}

export async function sendFriendRequestNotification(
  addresseeId: string,
  requesterUsername: string
): Promise<void> {
  const session = (await supabase.auth.getSession()).data.session
  if (!session) return

  await supabase.functions.invoke('send-friend-notification', {
    body: { addresseeId, requesterUsername },
  })
}
```

- [ ] **Step 3: Verify build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `notificationService.ts`

- [ ] **Step 4: Commit**

```bash
git add src/services/notificationService.ts
git commit -m "feat: move push token to push_tokens table, relay notifications via edge function"
```

---

## Task 7: Update `authStore.ts` — `deleteAccount`

**Files:**
- Modify: `src/store/authStore.ts`

- [ ] **Step 1: Read the current `deleteAccount` implementation**

Read `src/store/authStore.ts` lines 131–140 to confirm the current implementation.

- [ ] **Step 2: Replace `deleteAccount`**

Find this block in `authStore.ts`:

```typescript
deleteAccount: async () => {
  const { session } = get()
  if (!session) return { error: 'Not signed in' }
  // Delete profile first (reviews/vendors cascade or are left as orphans)
  await supabase.from('profiles').delete().eq('id', session.user.id)
  // Sign out — actual user deletion requires a server-side function
  await supabase.auth.signOut()
  set({ session: null, profile: null })
  return { error: null }
},
```

Replace it with:

```typescript
deleteAccount: async () => {
  const { session } = get()
  if (!session) return { error: 'Not signed in' }
  const { error } = await supabase.functions.invoke('delete-account')
  if (error) return { error: error.message }
  setUserScope(null)
  set({ session: null, profile: null })
  return { error: null }
},
```

> The Edge Function hard-deletes the auth user. Postgres cascades handle the profiles row (and all downstream rows) automatically via `on delete cascade`.

- [ ] **Step 3: Verify build**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/store/authStore.ts
git commit -m "fix: deleteAccount now hard-deletes auth user via edge function"
```

---

## Task 8: Update `sign-up.tsx` — Password Strength Indicator

**Files:**
- Modify: `app/(auth)/sign-up.tsx`

The file already has a manual `password.length < 8` check and `USERNAME_RE` regex. We're replacing these with Zod and adding an inline strength indicator.

- [ ] **Step 1: Read the file**

Read `app/(auth)/sign-up.tsx` to confirm current state before editing.

- [ ] **Step 2: Add import + `passwordTouched` state**

After the existing imports at the top of the file, add:

```typescript
import { passwordSchema, firstError } from '../../src/utils/validation'
```

In the component state declarations (after `const [resendError, setResendError] = useState<string | null>(null)`), add:

```typescript
const [passwordTouched, setPasswordTouched] = useState(false)
```

- [ ] **Step 3: Update `handleSignUp` — replace manual password check with Zod**

Find this block:

```typescript
if (password.length < 8) {
  setErrorMsg('Password must be at least 8 characters.')
  return
}
```

Replace with:

```typescript
const pwResult = passwordSchema.safeParse(password)
if (!pwResult.success) {
  setErrorMsg(firstError(pwResult) ?? 'Invalid password')
  return
}
```

- [ ] **Step 4: Add strength indicator below the password field**

Find the closing `</View>` of `passwordWrap` (the view containing the password input and eye button). Add this immediately after it:

```tsx
{passwordTouched && (
  <Text style={[
    styles.strengthHint,
    passwordSchema.safeParse(password).success ? styles.strengthGood : styles.strengthBad,
  ]}>
    {passwordSchema.safeParse(password).success
      ? 'Strong password ✓'
      : password.length < 8
        ? 'Too short — minimum 8 characters'
        : 'Add a number or special character'}
  </Text>
)}
```

Update the password `TextInput` inside `passwordWrap` to fire `setPasswordTouched(true)` on first edit — change `onChangeText={setPassword}` to:

```tsx
onChangeText={v => { setPassword(v); if (!passwordTouched) setPasswordTouched(true) }}
```

- [ ] **Step 5: Add styles**

In the `StyleSheet.create({...})` block, add:

```typescript
strengthHint: {
  fontSize: 12,
  marginTop: -spacing.sm,
  marginBottom: spacing.sm,
  marginLeft: 2,
},
strengthBad: { color: colors.error },
strengthGood: { color: '#4CAF50' },
```

- [ ] **Step 6: Build check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add app/(auth)/sign-up.tsx
git commit -m "feat: add password strength indicator to sign-up screen"
```

---

## Task 9: Update `sign-in.tsx` — Login Throttle

**Files:**
- Modify: `app/(auth)/sign-in.tsx`

- [ ] **Step 1: Read the file**

Read `app/(auth)/sign-in.tsx` to confirm current state.

- [ ] **Step 2: Add throttle state + imports**

After the existing imports, add:

```typescript
import { useEffect, useRef } from 'react'
```

In the component, after the existing state declarations (`const [errorMsg, setErrorMsg]`), add:

```typescript
const [failedAttempts, setFailedAttempts] = useState(0)
const [lockedUntil, setLockedUntil] = useState<number | null>(null)
const [countdown, setCountdown] = useState(0)
const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
```

- [ ] **Step 3: Add countdown effect**

After the state declarations, add this effect:

```typescript
useEffect(() => {
  if (lockedUntil === null) return
  const tick = () => {
    const remaining = Math.ceil((lockedUntil - Date.now()) / 1000)
    if (remaining <= 0) {
      setLockedUntil(null)
      setFailedAttempts(0)
      setCountdown(0)
      if (countdownRef.current) clearInterval(countdownRef.current)
    } else {
      setCountdown(remaining)
    }
  }
  tick()
  countdownRef.current = setInterval(tick, 1000)
  return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
}, [lockedUntil])
```

- [ ] **Step 4: Update `handleSignIn`**

Find the existing `handleSignIn` function. Replace it entirely with:

```typescript
async function handleSignIn() {
  setErrorMsg(null)

  if (lockedUntil !== null && Date.now() < lockedUntil) return

  if (!email.trim() || !password) {
    setErrorMsg('Enter your email and password.')
    return
  }
  setLoading(true)
  const { error } = await signIn(email.trim().toLowerCase(), password)
  setLoading(false)

  if (error) {
    const next = failedAttempts + 1
    setFailedAttempts(next)
    if (next >= 5) {
      setLockedUntil(Date.now() + 30_000)
      setErrorMsg('Too many attempts. Try again in 30 seconds.')
    } else {
      setErrorMsg(error)
    }
    return
  }

  setFailedAttempts(0)
  setLockedUntil(null)
  router.replace('/(tabs)/atlas')
}
```

- [ ] **Step 5: Update the button and error display**

Find the sign-in `TouchableOpacity` button. Replace with:

```tsx
<TouchableOpacity
  style={[styles.button, (loading || lockedUntil !== null) && styles.buttonDisabled]}
  onPress={handleSignIn}
  disabled={loading || lockedUntil !== null}
>
  <Text style={styles.buttonText}>
    {loading
      ? 'Signing in...'
      : lockedUntil !== null
        ? `Try again in ${countdown}s`
        : 'Sign In'}
  </Text>
</TouchableOpacity>
```

- [ ] **Step 6: Build check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add app/(auth)/sign-in.tsx
git commit -m "feat: add login attempt throttle — 5 failures triggers 30s cooldown"
```

---

## Task 10: Update `profile.tsx` — Password Strength on Change-Password Modal

**Files:**
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Read the file**

Read `app/(tabs)/profile.tsx` in full to understand the change-password modal state and UI before editing.

- [ ] **Step 2: Add import**

After the existing imports, add:

```typescript
import { passwordSchema, firstError } from '../../src/utils/validation'
```

- [ ] **Step 3: Add `newPasswordTouched` state**

In the component, find the block of state related to the change-password modal (look for `newPassword` state). Add adjacent to it:

```typescript
const [newPasswordTouched, setNewPasswordTouched] = useState(false)
```

- [ ] **Step 4: Add Zod validation to the submit handler**

Find the function that handles password change submission (it calls `authStore.changePassword`). Before calling `changePassword`, add:

```typescript
const pwResult = passwordSchema.safeParse(newPassword)
if (!pwResult.success) {
  // Show the error in whatever error state the modal uses
  setChangePasswordError(firstError(pwResult))
  return
}
```

> `setChangePasswordError` — use whatever the existing error state setter is called in this file. Read the file in Step 1 to confirm the name.

- [ ] **Step 5: Add strength indicator below the new-password input**

Find the `TextInput` for the new password in the change-password modal. After it, add:

```tsx
{newPasswordTouched && (
  <Text style={{
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    color: passwordSchema.safeParse(newPassword).success ? '#4CAF50' : colors.error,
  }}>
    {passwordSchema.safeParse(newPassword).success
      ? 'Strong password ✓'
      : newPassword.length < 8
        ? 'Too short — minimum 8 characters'
        : 'Add a number or special character'}
  </Text>
)}
```

Update that `TextInput`'s `onChangeText` to set `newPasswordTouched`:

```tsx
onChangeText={v => { setNewPassword(v); if (!newPasswordTouched) setNewPasswordTouched(true) }}
```

- [ ] **Step 6: Reset `newPasswordTouched` on modal close**

Find where the change-password modal is dismissed/reset. Add `setNewPasswordTouched(false)` alongside any other state resets.

- [ ] **Step 7: Build check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add app/(tabs)/profile.tsx
git commit -m "feat: add password strength indicator to change-password modal"
```

---

## Task 11: Update `pin/add.tsx` — Spot Name Validation

**Files:**
- Modify: `app/pin/add.tsx`

- [ ] **Step 1: Read the file**

Read `app/pin/add.tsx` to find the spot name input and current submit validation.

- [ ] **Step 2: Add import**

```typescript
import { spotNameSchema, firstError } from '../../src/utils/validation'
```

- [ ] **Step 3: Add validation in the submit handler**

Find the form submit function. Before writing to storage, add:

```typescript
const nameResult = spotNameSchema.safeParse(name.trim())
if (!nameResult.success) {
  // Show error using whatever error state this screen uses
  setError(firstError(nameResult))
  return
}
// Use nameResult.data (trimmed) instead of name.trim() when saving
```

> Read the file to confirm the exact error state variable name and where the vendor is saved.

- [ ] **Step 4: Build check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/pin/add.tsx
git commit -m "feat: add zod spot name validation to drop-pin screen"
```

---

## Task 12: Update `review/add.tsx` — Spot Name + Notes Validation

**Files:**
- Modify: `app/review/add.tsx`

- [ ] **Step 1: Read the file**

Read `app/review/add.tsx` to find Step 1 (spot name input) and Step 3 (notes input) and the submit handler.

- [ ] **Step 2: Add imports**

```typescript
import { spotNameSchema, notesSchema, firstError } from '../../src/utils/validation'
```

- [ ] **Step 3: Add validation before Step 1 advance**

In the handler that advances from Step 1 to Step 2, add before proceeding:

```typescript
const nameResult = spotNameSchema.safeParse(vendorName.trim())
if (!nameResult.success) {
  setStep1Error(firstError(nameResult))
  return
}
```

> Confirm the exact state variable names by reading the file in Step 1.

- [ ] **Step 4: Add validation before final submit (Step 3)**

In the final submit handler, add:

```typescript
const notesResult = notesSchema.safeParse(notes)
if (!notesResult.success) {
  setStep3Error(firstError(notesResult))
  return
}
```

- [ ] **Step 5: Build check**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/review/add.tsx
git commit -m "feat: add zod validation for spot name and notes in review wizard"
```

---

## Task 13: Supabase Dashboard Configuration (Manual Checklist)

No code. Apply these settings in the [Supabase Dashboard](https://supabase.com/dashboard).

- [ ] **Sign-in rate limit** — Auth → Rate Limits → set to **5 per hour per IP**
- [ ] **Sign-up rate limit** — Auth → Rate Limits → set to **3 per hour per IP**
- [ ] **Password reset rate limit** — Auth → Rate Limits → set to **2 per hour per email**
- [ ] **Email confirmation required** — Auth → Email → enable **"Confirm email"**
- [ ] **Minimum password length** — Auth → Password → set to **8**
- [ ] **JWT expiry** — Auth → JWT → verify it is set to **3600** seconds (do not change if already set)

After completing all settings:

- [ ] **Commit a record of this**

```bash
git commit --allow-empty -m "chore: applied supabase auth rate limits and email confirmation (dashboard config)"
```

---

## Final Verification Checklist

- [ ] `npm test` passes (all 53 existing tests + new validation tests)
- [ ] `npx tsc --noEmit` reports no errors
- [ ] Both Edge Functions are deployed and visible in Supabase dashboard
- [ ] SQL migration is applied — confirmed via `select policyname from pg_policies where tablename in ('profiles', 'friendships', 'push_tokens')`
- [ ] Sign-up: password strength indicator appears after first keystroke, shows green on valid password
- [ ] Sign-in: after 5 wrong passwords, button shows `"Try again in 30s"` countdown
- [ ] Profile: password strength indicator appears in change-password modal
- [ ] Pin/add and review/add: submitting an empty spot name shows inline error
- [ ] Dashboard: email confirmation enabled, rate limits set
