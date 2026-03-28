# TacoAtlas Security Design

**Date:** 2026-03-28
**Phase:** Beta (pre-public-launch)
**Approach:** Option A — RLS + Auth Config + Client Hardening
**No 2FA. No Edge Functions (except deleteAccount).**

---

## Threat Model

| Threat | Vector | Priority |
|--------|--------|----------|
| Account takeover | Brute-force login | High |
| Data snooping | One user reading another's private data | High |
| Spam / harassment | Bot accounts, friend request floods, push token abuse | High |

---

## Section 1: Database / RLS Fixes

### 1.1 Restrict Profile Visibility

**Problem:** `"Profiles are public"` policy (`for select using (true)`) exposes every column — including `push_token` and `is_admin` — to any user holding the anon key, including unauthenticated callers.

**Fix:** Replace the single public policy with one that requires authentication (blocks unauthenticated anon-key reads), plus move `push_token` to a separate table with strict owner-only RLS so column access is database-enforced — not just app discipline.

> **Why a separate table?** Postgres RLS restricts *rows*, not *columns*. There is no way to hide a column from a user who can read the row. The only way to truly restrict `push_token` at the database level is to put it in its own table.

```sql
-- Drop the existing catch-all policy
drop policy if exists "Profiles are public" on profiles;

-- Require authentication to read any profile row (blocks anon key abuse)
create policy "Authenticated users can read profiles" on profiles
  for select to authenticated
  using (true);

-- New table: push tokens — only the owner can read or write
create table if not exists push_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token text not null,
  updated_at timestamptz default now()
);

alter table push_tokens enable row level security;

create policy "Owner can read own push token" on push_tokens
  for select using (auth.uid() = user_id);

create policy "Owner can upsert own push token" on push_tokens
  for insert with check (auth.uid() = user_id);

create policy "Owner can update own push token" on push_tokens
  for update using (auth.uid() = user_id);
```

**App code changes required:**
- `notificationService.ts`: write `push_token` to `push_tokens` table instead of `profiles`
- `notificationService.ts` (`sendFriendRequestNotification`): query `push_tokens` (owner-only, so this query must run server-side or via the addressee's own session — move to Edge Function or accept that client-side friend request sending can't read the recipient's token directly)
- `loadProfile()` in `authStore`: no longer needs to fetch `push_token` from `profiles`

**Additional:** Remove `push_token` from any query that fetches profiles in bulk (e.g. `getFriends`, `searchUserByUsername`, `getFriendActivity`).

### 1.2 Friendship Table RLS Policies

**Problem:** No INSERT, UPDATE, or DELETE policies exist on `friendships`. Any authenticated user can insert, update, or delete any row by guessing a `requestId`.

**Fix:** Add ownership-enforcing policies:

```sql
-- INSERT: can only send as yourself
create policy "Users can send friend requests as themselves" on friendships
  for insert with check (auth.uid() = requester_id);

-- UPDATE (accept): only the addressee can accept
create policy "Addressee can accept friend requests" on friendships
  for update using (auth.uid() = addressee_id)
  with check (status = 'accepted');

-- DELETE: requester can cancel, addressee can decline, either side can remove an accepted friendship
create policy "Users can delete their own friendship rows" on friendships
  for delete using (
    auth.uid() = requester_id or auth.uid() = addressee_id
  );
```

### 1.3 Protect `is_admin` from Client Updates

**Problem:** The existing `"Users can update their own profile"` policy allows a client to write any column including `is_admin`.

**Fix:** Restrict the UPDATE policy to only allow safe columns:

```sql
drop policy if exists "Users can update their own profile" on profiles;

create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);
```

Then create a `security definer` function as the only way to grant admin (called from Supabase dashboard or a migration — never from client code):

```sql
create or replace function grant_admin(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update profiles set is_admin = true where id = target_user_id;
end;
$$;

-- Revoke direct execute from public; only service role can call it
revoke execute on function grant_admin(uuid) from public;
```

The client UPDATE policy implicitly cannot set `is_admin = true` because Postgres column-level permissions can be added, or alternatively the app simply never sends `is_admin` in update payloads (enforced by TypeScript type `Partial<Pick<Profile, 'display_name' | 'username' | 'avatar_url' | 'bio' | 'home_city' | 'favorite_taco'>>` which already excludes it).

---

## Section 2: Supabase Auth Configuration (Dashboard)

All changes made in Supabase Dashboard → Auth. No migrations or code required.

| Setting | Location | Value |
|---------|----------|-------|
| Sign-in rate limit | Auth → Rate Limits | 5 attempts / hour / IP |
| Sign-up rate limit | Auth → Rate Limits | 3 accounts / hour / IP |
| Password reset rate limit | Auth → Rate Limits | 2 / hour / email |
| Email confirmation required | Auth → Email | Enabled |
| Minimum password length | Auth → Password | 8 characters |
| JWT expiry | Auth → JWT | 3600s (1 hour) — verify, do not change if already set |

**Email confirmation impact:** `signUp` in `authStore` already handles `needsConfirmation: true`. With this setting enabled it will always return `needsConfirmation: true`, routing every new user through the confirmation screen. No code change needed.

---

## Section 3: Client Hardening

### 3.1 Input Validation — `src/utils/validation.ts`

New file with Zod schemas for all user-provided text fields:

```typescript
import { z } from 'zod'

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[0-9!@#$%^&*]/, 'Must include a number or special character')

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
```

**Where to apply:**
- `app/(auth)/sign-up.tsx` — `passwordSchema`, `usernameSchema`, `displayNameSchema`
- `app/(tabs)/profile.tsx` (change password) — `passwordSchema`
- `app/(tabs)/profile.tsx` (edit profile) — `displayNameSchema`, `usernameSchema`, `bioSchema`
- `app/pin/add.tsx` — `spotNameSchema`
- `app/review/add.tsx` Step 1 — `spotNameSchema`; Step 3 — `notesSchema`

**Pattern:** Validate on submit, show inline error text below the field (not a modal). Do not disable the submit button preemptively.

### 3.2 Password Strength UI

On `sign-up.tsx` and profile change-password modal:

- After the password field, render an inline strength indicator: show a one-line message (`"Too short"`, `"Add a number or symbol"`, `"Strong"`) driven by `passwordSchema.safeParse(value)`
- Color: red for invalid, green for valid
- Only shown after the field has been touched (first keystroke)
- On submit, if invalid: show error and abort — do not call `authStore.signIn/signUp`

### 3.3 Login Attempt Throttle

In `app/(auth)/sign-in.tsx`, add local component state (not persisted):

```typescript
const [failedAttempts, setFailedAttempts] = useState(0)
const [lockedUntil, setLockedUntil] = useState<number | null>(null)
```

**Logic:**
- On failed sign-in: increment `failedAttempts`
- When `failedAttempts >= 5`: set `lockedUntil = Date.now() + 30_000`
- While locked: disable sign-in button, show countdown (`"Try again in Xs"`) updated via `setInterval`
- On successful sign-in: reset both to `0` / `null`
- Cooldown resets on app restart (intentional — this is UI-only deterrence)

### 3.4 `deleteAccount` — Server-Side User Deletion

**Problem:** Current `deleteAccount` deletes the `profiles` row and signs out but leaves `auth.users` entry alive. The account can technically still sign in or be recreated.

**Fix:** Add a single Supabase Edge Function `delete-account` that calls `supabase.auth.admin.deleteUser(userId)` using the service role key. The client calls this function (authenticated), then signs out.

**Edge Function:** `supabase/functions/delete-account/index.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401 })

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await userClient.auth.getUser()
  if (userError || !user) return new Response('Unauthorized', { status: 401 })

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) return new Response(error.message, { status: 500 })

  return new Response('ok', { status: 200 })
})
```

**`authStore.deleteAccount` update:** Call the Edge Function first, then sign out locally. Profile and all cascade-linked rows are deleted by the `on delete cascade` already on `profiles`.

---

## Migration Plan

1. **SQL migration** — `supabase/migrations/20260328000001_security_hardening.sql`:
   - Drop `"Profiles are public"`, add `"Authenticated users can read profiles"`
   - Create `push_tokens` table with owner-only RLS
   - Add friendship INSERT / UPDATE / DELETE policies
   - Add `grant_admin` security definer function
   - Drop and recreate profiles UPDATE policy

2. **Dashboard config** — Section 2 settings applied manually (no code, just config)

3. **Edge Functions** — two functions to deploy:
   - `supabase/functions/delete-account/` — hard-deletes auth user via service role
   - `supabase/functions/send-friend-notification/` — receives `{ addresseeId, requesterUsername }`, looks up token from `push_tokens` using service role, sends to `exp.host`. Client can no longer read recipient tokens directly.

4. **Client changes** — single PR:
   - Add `src/utils/validation.ts`
   - Update `sign-up.tsx` (password strength + Zod)
   - Update `sign-in.tsx` (login throttle)
   - Update `profile.tsx` (password strength + Zod on edit)
   - Update `pin/add.tsx` + `review/add.tsx` (spot name + notes Zod)
   - Update `authStore.deleteAccount` to call `delete-account` Edge Function
   - Update `notificationService.ts`: write token to `push_tokens` table; call `send-friend-notification` Edge Function instead of `exp.host` directly
   - Audit all `profiles` queries in `miGenteService.ts` — confirm none select `push_token` or `is_admin`

---

## What This Does NOT Cover (deferred to post-beta)

- Server-side friend request rate limiting (Edge Function relay)
- Push notification relay (prevents direct client-to-device sends)
- CAPTCHA on sign-up
- Audit logging / anomaly detection
- GDPR data export
