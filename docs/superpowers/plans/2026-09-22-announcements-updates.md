# Announcements, Update Popup, and Version Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Founder-authored in-app announcements with a banner and read/unread state, a "restart to update" popup for downloaded OTA updates, and a `1.3.1 (52)` version label backed by a release script.

**Architecture:** Two Supabase tables (`announcements`, `announcement_reads`) behind admin-only RLS. A Zustand store owns announcement state with optimistic read/unread; signed-out read state lives in AsyncStorage and merges on sign-in. A second Zustand store wraps `expo-updates` as a small state machine; a `ConfirmModal`-based prompt shows when an update is downloaded. Pure logic lives in `src/utils/*` so it is unit-tested without React.

**Tech Stack:** Expo SDK 55, expo-router, Zustand 5, Supabase JS v2, expo-updates, expo-application, Jest 29 + ts-jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-09-22-announcements-updates-design.md`

---

## Ground rules for whoever executes this

- Baseline before starting: `npx jest` → **50 suites, 266 tests, all passing** (measured 2026-09-22). Every task must end with the full suite green.
- Jest runs in `testEnvironment: node` with `ts-jest`. `react-native` is mocked by `src/__mocks__/react-native.ts` (has `Alert`, `Modal`, `Switch`, `TextInput`, `Pressable`, `ActivityIndicator`; no `AppState`, no `Animated`). Do not unit-test code that needs `AppState`; keep it in thin hooks.
- Zustand v5: a selector that returns a **new array/object every call** causes an infinite render loop. Selectors in this plan return primitives or existing object references only. Screens that need a derived list use `useMemo`.
- `__DEV__` is undefined under Jest. Always guard: `typeof __DEV__ !== 'undefined' && __DEV__`.
- Supabase project id: `szblruvrajswbpksinkv`. Apply DB changes with the Supabase MCP `apply_migration`, verify with `execute_sql` inside `begin; … rollback;`.
- Style: no em dashes in user-facing copy. Immutable updates only.
- Commit after every task. Message format `type: description` + trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File map

| File | Status | Responsibility |
|---|---|---|
| `supabase/migrations/20260922000001_announcements.sql` | Create | Tables, trigger, RLS, grants |
| `src/types/announcement.ts` | Create | `Announcement` type, length limits |
| `src/utils/announcements.ts` | Create | Pure: published check, sort, unread, draft validation |
| `src/test-utils/supabaseChain.ts` | Create | Chainable Supabase query mock for service tests |
| `src/services/announcementService.ts` | Create | All Supabase I/O for announcements (user + admin) |
| `src/services/announcementReadsLocal.ts` | Create | AsyncStorage read-set for signed-out users |
| `src/store/announcementStore.ts` | Create | Items, read ids, refresh, optimistic read/unread, selectors |
| `src/hooks/useAppForeground.ts` | Create | Calls a callback when app returns to foreground |
| `src/utils/tabBar.ts` | Create | Single source for tab bar height |
| `src/components/AnnouncementBanner.tsx` | Create | Presentational banner (floating or inline preview) |
| `app/(tabs)/_layout.tsx` | Modify | Mount banner, Profile badge, use `tabBarHeight` |
| `app/announcements.tsx` | Create | User list: read/unread, mark all read |
| `app/admin/announcements.tsx` | Create | Founder list: Draft/Sent, New |
| `app/admin/announcement-edit.tsx` | Create | Founder create/edit/send/delete |
| `src/utils/updatePrompt.ts` | Create | Pure: status labels, modal visibility rule |
| `src/store/updateStore.ts` | Create | expo-updates state machine |
| `src/components/UpdateReadyPrompt.tsx` | Create | "A fresh batch is ready" modal |
| `src/utils/version.ts` | Create | Pure version label formatting |
| `src/services/appVersion.ts` | Create | Reads native version, build, OTA id |
| `src/components/settings/settingsStyles.ts` | Create | Shared Settings row styles |
| `src/components/settings/AppSection.tsx` | Create | Extracted Settings "App" card |
| `app/(tabs)/profile.tsx` | Modify | Use `AppSection`, add Founder row, shared styles |
| `app/_layout.tsx` | Modify | Register routes, refresh triggers, mount prompt |
| `src/__mocks__/expo-updates.ts` | Modify | Add async function stubs + `isEnabled` |
| `scripts/releaseLib.js` | Create | Pure release helpers (CommonJS) |
| `scripts/release.js` | Create | `release:store` / `release:ota` CLI |
| `package.json` | Modify | Scripts, `expo-application` dep |
| `CHANGELOG.md` | Modify | `## Unreleased` section with this feature |

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/20260922000001_announcements.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- ─────────────────────────────────────────────────────────────
-- System announcements (founder-authored) + per-user read state
-- ─────────────────────────────────────────────────────────────
-- published_at null  = draft, visible to admins only.
-- published_at set   = sent, visible to everyone (anon included, so
--                      signed-out local-first users still see them).
-- Writes are admin-only. is_admin is safe to trust here because
-- lock_privileged_profile_columns (applied 2026-09-22) stops users from
-- setting it on themselves.
-- ─────────────────────────────────────────────────────────────

create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(btrim(title)) between 1 and 80),
  body         text not null check (char_length(btrim(body)) between 1 and 1000),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid not null default auth.uid() references public.profiles(id) on delete cascade
);

create index announcements_published_idx
  on public.announcements (published_at desc)
  where published_at is not null;

create or replace function public.announcements_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger announcements_touch_updated_at
  before update on public.announcements
  for each row execute function public.announcements_touch_updated_at();

alter table public.announcements enable row level security;

create policy announcements_read_published on public.announcements
  for select to anon, authenticated
  using (published_at is not null and published_at <= now());

create policy announcements_admin_read_all on public.announcements
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin));

create policy announcements_admin_insert on public.announcements
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin)
  );

create policy announcements_admin_update on public.announcements
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin));

create policy announcements_admin_delete on public.announcements
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin));

grant select on public.announcements to anon, authenticated;
grant insert, update, delete on public.announcements to authenticated;

-- ── Read receipts ──
-- A row means "this user has read this announcement". Mark-unread deletes it.
create table public.announcement_reads (
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (user_id, announcement_id)
);

alter table public.announcement_reads enable row level security;

create policy announcement_reads_select_own on public.announcement_reads
  for select to authenticated using (user_id = (select auth.uid()));

create policy announcement_reads_insert_own on public.announcement_reads
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy announcement_reads_delete_own on public.announcement_reads
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.announcement_reads to authenticated;
```

- [ ] **Step 2: Apply to production**

Call Supabase MCP `apply_migration` with `project_id: "szblruvrajswbpksinkv"`, `name: "announcements"`, `query:` the full file contents.
Expected: `{"success":true}`.

- [ ] **Step 3: Verify every policy in a rolled-back transaction**

Call `execute_sql` with:

```sql
begin;
create temp table _r(test text, outcome text) on commit drop;
grant all on _r to authenticated, anon;

-- Seed as postgres: one draft, one sent.
insert into public.announcements (id, title, body, published_at, created_by)
select '00000000-0000-0000-0000-00000000000d', 'Draft', 'draft body', null, id from public.profiles where is_admin limit 1;
insert into public.announcements (id, title, body, published_at, created_by)
select '00000000-0000-0000-0000-00000000000e', 'Sent', 'sent body', now() - interval '1 minute', id from public.profiles where is_admin limit 1;

-- ── as a NON-admin ──
do $$ declare uid uuid; begin
  select id into uid from public.profiles where not is_admin limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  perform set_config('test.uid', uid::text, true);
end $$;
set local role authenticated;
do $$ declare uid uuid := current_setting('test.uid')::uuid; n int; begin
  select count(*) into n from public.announcements;
  insert into _r values ('non-admin sees only sent', case when n = 1 then 'ok' else 'BAD: ' || n end);
  begin insert into public.announcements (title, body) values ('x', 'y'); insert into _r values ('non-admin insert', 'ALLOWED (BAD)');
  exception when others then insert into _r values ('non-admin insert', 'blocked'); end;
  update public.announcements set title = 'hacked' where id = '00000000-0000-0000-0000-00000000000e';
  get diagnostics n = row_count; insert into _r values ('non-admin update', case when n = 0 then 'blocked' else 'ALLOWED (BAD)' end);
  delete from public.announcements where id = '00000000-0000-0000-0000-00000000000e';
  get diagnostics n = row_count; insert into _r values ('non-admin delete', case when n = 0 then 'blocked' else 'ALLOWED (BAD)' end);
  insert into public.announcement_reads (announcement_id) values ('00000000-0000-0000-0000-00000000000e');
  insert into _r values ('non-admin mark read', 'ok');
  begin insert into public.announcement_reads (user_id, announcement_id)
    select id, '00000000-0000-0000-0000-00000000000e' from public.profiles where id <> uid limit 1;
    insert into _r values ('mark read for someone else', 'ALLOWED (BAD)');
  exception when others then insert into _r values ('mark read for someone else', 'blocked'); end;
end $$;
reset role;

-- ── as anon ──
set local role anon;
do $$ declare n int; begin
  select count(*) into n from public.announcements;
  insert into _r values ('anon sees only sent', case when n = 1 then 'ok' else 'BAD: ' || n end);
end $$;
reset role;

-- ── as the admin ──
do $$ declare uid uuid; begin
  select id into uid from public.profiles where is_admin limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;
set local role authenticated;
do $$ declare n int; begin
  select count(*) into n from public.announcements;
  insert into _r values ('admin sees drafts', case when n = 2 then 'ok' else 'BAD: ' || n end);
  insert into public.announcements (title, body) values ('New', 'new body');
  insert into _r values ('admin insert', 'ok');
  update public.announcements set published_at = now() where id = '00000000-0000-0000-0000-00000000000d';
  get diagnostics n = row_count; insert into _r values ('admin send', case when n = 1 then 'ok' else 'BAD' end);
  delete from public.announcements where id = '00000000-0000-0000-0000-00000000000e';
  get diagnostics n = row_count; insert into _r values ('admin delete (cascades reads)', case when n = 1 then 'ok' else 'BAD' end);
end $$;
reset role;
select * from _r;
rollback;
```

Expected: every row reads `ok` or `blocked`. Any `BAD` or `ALLOWED (BAD)` means stop and fix the policy before continuing.

- [ ] **Step 4: Run security advisors**

Call `get_advisors` with `type: "security"`. Expected: no new findings mentioning `announcements` or `announcement_reads`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260922000001_announcements.sql
git commit -m "feat: announcements and announcement_reads tables with admin-only RLS

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Announcement type and pure helpers

**Files:**
- Create: `src/types/announcement.ts`
- Create: `src/utils/announcements.ts`
- Test: `src/utils/__tests__/announcements.test.ts`

- [ ] **Step 1: Create the type**

```ts
// src/types/announcement.ts
// Mirrors public.announcements. publishedAt null = draft (admin-only).
export interface Announcement {
  id: string
  title: string
  body: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

// Keep in sync with the CHECK constraints in
// supabase/migrations/20260922000001_announcements.sql.
export const ANNOUNCEMENT_TITLE_MAX = 80
export const ANNOUNCEMENT_BODY_MAX = 1000
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/utils/__tests__/announcements.test.ts
import {
  isPublished, sortNewestFirst, unreadOf, validateDraft,
} from '../announcements'
import type { Announcement } from '../../types/announcement'

function make(id: string, publishedAt: string | null, createdAt = '2026-09-01T00:00:00Z'): Announcement {
  return { id, title: `t-${id}`, body: 'b', publishedAt, createdAt, updatedAt: createdAt }
}

const NOW = Date.parse('2026-09-22T12:00:00Z')

describe('isPublished', () => {
  it('is false for drafts', () => {
    expect(isPublished(make('a', null), NOW)).toBe(false)
  })
  it('is true once published_at has passed', () => {
    expect(isPublished(make('a', '2026-09-22T11:00:00Z'), NOW)).toBe(true)
  })
  it('is false for a future published_at', () => {
    expect(isPublished(make('a', '2026-09-23T00:00:00Z'), NOW)).toBe(false)
  })
})

describe('sortNewestFirst', () => {
  it('orders by publishedAt, falling back to createdAt for drafts, without mutating input', () => {
    const input = [
      make('old', '2026-09-01T00:00:00Z'),
      make('draft', null, '2026-09-21T00:00:00Z'),
      make('new', '2026-09-20T00:00:00Z'),
    ]
    const snapshot = [...input]
    expect(sortNewestFirst(input).map(a => a.id)).toEqual(['draft', 'new', 'old'])
    expect(input).toEqual(snapshot)
  })
})

describe('unreadOf', () => {
  it('returns published, unread items newest first', () => {
    const items = [
      make('read', '2026-09-10T00:00:00Z'),
      make('draft', null),
      make('older', '2026-09-05T00:00:00Z'),
      make('newer', '2026-09-15T00:00:00Z'),
    ]
    expect(unreadOf(items, ['read'], NOW).map(a => a.id)).toEqual(['newer', 'older'])
  })
  it('is empty when everything is read', () => {
    expect(unreadOf([make('a', '2026-09-10T00:00:00Z')], ['a'], NOW)).toEqual([])
  })
})

describe('validateDraft', () => {
  it('requires a title', () => {
    expect(validateDraft('   ', 'body')).toBe('Add a title.')
  })
  it('requires a body', () => {
    expect(validateDraft('Title', '')).toBe('Add a message.')
  })
  it('caps the title at 80 characters', () => {
    expect(validateDraft('x'.repeat(81), 'body')).toBe('Title is too long (80 max).')
  })
  it('caps the body at 1000 characters', () => {
    expect(validateDraft('Title', 'x'.repeat(1001))).toBe('Message is too long (1000 max).')
  })
  it('returns null when valid', () => {
    expect(validateDraft('Title', 'Body')).toBeNull()
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx jest src/utils/__tests__/announcements.test.ts`
Expected: FAIL, `Cannot find module '../announcements'`.

- [ ] **Step 4: Implement**

```ts
// src/utils/announcements.ts
import {
  ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX, type Announcement,
} from '../types/announcement'

export function isPublished(a: Announcement, now: number = Date.now()): boolean {
  return a.publishedAt !== null && Date.parse(a.publishedAt) <= now
}

function sortKey(a: Announcement): number {
  return Date.parse(a.publishedAt ?? a.createdAt)
}

export function sortNewestFirst(items: readonly Announcement[]): Announcement[] {
  return [...items].sort((a, b) => sortKey(b) - sortKey(a))
}

export function unreadOf(
  items: readonly Announcement[],
  readIds: readonly string[],
  now: number = Date.now(),
): Announcement[] {
  const read = new Set(readIds)
  return sortNewestFirst(items.filter(a => isPublished(a, now) && !read.has(a.id)))
}

export function validateDraft(title: string, body: string): string | null {
  const t = title.trim()
  const b = body.trim()
  if (!t) return 'Add a title.'
  if (!b) return 'Add a message.'
  if (t.length > ANNOUNCEMENT_TITLE_MAX) return `Title is too long (${ANNOUNCEMENT_TITLE_MAX} max).`
  if (b.length > ANNOUNCEMENT_BODY_MAX) return `Message is too long (${ANNOUNCEMENT_BODY_MAX} max).`
  return null
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx jest src/utils/__tests__/announcements.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 6: Commit**

```bash
git add src/types/announcement.ts src/utils/announcements.ts src/utils/__tests__/announcements.test.ts
git commit -m "feat: announcement type and pure unread/validation helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Supabase query mock helper

**Files:**
- Create: `src/test-utils/supabaseChain.ts`

No test of its own; Task 4 exercises it.

- [ ] **Step 1: Create the helper**

```ts
// src/test-utils/supabaseChain.ts
// A stand-in for a supabase-js query builder. Every method call is recorded
// and returns the same builder, and awaiting it resolves to `result`. Lets
// service tests assert the exact query shape without a network.
export interface ChainResult {
  data?: unknown
  error: { message: string } | null
}

export type RecordedCall = [method: string, args: unknown[]]

export interface Chain {
  calls: RecordedCall[]
  [method: string]: any
}

export function supabaseChain(result: ChainResult): Chain {
  const calls: RecordedCall[] = []
  const builder: Chain = new Proxy({ calls } as Chain, {
    get(target, prop: string) {
      if (prop === 'calls') return target.calls
      if (prop === 'then') {
        return (resolve: (v: ChainResult) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve(result).then(resolve, reject)
      }
      return (...args: unknown[]) => {
        calls.push([prop, args])
        return builder
      }
    },
  })
  return builder
}

export function methodsOf(chain: Chain): string[] {
  return chain.calls.map(([m]) => m)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/test-utils/supabaseChain.ts
git commit -m "test: chainable supabase query mock

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Announcement service

**Files:**
- Create: `src/services/announcementService.ts`
- Test: `src/services/__tests__/announcementService.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/services/__tests__/announcementService.test.ts
import { supabaseChain, methodsOf, type Chain } from '../../test-utils/supabaseChain'

const from = jest.fn()
jest.mock('../supabase', () => ({ supabase: { from: (...a: unknown[]) => from(...a) } }))

import {
  fetchPublished, fetchReadIds, markRead, markUnread,
  listAll, fetchById, createDraft, updateAnnouncement, sendAnnouncement, deleteAnnouncement,
} from '../announcementService'

const ROW = {
  id: 'a1', title: 'Hello', body: 'World',
  published_at: '2026-09-22T00:00:00Z', created_at: '2026-09-21T00:00:00Z', updated_at: '2026-09-21T00:00:00Z',
}

function respond(result: Parameters<typeof supabaseChain>[0]): Chain {
  const chain = supabaseChain(result)
  from.mockReturnValueOnce(chain)
  return chain
}

beforeEach(() => from.mockReset())

describe('fetchPublished', () => {
  it('queries sent announcements newest first and maps rows', async () => {
    const chain = respond({ data: [ROW], error: null })
    const result = await fetchPublished()
    expect(from).toHaveBeenCalledWith('announcements')
    expect(methodsOf(chain)).toEqual(['select', 'not', 'lte', 'order', 'limit'])
    expect(chain.calls[1][1]).toEqual(['published_at', 'is', null])
    expect(result).toEqual([{
      id: 'a1', title: 'Hello', body: 'World',
      publishedAt: '2026-09-22T00:00:00Z', createdAt: '2026-09-21T00:00:00Z', updatedAt: '2026-09-21T00:00:00Z',
    }])
  })
  it('throws the supabase error message', async () => {
    respond({ data: null, error: { message: 'boom' } })
    await expect(fetchPublished()).rejects.toThrow('boom')
  })
})

describe('read state', () => {
  it('fetchReadIds returns announcement ids', async () => {
    respond({ data: [{ announcement_id: 'a1' }, { announcement_id: 'a2' }], error: null })
    await expect(fetchReadIds()).resolves.toEqual(['a1', 'a2'])
  })
  it('markRead upserts one row per id and ignores duplicates', async () => {
    const chain = respond({ error: null })
    await markRead('u1', ['a1', 'a2'])
    expect(from).toHaveBeenCalledWith('announcement_reads')
    expect(chain.calls[0]).toEqual(['upsert', [
      [{ user_id: 'u1', announcement_id: 'a1' }, { user_id: 'u1', announcement_id: 'a2' }],
      { onConflict: 'user_id,announcement_id', ignoreDuplicates: true },
    ]])
  })
  it('markRead with no ids makes no request', async () => {
    await markRead('u1', [])
    expect(from).not.toHaveBeenCalled()
  })
  it('markUnread deletes the one receipt', async () => {
    const chain = respond({ error: null })
    await markUnread('u1', 'a1')
    expect(methodsOf(chain)).toEqual(['delete', 'eq', 'eq'])
    expect(chain.calls[1][1]).toEqual(['user_id', 'u1'])
    expect(chain.calls[2][1]).toEqual(['announcement_id', 'a1'])
  })
})

describe('admin', () => {
  it('listAll orders by created_at desc', async () => {
    const chain = respond({ data: [ROW], error: null })
    await listAll()
    expect(chain.calls.find(([m]) => m === 'order')?.[1]).toEqual(['created_at', { ascending: false }])
  })
  it('fetchById returns null when missing', async () => {
    respond({ data: null, error: null })
    await expect(fetchById('nope')).resolves.toBeNull()
  })
  it('createDraft inserts trimmed text with no published_at', async () => {
    const chain = respond({ data: { ...ROW, published_at: null }, error: null })
    const created = await createDraft({ title: '  Hi ', body: ' there ' })
    expect(chain.calls[0]).toEqual(['insert', [{ title: 'Hi', body: 'there' }]])
    expect(created.publishedAt).toBeNull()
  })
  it('updateAnnouncement updates title and body by id', async () => {
    const chain = respond({ data: ROW, error: null })
    await updateAnnouncement('a1', { title: 'T', body: 'B' })
    expect(chain.calls[0]).toEqual(['update', [{ title: 'T', body: 'B' }]])
    expect(chain.calls[1]).toEqual(['eq', ['id', 'a1']])
  })
  it('sendAnnouncement sets published_at only on drafts', async () => {
    const chain = respond({ data: ROW, error: null })
    await sendAnnouncement('a1')
    const [, [payload]] = chain.calls[0] as [string, [{ published_at: string }]]
    expect(typeof payload.published_at).toBe('string')
    expect(chain.calls[2]).toEqual(['is', ['published_at', null]])
  })
  it('deleteAnnouncement deletes by id', async () => {
    const chain = respond({ error: null })
    await deleteAnnouncement('a1')
    expect(methodsOf(chain)).toEqual(['delete', 'eq'])
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/services/__tests__/announcementService.test.ts`
Expected: FAIL, `Cannot find module '../announcementService'`.

- [ ] **Step 3: Implement**

```ts
// src/services/announcementService.ts
import { supabase } from './supabase'
import type { Announcement } from '../types/announcement'

// All announcement I/O. Functions throw on error (adminService pattern) so
// callers decide whether a failure is silent (read receipts) or loud (admin).
// RLS: see supabase/migrations/20260922000001_announcements.sql.

const COLUMNS = 'id, title, body, published_at, created_at, updated_at'
const FEED_LIMIT = 50

interface AnnouncementRow {
  id: string
  title: string
  body: string
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface AnnouncementInput {
  title: string
  body: string
}

function toAnnouncement(r: AnnouncementRow): Announcement {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    publishedAt: r.published_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function clean(input: AnnouncementInput): AnnouncementInput {
  return { title: input.title.trim(), body: input.body.trim() }
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message)
}

// ── Everyone ──

export async function fetchPublished(): Promise<Announcement[]> {
  // RLS already hides drafts from non-admins; the filter keeps an admin's own
  // feed (and banner) free of drafts too.
  const { data, error } = await supabase
    .from('announcements')
    .select(COLUMNS)
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(FEED_LIMIT)
  fail(error)
  return ((data ?? []) as AnnouncementRow[]).map(toAnnouncement)
}

export async function fetchReadIds(): Promise<string[]> {
  const { data, error } = await supabase.from('announcement_reads').select('announcement_id')
  fail(error)
  return ((data ?? []) as { announcement_id: string }[]).map(r => r.announcement_id)
}

export async function markRead(userId: string, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return
  const rows = ids.map(id => ({ user_id: userId, announcement_id: id }))
  const { error } = await supabase
    .from('announcement_reads')
    .upsert(rows, { onConflict: 'user_id,announcement_id', ignoreDuplicates: true })
  fail(error)
}

export async function markUnread(userId: string, id: string): Promise<void> {
  const { error } = await supabase
    .from('announcement_reads')
    .delete()
    .eq('user_id', userId)
    .eq('announcement_id', id)
  fail(error)
}

// ── Admin (RLS rejects these for non-admins) ──

export async function listAll(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select(COLUMNS)
    .order('created_at', { ascending: false })
  fail(error)
  return ((data ?? []) as AnnouncementRow[]).map(toAnnouncement)
}

export async function fetchById(id: string): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from('announcements')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle()
  fail(error)
  return data ? toAnnouncement(data as AnnouncementRow) : null
}

export async function createDraft(input: AnnouncementInput): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .insert(clean(input))
    .select(COLUMNS)
    .single()
  fail(error)
  return toAnnouncement(data as AnnouncementRow)
}

export async function updateAnnouncement(id: string, input: AnnouncementInput): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .update(clean(input))
    .eq('id', id)
    .select(COLUMNS)
    .single()
  fail(error)
  return toAnnouncement(data as AnnouncementRow)
}

export async function sendAnnouncement(id: string): Promise<Announcement> {
  // `.is('published_at', null)` makes a double-tap harmless: the second send
  // matches no row and .single() errors instead of re-stamping the time.
  const { data, error } = await supabase
    .from('announcements')
    .update({ published_at: new Date().toISOString() })
    .eq('id', id)
    .is('published_at', null)
    .select(COLUMNS)
    .single()
  fail(error)
  return toAnnouncement(data as AnnouncementRow)
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  fail(error)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx jest src/services/__tests__/announcementService.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/announcementService.ts src/services/__tests__/announcementService.test.ts
git commit -m "feat: announcement service for feed, read receipts, and admin CRUD

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Local read state for signed-out users

**Files:**
- Create: `src/services/announcementReadsLocal.ts`
- Test: `src/services/__tests__/announcementReadsLocal.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/services/__tests__/announcementReadsLocal.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocalReadIds, setLocalReadIds, clearLocalReadIds } from '../announcementReadsLocal'

beforeEach(async () => {
  await AsyncStorage.clear()
})

it('returns [] when nothing is stored', async () => {
  await expect(getLocalReadIds()).resolves.toEqual([])
})

it('round-trips ids and de-duplicates', async () => {
  await setLocalReadIds(['a', 'b', 'a'])
  await expect(getLocalReadIds()).resolves.toEqual(['a', 'b'])
})

it('returns [] for corrupt JSON instead of throwing', async () => {
  await AsyncStorage.setItem('announcements:read_ids', '{not json')
  await expect(getLocalReadIds()).resolves.toEqual([])
})

it('drops non-string entries', async () => {
  await AsyncStorage.setItem('announcements:read_ids', JSON.stringify(['a', 3, null]))
  await expect(getLocalReadIds()).resolves.toEqual(['a'])
})

it('clears', async () => {
  await setLocalReadIds(['a'])
  await clearLocalReadIds()
  await expect(getLocalReadIds()).resolves.toEqual([])
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/services/__tests__/announcementReadsLocal.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/services/announcementReadsLocal.ts
import AsyncStorage from '@react-native-async-storage/async-storage'

// Read receipts for signed-out (local-first) users. Merged into
// announcement_reads and cleared on sign-in by announcementStore.
const KEY = 'announcements:read_ids'

export async function getLocalReadIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch (e: unknown) {
    console.warn('[announcements] local read ids unreadable, resetting:', e)
    return []
  }
}

export async function setLocalReadIds(ids: readonly string[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify([...new Set(ids)]))
}

export async function clearLocalReadIds(): Promise<void> {
  await AsyncStorage.removeItem(KEY)
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx jest src/services/__tests__/announcementReadsLocal.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/announcementReadsLocal.ts src/services/__tests__/announcementReadsLocal.test.ts
git commit -m "feat: local announcement read state for signed-out users

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Announcement store

**Files:**
- Create: `src/store/announcementStore.ts`
- Test: `src/store/__tests__/announcementStore.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/store/__tests__/announcementStore.test.ts
import type { Announcement } from '../../types/announcement'

jest.mock('../../services/announcementService', () => ({
  fetchPublished: jest.fn(),
  fetchReadIds: jest.fn(),
  markRead: jest.fn(),
  markUnread: jest.fn(),
}))
jest.mock('../../services/announcementReadsLocal', () => ({
  getLocalReadIds: jest.fn(),
  setLocalReadIds: jest.fn(),
  clearLocalReadIds: jest.fn(),
}))

import * as service from '../../services/announcementService'
import * as local from '../../services/announcementReadsLocal'
import {
  useAnnouncementStore, selectUnreadCount, selectLatestUnread,
} from '../announcementStore'

const svc = service as jest.Mocked<typeof service>
const loc = local as jest.Mocked<typeof local>

function make(id: string, publishedAt: string): Announcement {
  return { id, title: id, body: 'b', publishedAt, createdAt: publishedAt, updatedAt: publishedAt }
}
const A = make('a', '2026-09-20T00:00:00Z')
const B = make('b', '2026-09-21T00:00:00Z')

beforeEach(() => {
  jest.resetAllMocks()
  useAnnouncementStore.setState({ items: [], readIds: [], userId: null, lastRefreshAt: 0 })
  svc.fetchPublished.mockResolvedValue([A, B])
  svc.fetchReadIds.mockResolvedValue([])
  svc.markRead.mockResolvedValue()
  svc.markUnread.mockResolvedValue()
  loc.getLocalReadIds.mockResolvedValue([])
  loc.setLocalReadIds.mockResolvedValue()
  loc.clearLocalReadIds.mockResolvedValue()
})

const state = () => useAnnouncementStore.getState()

describe('refresh', () => {
  it('signed out: loads items and local read ids', async () => {
    loc.getLocalReadIds.mockResolvedValue(['a'])
    await state().refresh(null)
    expect(state().items).toEqual([A, B])
    expect(state().readIds).toEqual(['a'])
    expect(svc.fetchReadIds).not.toHaveBeenCalled()
  })

  it('signed in: merges local reads to the server, clears them, then loads remote', async () => {
    loc.getLocalReadIds.mockResolvedValue(['a'])
    svc.fetchReadIds.mockResolvedValue(['a', 'b'])
    await state().refresh('u1')
    expect(svc.markRead).toHaveBeenCalledWith('u1', ['a'])
    expect(loc.clearLocalReadIds).toHaveBeenCalled()
    expect(state().readIds).toEqual(['a', 'b'])
    expect(state().userId).toBe('u1')
  })

  it('is throttled for the same user unless forced', async () => {
    await state().refresh('u1')
    await state().refresh('u1')
    expect(svc.fetchPublished).toHaveBeenCalledTimes(1)
    await state().refresh('u1', { force: true })
    expect(svc.fetchPublished).toHaveBeenCalledTimes(2)
  })

  it('always refreshes when the user changes', async () => {
    await state().refresh('u1')
    await state().refresh(null)
    expect(svc.fetchPublished).toHaveBeenCalledTimes(2)
  })

  it('keeps previous items when the fetch fails', async () => {
    useAnnouncementStore.setState({ items: [A] })
    svc.fetchPublished.mockRejectedValue(new Error('offline'))
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    await state().refresh('u1', { force: true })
    expect(state().items).toEqual([A])
  })
})

describe('selectors', () => {
  it('count and latest unread', () => {
    useAnnouncementStore.setState({ items: [A, B], readIds: ['b'] })
    expect(selectUnreadCount(state())).toBe(1)
    expect(selectLatestUnread(state())).toBe(A)
  })
  it('latest unread is null when all read', () => {
    useAnnouncementStore.setState({ items: [A], readIds: ['a'] })
    expect(selectLatestUnread(state())).toBeNull()
  })
})

describe('setRead', () => {
  it('signed in: optimistic read then server write', async () => {
    useAnnouncementStore.setState({ items: [A, B], userId: 'u1' })
    await state().setRead('a', true)
    expect(state().readIds).toEqual(['a'])
    expect(svc.markRead).toHaveBeenCalledWith('u1', ['a'])
  })

  it('signed in: mark unread deletes the receipt', async () => {
    useAnnouncementStore.setState({ items: [A], readIds: ['a'], userId: 'u1' })
    await state().setRead('a', false)
    expect(state().readIds).toEqual([])
    expect(svc.markUnread).toHaveBeenCalledWith('u1', 'a')
  })

  it('rolls back when the server write fails', async () => {
    useAnnouncementStore.setState({ items: [A], userId: 'u1' })
    svc.markRead.mockRejectedValue(new Error('nope'))
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    await state().setRead('a', true)
    expect(state().readIds).toEqual([])
  })

  it('signed out: persists locally', async () => {
    useAnnouncementStore.setState({ items: [A] })
    await state().setRead('a', true)
    expect(loc.setLocalReadIds).toHaveBeenCalledWith(['a'])
  })

  it('no-op when already in the requested state', async () => {
    useAnnouncementStore.setState({ items: [A], readIds: ['a'], userId: 'u1' })
    await state().setRead('a', true)
    expect(svc.markRead).not.toHaveBeenCalled()
  })
})

describe('markAllRead', () => {
  it('marks every unread item in one write', async () => {
    useAnnouncementStore.setState({ items: [A, B], userId: 'u1' })
    await state().markAllRead()
    expect(svc.markRead).toHaveBeenCalledWith('u1', ['b', 'a'])
    expect(selectUnreadCount(state())).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/store/__tests__/announcementStore.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/store/announcementStore.ts
import { create } from 'zustand'
import type { Announcement } from '../types/announcement'
import { unreadOf } from '../utils/announcements'
import {
  fetchPublished, fetchReadIds, markRead, markUnread,
} from '../services/announcementService'
import {
  getLocalReadIds, setLocalReadIds, clearLocalReadIds,
} from '../services/announcementReadsLocal'

const REFRESH_THROTTLE_MS = 5 * 60 * 1000

interface AnnouncementState {
  items: Announcement[]
  readIds: string[]
  userId: string | null
  lastRefreshAt: number
  refresh: (userId: string | null, opts?: { force?: boolean }) => Promise<void>
  setRead: (id: string, read: boolean) => Promise<void>
  markAllRead: () => Promise<void>
}

// Signed-in: fold any reads made while signed out into the server set, once.
async function loadRemoteReadIds(userId: string): Promise<string[]> {
  const local = await getLocalReadIds()
  if (local.length > 0) {
    await markRead(userId, local)
    await clearLocalReadIds()
  }
  return fetchReadIds()
}

async function persistReads(userId: string | null, next: string[], changed: string[], read: boolean) {
  if (!userId) return setLocalReadIds(next)
  if (read) return markRead(userId, changed)
  return Promise.all(changed.map(id => markUnread(userId, id))).then(() => undefined)
}

export const useAnnouncementStore = create<AnnouncementState>((set, get) => {
  // Optimistic update with rollback; read receipts are non-critical, so a
  // failure is logged and reverted rather than surfaced to the user.
  async function applyReads(ids: string[], read: boolean) {
    const prev = get().readIds
    const changed = read ? ids.filter(id => !prev.includes(id)) : ids.filter(id => prev.includes(id))
    if (changed.length === 0) return
    const next = read ? [...prev, ...changed] : prev.filter(id => !changed.includes(id))
    set({ readIds: next })
    try {
      await persistReads(get().userId, next, changed, read)
    } catch (e: unknown) {
      console.warn('[announcements] read state write failed, reverting:', e)
      set({ readIds: prev })
    }
  }

  return {
    items: [],
    readIds: [],
    userId: null,
    lastRefreshAt: 0,

    async refresh(userId, opts = {}) {
      const { userId: current, lastRefreshAt } = get()
      const fresh = Date.now() - lastRefreshAt < REFRESH_THROTTLE_MS
      if (!opts.force && userId === current && fresh) return
      try {
        const items = await fetchPublished()
        const readIds = userId ? await loadRemoteReadIds(userId) : await getLocalReadIds()
        set({ items, readIds, userId, lastRefreshAt: Date.now() })
      } catch (e: unknown) {
        console.warn('[announcements] refresh failed:', e)
      }
    },

    setRead: (id, read) => applyReads([id], read),

    markAllRead: () => {
      const { items, readIds } = get()
      return applyReads(unreadOf(items, readIds).map(a => a.id), true)
    },
  }
})

// Selectors return primitives or existing references (Zustand v5 re-renders
// forever on a fresh array per call).
export const selectUnreadCount = (s: AnnouncementState): number =>
  unreadOf(s.items, s.readIds).length

export const selectLatestUnread = (s: AnnouncementState): Announcement | null =>
  unreadOf(s.items, s.readIds)[0] ?? null
```

- [ ] **Step 4: Run to verify pass**

Run: `npx jest src/store/__tests__/announcementStore.test.ts`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/store/announcementStore.ts src/store/__tests__/announcementStore.test.ts
git commit -m "feat: announcement store with optimistic read/unread and sign-in merge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Foreground hook and refresh wiring

**Files:**
- Create: `src/hooks/useAppForeground.ts`
- Modify: `app/_layout.tsx`

Thin glue around `AppState`; the Jest RN mock has no `AppState`, so this is verified manually in Task 17.

- [ ] **Step 1: Create the hook**

```ts
// src/hooks/useAppForeground.ts
import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

// Runs `onForeground` each time the app moves from background/inactive to
// active. Callers own their own throttling.
export function useAppForeground(onForeground: () => void): void {
  const callback = useRef(onForeground)
  callback.current = onForeground

  useEffect(() => {
    let previous: AppStateStatus = AppState.currentState
    const sub = AppState.addEventListener('change', next => {
      if (previous !== 'active' && next === 'active') callback.current()
      previous = next
    })
    return () => sub.remove()
  }, [])
}
```

- [ ] **Step 2: Wire refresh into `app/_layout.tsx`**

Add imports next to the existing store imports:

```ts
import { useAnnouncementStore } from '../src/store/announcementStore'
import { useAppForeground } from '../src/hooks/useAppForeground'
```

Inside `RootLayout`, directly after the `maybeShowReminder` `useEffect` block (before `if (!fontsLoaded && !fontError) return null`), add:

```ts
  // Announcements: load once the app is ready, again whenever the signed-in
  // user changes (read receipts switch between local and server), and on
  // every return to the foreground (store throttles to 5 min).
  const userId = session?.user.id ?? null
  useEffect(() => {
    if (ready) useAnnouncementStore.getState().refresh(userId)
  }, [ready, userId])

  useAppForeground(() => {
    const currentUserId = useAuthStore.getState().session?.user.id ?? null
    useAnnouncementStore.getState().refresh(currentUserId)
  })
```

- [ ] **Step 3: Type-check and run the suite**

Run: `npx tsc --noEmit 2>&1 | grep -E "useAppForeground|_layout.tsx|announcement" ; npx jest 2>&1 | tail -4`
Expected: no tsc lines for these files; Jest all green.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAppForeground.ts app/_layout.tsx
git commit -m "feat: refresh announcements on launch, sign-in change, and foreground

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Tab bar height helper

**Files:**
- Create: `src/utils/tabBar.ts`
- Test: `src/utils/__tests__/tabBar.test.ts`
- Modify: `app/(tabs)/_layout.tsx:19-25`

- [ ] **Step 1: Write the failing test**

```ts
// src/utils/__tests__/tabBar.test.ts
import { tabBarHeight, tabBarPaddingBottom } from '../tabBar'

it('android adds the gesture inset to height and padding', () => {
  expect(tabBarHeight(24, true)).toBe(88)
  expect(tabBarPaddingBottom(24, true)).toBe(36)
})

it('ios uses fixed values', () => {
  expect(tabBarHeight(34, false)).toBe(60)
  expect(tabBarPaddingBottom(34, false)).toBe(8)
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/utils/__tests__/tabBar.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/utils/tabBar.ts
// Single source for the tab bar's size. The floating announcement banner sits
// just above it, so both must agree.
export function tabBarHeight(bottomInset: number, isAndroid: boolean): number {
  return isAndroid ? 64 + bottomInset : 60
}

export function tabBarPaddingBottom(bottomInset: number, isAndroid: boolean): number {
  return isAndroid ? 12 + bottomInset : 8
}
```

- [ ] **Step 4: Use it in the tabs layout**

In `app/(tabs)/_layout.tsx`, add `import { tabBarHeight, tabBarPaddingBottom } from '../../src/utils/tabBar'` and replace:

```ts
          height: isAndroid ? 64 + insets.bottom : 60,
          paddingBottom: isAndroid ? 12 + insets.bottom : 8,
```

with:

```ts
          height: tabBarHeight(insets.bottom, isAndroid),
          paddingBottom: tabBarPaddingBottom(insets.bottom, isAndroid),
```

- [ ] **Step 5: Run to verify pass**

Run: `npx jest src/utils/__tests__/tabBar.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/utils/tabBar.ts src/utils/__tests__/tabBar.test.ts "app/(tabs)/_layout.tsx"
git commit -m "refactor: extract tab bar height into a shared helper

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Announcement banner

Placement decision (refines the spec): the banner **floats just above the tab bar**, not under the top safe area. The Atlas tab is a full-bleed map with its own top controls; a top strip would cover them on the most-used screen.

**Files:**
- Create: `src/components/AnnouncementBanner.tsx`
- Test: `src/components/__tests__/AnnouncementBanner.test.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/__tests__/AnnouncementBanner.test.tsx
import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { AnnouncementBanner } from '../AnnouncementBanner'
import type { Announcement } from '../../types/announcement'

const A: Announcement = {
  id: 'a1', title: 'New map styles are live', body: 'b',
  publishedAt: '2026-09-22T00:00:00Z', createdAt: '2026-09-22T00:00:00Z', updatedAt: '2026-09-22T00:00:00Z',
}

it('renders nothing without an announcement', () => {
  const { queryByTestId } = render(
    <AnnouncementBanner announcement={null} bottomOffset={60} onOpen={jest.fn()} onDismiss={jest.fn()} />
  )
  expect(queryByTestId('announcement-banner')).toBeNull()
})

it('shows the title', () => {
  const { getByText } = render(
    <AnnouncementBanner announcement={A} bottomOffset={60} onOpen={jest.fn()} onDismiss={jest.fn()} />
  )
  expect(getByText('New map styles are live')).toBeTruthy()
})

it('open and dismiss pass the id', () => {
  const onOpen = jest.fn()
  const onDismiss = jest.fn()
  const { getByTestId } = render(
    <AnnouncementBanner announcement={A} bottomOffset={60} onOpen={onOpen} onDismiss={onDismiss} />
  )
  fireEvent.press(getByTestId('announcement-banner-open'))
  fireEvent.press(getByTestId('announcement-banner-dismiss'))
  expect(onOpen).toHaveBeenCalledWith('a1')
  expect(onDismiss).toHaveBeenCalledWith('a1')
})

it('inline preview is not absolutely positioned', () => {
  const { getByTestId } = render(
    <AnnouncementBanner announcement={A} inline onOpen={jest.fn()} onDismiss={jest.fn()} />
  )
  const style = [getByTestId('announcement-banner').props.style].flat()
  expect(style.some((s: { position?: string } | undefined) => s?.position === 'absolute')).toBe(false)
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/components/__tests__/AnnouncementBanner.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```tsx
// src/components/AnnouncementBanner.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { Announcement } from '../types/announcement'
import { colors, spacing, radius } from '../utils/theme'

interface AnnouncementBannerProps {
  announcement: Announcement | null
  onOpen: (id: string) => void
  onDismiss: (id: string) => void
  // Floating mode: distance from the screen bottom (the tab bar height).
  bottomOffset?: number
  // Inline mode: in-flow preview for the Founder editor.
  inline?: boolean
}

export function AnnouncementBanner({
  announcement, onOpen, onDismiss, bottomOffset = 0, inline = false,
}: AnnouncementBannerProps) {
  if (!announcement) return null
  const position = inline ? null : [styles.floating, { bottom: bottomOffset + spacing.sm }]

  return (
    <View testID="announcement-banner" style={[styles.banner, position]}>
      <TouchableOpacity
        testID="announcement-banner-open"
        style={styles.open}
        onPress={() => onOpen(announcement.id)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Announcement: ${announcement.title}. Open`}
      >
        <Ionicons name="megaphone-outline" size={18} color={colors.amber} />
        <Text style={styles.title} numberOfLines={1}>{announcement.title}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="announcement-banner-dismiss"
        onPress={() => onDismiss(announcement.id)}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Dismiss announcement"
      >
        <Ionicons name="close" size={18} color={colors.creamMuted} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.amberDim,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  floating: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.cream },
})
```

- [ ] **Step 4: Run to verify pass**

Run: `npx jest src/components/__tests__/AnnouncementBanner.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 5: Mount it in the tabs layout with a Profile badge**

Replace the whole of `app/(tabs)/_layout.tsx` with (same tabs and options as today; changes are the wrapper `View`, the banner, and the profile badge):

```tsx
import { Tabs, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Platform, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../../src/utils/theme'
import { useNotificationStore } from '../../src/store/notificationStore'
import {
  useAnnouncementStore, selectUnreadCount, selectLatestUnread,
} from '../../src/store/announcementStore'
import { AnnouncementBanner } from '../../src/components/AnnouncementBanner'
import { tabBarHeight, tabBarPaddingBottom } from '../../src/utils/tabBar'

const badgeStyle = { backgroundColor: colors.amber, color: colors.bg, fontSize: 10, minWidth: 16, height: 16, lineHeight: 16 }

export default function TabsLayout() {
  const { pendingFriendCount } = useNotificationStore()
  const unreadCount = useAnnouncementStore(selectUnreadCount)
  const latestUnread = useAnnouncementStore(selectLatestUnread)
  const setRead = useAnnouncementStore(s => s.setRead)
  const insets = useSafeAreaInsets()
  const isAndroid = Platform.OS === 'android'

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="atlas"
        screenOptions={{
          tabBarActiveTintColor: colors.amber,
          tabBarInactiveTintColor: colors.creamDim,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.surfaceBorder,
            borderTopWidth: 1,
            height: tabBarHeight(insets.bottom, isAndroid),
            paddingBottom: tabBarPaddingBottom(insets.bottom, isAndroid),
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.5,
          },
        }}
      >
        {/* KEEP every existing <Tabs.Screen> block exactly as it is today
            (atlas, explore, mi-gente, profile). Only the profile screen's
            options gain the two tabBarBadge lines below. */}
      </Tabs>
      <AnnouncementBanner
        announcement={latestUnread}
        bottomOffset={tabBarHeight(insets.bottom, isAndroid)}
        onOpen={id => {
          setRead(id, true)
          router.push({ pathname: '/announcements', params: { id } })
        }}
        onDismiss={id => setRead(id, true)}
      />
    </View>
  )
}
```

Copy the four existing `<Tabs.Screen …/>` blocks verbatim into the `<Tabs>` body (replacing the comment). Replace the mi-gente `tabBarBadgeStyle` object literal with `badgeStyle`, and add to the profile screen's `options`:

```ts
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: badgeStyle,
```

- [ ] **Step 6: Type-check and run suite**

Run: `npx tsc --noEmit 2>&1 | grep -E "\(tabs\)/_layout|AnnouncementBanner" ; npx jest 2>&1 | tail -4`
Expected: no tsc lines; Jest green. (`/announcements` will be a typed-route error until Task 10 creates the screen. If tsc flags it, finish Task 10 before committing.)

- [ ] **Step 7: Commit**

```bash
git add src/components/AnnouncementBanner.tsx src/components/__tests__/AnnouncementBanner.test.tsx "app/(tabs)/_layout.tsx"
git commit -m "feat: floating announcement banner and profile tab badge

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Announcements screen (users)

**Files:**
- Create: `app/announcements.tsx`
- Modify: `app/_layout.tsx` (register route)

UI screen; logic is already covered by store tests. Verified manually in Task 17.

- [ ] **Step 1: Create the screen**

```tsx
// app/announcements.tsx
import { useMemo, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAnnouncementStore, selectUnreadCount } from '../src/store/announcementStore'
import { useAuthStore } from '../src/store/authStore'
import { sortNewestFirst } from '../src/utils/announcements'
import type { Announcement } from '../src/types/announcement'
import { colors, spacing, radius, fonts } from '../src/utils/theme'

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : ''
}

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets()
  const { id: openId } = useLocalSearchParams<{ id?: string }>()
  const items = useAnnouncementStore(s => s.items)
  const readIds = useAnnouncementStore(s => s.readIds)
  const unreadCount = useAnnouncementStore(selectUnreadCount)
  const { setRead, markAllRead, refresh } = useAnnouncementStore.getState()
  const [expandedId, setExpandedId] = useState<string | null>(openId ?? null)
  const [refreshing, setRefreshing] = useState(false)

  const sorted = useMemo(() => sortNewestFirst(items), [items])
  const readSet = useMemo(() => new Set(readIds), [readIds])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh(useAuthStore.getState().session?.user.id ?? null, { force: true })
    setRefreshing(false)
  }, [refresh])

  function toggleExpanded(a: Announcement) {
    const opening = expandedId !== a.id
    setExpandedId(opening ? a.id : null)
    if (opening && !readSet.has(a.id)) setRead(a.id, true)
  }

  function renderItem({ item }: { item: Announcement }) {
    const unread = !readSet.has(item.id)
    const expanded = expandedId === item.id
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => toggleExpanded(item)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title}`}
      >
        <View style={styles.rowHeader}>
          <View style={[styles.dot, !unread && styles.dotHidden]} />
          <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={expanded ? undefined : 1}>
            {item.title}
          </Text>
          <Text style={styles.date}>{formatDate(item.publishedAt)}</Text>
        </View>
        {expanded && (
          <View style={styles.expanded}>
            <Text style={styles.body}>{item.body}</Text>
            <TouchableOpacity onPress={() => setRead(item.id, unread)} hitSlop={8}>
              <Text style={styles.toggle}>{unread ? 'Mark as read' : 'Mark as unread'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.cream} />
        </TouchableOpacity>
        <Text style={styles.heading}>Announcements</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} hitSlop={8}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 24 }} />}
      </View>
      <FlatList
        data={sorted}
        keyExtractor={a => a.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.lg }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />}
        ListEmptyComponent={<Text style={styles.empty}>No announcements yet.</Text>}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  heading: { fontFamily: fonts.display, fontSize: 20, color: colors.cream },
  markAll: { fontSize: 13, fontWeight: '600', color: colors.amber },
  row: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.surfaceBorder },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.amber },
  dotHidden: { backgroundColor: 'transparent' },
  title: { flex: 1, fontSize: 15, color: colors.creamMuted },
  titleUnread: { color: colors.cream, fontWeight: '700' },
  date: { fontSize: 11, color: colors.creamDim },
  expanded: { marginTop: spacing.sm, paddingLeft: 16, gap: spacing.sm },
  body: { fontSize: 14, lineHeight: 20, color: colors.cream },
  toggle: { fontSize: 12, fontWeight: '600', color: colors.amber },
  separator: { height: spacing.sm },
  empty: { textAlign: 'center', color: colors.creamDim, marginTop: spacing.xl },
})
```

- [ ] **Step 2: Register the route**

In `app/_layout.tsx`, inside `<Stack>`, after the `mi-gente/map/[username]` screen, add:

```tsx
        <Stack.Screen name="announcements" options={{ headerShown: false }} />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -E "announcements|_layout" ; npx jest 2>&1 | tail -4`
Expected: no tsc lines; Jest green.

- [ ] **Step 4: Commit**

```bash
git add app/announcements.tsx app/_layout.tsx
git commit -m "feat: announcements screen with read/unread and mark all read

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Founder list and editor

**Files:**
- Create: `app/admin/announcements.tsx`
- Create: `app/admin/announcement-edit.tsx`
- Modify: `app/_layout.tsx` (register routes)
- Modify: `app/(tabs)/profile.tsx` (Founder row)

- [ ] **Step 1: Founder list screen**

```tsx
// app/admin/announcements.tsx
import { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/authStore'
import { listAll } from '../../src/services/announcementService'
import type { Announcement } from '../../src/types/announcement'
import { colors, spacing, radius, fonts } from '../../src/utils/theme'

export default function FounderAnnouncementsScreen() {
  const { profile } = useAuthStore()
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setItems(await listAll())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load announcements')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(useCallback(() => {
    if (profile?.is_admin) load()
    else setLoading(false)
  }, [profile?.is_admin, load]))

  if (!profile?.is_admin) {
    return <View style={[styles.container, styles.center]}><Text style={styles.muted}>Admin access required</Text></View>
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.cream} />
        </TouchableOpacity>
        <Text style={styles.heading}>Announcements</Text>
        <TouchableOpacity onPress={() => router.push('/admin/announcement-edit')} hitSlop={8} accessibilityLabel="New announcement">
          <Ionicons name="add" size={26} color={colors.amber} />
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.amber} size="large" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={a => a.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.lg }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor={colors.amber} />}
          ListHeaderComponent={error ? <Text style={styles.error}>{error}</Text> : null}
          ListEmptyComponent={<Text style={[styles.muted, { textAlign: 'center', marginTop: spacing.xl }]}>No announcements yet. Tap + to write one.</Text>}
          renderItem={({ item }) => {
            const sent = item.publishedAt !== null
            return (
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.push({ pathname: '/admin/announcement-edit', params: { id: item.id } })}
                activeOpacity={0.7}
              >
                <View style={[styles.chip, sent ? styles.chipSent : styles.chipDraft]}>
                  <Text style={[styles.chipText, sent && { color: colors.bg }]}>{sent ? 'Sent' : 'Draft'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.muted}>
                    {sent ? `Sent ${new Date(item.publishedAt!).toLocaleDateString()}` : `Edited ${new Date(item.updatedAt).toLocaleDateString()}`}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.creamDim} />
              </TouchableOpacity>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  heading: { fontFamily: fonts.display, fontSize: 20, color: colors.cream },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  chip: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  chipDraft: { borderWidth: 1, borderColor: colors.creamDim },
  chipSent: { backgroundColor: colors.amber },
  chipText: { fontSize: 11, fontWeight: '700', color: colors.creamMuted },
  title: { fontSize: 15, color: colors.cream, fontWeight: '600' },
  muted: { fontSize: 12, color: colors.creamDim, marginTop: 2 },
  error: { color: colors.error, marginBottom: spacing.sm },
})
```

- [ ] **Step 2: Founder editor screen**

```tsx
// app/admin/announcement-edit.tsx
import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native'
import { router, useLocalSearchParams, useNavigation } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/authStore'
import { useAnnouncementStore } from '../../src/store/announcementStore'
import {
  fetchById, createDraft, updateAnnouncement, sendAnnouncement, deleteAnnouncement,
} from '../../src/services/announcementService'
import { validateDraft } from '../../src/utils/announcements'
import {
  ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX, type Announcement,
} from '../../src/types/announcement'
import { AnnouncementBanner } from '../../src/components/AnnouncementBanner'
import { ConfirmModal } from '../../src/components/ConfirmModal'
import { colors, spacing, radius, fonts } from '../../src/utils/theme'

type Pending = 'send' | 'delete' | 'discard' | null

function refreshFeed() {
  const userId = useAuthStore.getState().session?.user.id ?? null
  return useAnnouncementStore.getState().refresh(userId, { force: true })
}

export default function AnnouncementEditScreen() {
  const { id: paramId } = useLocalSearchParams<{ id?: string }>()
  const { profile } = useAuthStore()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  const [saved, setSaved] = useState<Announcement | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(Boolean(paramId))
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<Pending>(null)
  const [leaveAction, setLeaveAction] = useState<unknown>(null)
  // Set right before re-dispatching a confirmed discard, so the guard below
  // (which may still hold a stale `dirty`) lets that navigation through.
  const allowLeave = useRef(false)

  const dirty = title !== (saved?.title ?? '') || body !== (saved?.body ?? '')
  const isSent = saved?.publishedAt != null
  const validation = validateDraft(title, body)

  useEffect(() => {
    if (!paramId) return
    fetchById(paramId)
      .then(a => {
        if (!a) { Alert.alert('Not found', 'This announcement was deleted.'); router.back(); return }
        setSaved(a); setTitle(a.title); setBody(a.body)
      })
      .catch((e: unknown) => Alert.alert('Could not load', e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [paramId])

  // Guard back navigation when there are unsaved edits.
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: { preventDefault: () => void; data: { action: unknown } }) => {
      if (!dirty || busy || allowLeave.current) return
      e.preventDefault()
      setLeaveAction(e.data.action)
      setPending('discard')
    })
    return unsub
  }, [navigation, dirty, busy])

  async function persist(): Promise<Announcement> {
    const input = { title, body }
    const next = saved ? await updateAnnouncement(saved.id, input) : await createDraft(input)
    setSaved(next); setTitle(next.title); setBody(next.body)
    return next
  }

  async function run(action: () => Promise<void>, failTitle: string) {
    setBusy(true)
    try {
      await action()
    } catch (e: unknown) {
      Alert.alert(failTitle, e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const onSave = () => run(async () => {
    await persist()
    if (isSent) await refreshFeed()
  }, 'Could not save')

  const onSend = () => run(async () => {
    setPending(null)
    const draft = dirty || !saved ? await persist() : saved
    await sendAnnouncement(draft.id)
    await refreshFeed()
    router.back()
  }, 'Could not send')

  const onDelete = () => run(async () => {
    setPending(null)
    if (saved) await deleteAnnouncement(saved.id)
    await refreshFeed()
    setTitle(''); setBody(''); setSaved(null)
    router.back()
  }, 'Could not delete')

  if (!profile?.is_admin) {
    return <View style={[styles.container, styles.center]}><Text style={styles.muted}>Admin access required</Text></View>
  }
  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator color={colors.amber} size="large" /></View>
  }

  const preview: Announcement | null = title.trim()
    ? { id: 'preview', title: title.trim(), body, publishedAt: null, createdAt: '', updatedAt: '' }
    : null

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.cream} />
        </TouchableOpacity>
        <Text style={styles.heading}>{saved ? (isSent ? 'Edit sent' : 'Edit draft') : 'New announcement'}</Text>
        {saved ? (
          <TouchableOpacity onPress={() => setPending('delete')} hitSlop={8} accessibilityLabel="Delete announcement" disabled={busy}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </TouchableOpacity>
        ) : <View style={{ width: 22 }} />}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
        <View>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Title</Text>
            <Text style={styles.counter}>{title.trim().length}/{ANNOUNCEMENT_TITLE_MAX}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="New map styles are live"
            placeholderTextColor={colors.creamDim}
            maxLength={ANNOUNCEMENT_TITLE_MAX + 20}
          />
        </View>
        <View>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Message</Text>
            <Text style={styles.counter}>{body.trim().length}/{ANNOUNCEMENT_BODY_MAX}</Text>
          </View>
          <TextInput
            style={[styles.input, styles.bodyInput]}
            value={body}
            onChangeText={setBody}
            placeholder="What changed and why it matters."
            placeholderTextColor={colors.creamDim}
            multiline
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.label}>Banner preview</Text>
        {preview
          ? <AnnouncementBanner announcement={preview} inline onOpen={() => {}} onDismiss={() => {}} />
          : <Text style={styles.muted}>Add a title to see the banner.</Text>}

        {isSent && <Text style={styles.muted}>Already sent. Saving updates it in place without marking it unread for anyone.</Text>}
        {validation && (title || body) ? <Text style={styles.error}>{validation}</Text> : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.secondaryBtn, (!dirty || !!validation || busy) && styles.disabled]}
            onPress={onSave}
            disabled={!dirty || !!validation || busy}
          >
            <Text style={styles.secondaryText}>{isSent ? 'Save changes' : 'Save draft'}</Text>
          </TouchableOpacity>
          {!isSent && (
            <TouchableOpacity
              style={[styles.primaryBtn, (!!validation || busy) && styles.disabled]}
              onPress={() => setPending('send')}
              disabled={!!validation || busy}
            >
              {busy ? <ActivityIndicator color={colors.bg} /> : <Text style={styles.primaryText}>Send</Text>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={pending === 'send'}
        title="Send to everyone?"
        body="Everyone will see this banner the next time they open TacoAtlas. You can still edit or delete it after."
        confirmLabel="Send"
        onConfirm={onSend}
        onCancel={() => setPending(null)}
      />
      <ConfirmModal
        visible={pending === 'delete'}
        title="Delete announcement?"
        body={isSent ? 'It disappears for everyone. This cannot be undone.' : 'This draft will be gone for good.'}
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
        onCancel={() => setPending(null)}
      />
      <ConfirmModal
        visible={pending === 'discard'}
        title="Discard changes?"
        body="Your unsaved edits will be lost."
        confirmLabel="Discard"
        destructive
        onConfirm={() => {
          setPending(null)
          setTitle(saved?.title ?? ''); setBody(saved?.body ?? '')
          // Re-dispatch the navigation the user asked for, now that it's clean.
          allowLeave.current = true
          if (leaveAction) navigation.dispatch(leaveAction as Parameters<typeof navigation.dispatch>[0])
        }}
        onCancel={() => setPending(null)}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  heading: { fontFamily: fonts.display, fontSize: 20, color: colors.cream },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  label: { fontSize: 11, fontWeight: '700', color: colors.creamDim, letterSpacing: 1, textTransform: 'uppercase' },
  counter: { fontSize: 11, color: colors.creamDim },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.surfaceBorder,
    color: colors.cream, fontSize: 15, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2,
  },
  bodyInput: { minHeight: 140 },
  muted: { fontSize: 12, color: colors.creamDim },
  error: { fontSize: 12, color: colors.error },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  primaryBtn: { flex: 1, backgroundColor: colors.amber, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  primaryText: { color: colors.bg, fontWeight: '700', fontSize: 15 },
  secondaryBtn: { flex: 1, borderColor: colors.amberDim, borderWidth: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center' },
  secondaryText: { color: colors.amber, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.4 },
})
```

Note on the discard guard: after `onDelete`/`onSend` succeed, `busy` is still `true` when `router.back()` fires, so the `beforeRemove` listener lets it through.

- [ ] **Step 3: Register both routes**

In `app/_layout.tsx` `<Stack>`, after the `announcements` screen:

```tsx
        <Stack.Screen name="admin/announcements" options={{ headerShown: false }} />
        <Stack.Screen name="admin/announcement-edit" options={{ headerShown: false }} />
```

- [ ] **Step 4: Add the Founder row in Settings**

In `app/(tabs)/profile.tsx`, inside the Founder `styles.card`, directly after the "Founder View" `TouchableOpacity` (the one with `router.push('/admin/activity')`), insert:

```tsx
              <TouchableOpacity
                style={[styles.accountRow, styles.accountRowBorder]}
                onPress={() => router.push('/admin/announcements')}
                activeOpacity={0.7}
              >
                <Ionicons name="megaphone-outline" size={18} color={colors.amber} />
                <View style={styles.accountRowText}>
                  <Text style={styles.accountLabel}>Announcements</Text>
                  <Text style={styles.accountSub}>Write, send, edit and delete</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.creamDim} />
              </TouchableOpacity>
```

If the row you inserted is now the last in the card, drop `styles.accountRowBorder` from it and add it to the row above; otherwise leave as written.

- [ ] **Step 5: Type-check and suite**

Run: `npx tsc --noEmit 2>&1 | grep -E "admin/announcement|profile.tsx|_layout" ; npx jest 2>&1 | tail -4`
Expected: no tsc lines; Jest green.

- [ ] **Step 6: Commit**

```bash
git add app/admin/announcements.tsx app/admin/announcement-edit.tsx app/_layout.tsx "app/(tabs)/profile.tsx"
git commit -m "feat: founder screens to create, edit, send and delete announcements

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Update prompt pure logic

**Files:**
- Create: `src/utils/updatePrompt.ts`
- Test: `src/utils/__tests__/updatePrompt.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/utils/__tests__/updatePrompt.test.ts
import { updateStatusLabel, shouldShowUpdatePrompt } from '../updatePrompt'

describe('updateStatusLabel', () => {
  it.each([
    ['idle', null],
    ['checking', 'Checking for updates…'],
    ['downloading', 'Downloading update…'],
    ['ready', 'Update ready. Tap to restart.'],
    ['upToDate', "You're up to date"],
    ['error', 'Could not check for updates'],
  ] as const)('%s', (status, label) => {
    expect(updateStatusLabel(status)).toBe(label)
  })
})

describe('shouldShowUpdatePrompt', () => {
  const base = { status: 'ready' as const, dismissed: false, signedIn: true, pathname: '/atlas' }

  it('shows when a signed-in user has a ready update', () => {
    expect(shouldShowUpdatePrompt(base)).toBe(true)
  })
  it('hides when signed out', () => {
    expect(shouldShowUpdatePrompt({ ...base, signedIn: false })).toBe(false)
  })
  it('hides after Later', () => {
    expect(shouldShowUpdatePrompt({ ...base, dismissed: true })).toBe(false)
  })
  it('hides unless ready', () => {
    expect(shouldShowUpdatePrompt({ ...base, status: 'downloading' })).toBe(false)
  })
  it.each(['/review/add', '/pin/add'])('waits while %s is open', pathname => {
    expect(shouldShowUpdatePrompt({ ...base, pathname })).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/utils/__tests__/updatePrompt.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// src/utils/updatePrompt.ts
export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'upToDate' | 'error'

const LABELS: Record<UpdateStatus, string | null> = {
  idle: null,
  checking: 'Checking for updates…',
  downloading: 'Downloading update…',
  ready: 'Update ready. Tap to restart.',
  upToDate: "You're up to date",
  error: 'Could not check for updates',
}

export function updateStatusLabel(status: UpdateStatus): string | null {
  return LABELS[status]
}

// Never interrupt someone mid-log. The prompt reappears when they leave.
const BUSY_ROUTE_PREFIXES = ['/review', '/pin']

export function shouldShowUpdatePrompt(input: {
  status: UpdateStatus
  dismissed: boolean
  signedIn: boolean
  pathname: string
}): boolean {
  if (!input.signedIn || input.dismissed || input.status !== 'ready') return false
  return !BUSY_ROUTE_PREFIXES.some(prefix => input.pathname.startsWith(prefix))
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx jest src/utils/__tests__/updatePrompt.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/utils/updatePrompt.ts src/utils/__tests__/updatePrompt.test.ts
git commit -m "feat: update status labels and prompt visibility rule

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Update store

**Files:**
- Modify: `src/__mocks__/expo-updates.ts`
- Create: `src/store/updateStore.ts`
- Test: `src/store/__tests__/updateStore.test.ts`

- [ ] **Step 1: Extend the expo-updates mock**

Replace `src/__mocks__/expo-updates.ts` with:

```ts
export const isEnabled = false
export const isEmbeddedLaunch = true
export const updateId: string | null = null
export const runtimeVersion: string | null = null
export const channel: string | null = null
export const createdAt: Date | null = null
export const checkForUpdateAsync = jest.fn(async () => ({ isAvailable: false }))
export const fetchUpdateAsync = jest.fn(async () => ({ isNew: false }))
export const reloadAsync = jest.fn(async () => undefined)
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/store/__tests__/updateStore.test.ts
type Updates = {
  isEnabled: boolean
  checkForUpdateAsync: jest.Mock
  fetchUpdateAsync: jest.Mock
  reloadAsync: jest.Mock
}

function load(isEnabled = true) {
  let mod!: typeof import('../updateStore')
  let updates!: Updates
  jest.isolateModules(() => {
    updates = {
      isEnabled,
      checkForUpdateAsync: jest.fn(async () => ({ isAvailable: true })),
      fetchUpdateAsync: jest.fn(async () => ({ isNew: true })),
      reloadAsync: jest.fn(async () => undefined),
    }
    jest.doMock('expo-updates', () => updates)
    mod = require('../updateStore')
  })
  return { store: mod.useUpdateStore, updates }
}

beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}))

it('does nothing when expo-updates is disabled (dev / Expo Go)', async () => {
  const { store, updates } = load(false)
  await store.getState().check()
  expect(updates.checkForUpdateAsync).not.toHaveBeenCalled()
  expect(store.getState().status).toBe('idle')
})

it('checks, downloads, and becomes ready', async () => {
  const { store, updates } = load()
  await store.getState().check()
  expect(updates.fetchUpdateAsync).toHaveBeenCalled()
  expect(store.getState().status).toBe('ready')
})

it('reports up to date when nothing is available', async () => {
  const { store, updates } = load()
  updates.checkForUpdateAsync.mockResolvedValueOnce({ isAvailable: false })
  await store.getState().check()
  expect(updates.fetchUpdateAsync).not.toHaveBeenCalled()
  expect(store.getState().status).toBe('upToDate')
})

it('throttles unforced checks for 30 minutes', async () => {
  const { store, updates } = load()
  updates.checkForUpdateAsync.mockResolvedValue({ isAvailable: false })
  await store.getState().check()
  await store.getState().check()
  expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1)
  await store.getState().check({ force: true })
  expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(2)
})

it('sets error when the check throws', async () => {
  const { store, updates } = load()
  updates.checkForUpdateAsync.mockRejectedValueOnce(new Error('offline'))
  await store.getState().check()
  expect(store.getState().status).toBe('error')
})

it('a forced check while ready re-shows the prompt instead of re-downloading', async () => {
  const { store, updates } = load()
  await store.getState().check()
  store.getState().dismiss()
  expect(store.getState().dismissed).toBe(true)
  await store.getState().check({ force: true })
  expect(updates.checkForUpdateAsync).toHaveBeenCalledTimes(1)
  expect(store.getState().dismissed).toBe(false)
})

it('restart reloads and reports failure', async () => {
  const { store, updates } = load()
  await expect(store.getState().restart()).resolves.toBe(true)
  updates.reloadAsync.mockRejectedValueOnce(new Error('nope'))
  await expect(store.getState().restart()).resolves.toBe(false)
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx jest src/store/__tests__/updateStore.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement**

```ts
// src/store/updateStore.ts
import { create } from 'zustand'
import * as Updates from 'expo-updates'
import type { UpdateStatus } from '../utils/updatePrompt'

const CHECK_THROTTLE_MS = 30 * 60 * 1000

// expo-updates is a no-op in dev and Expo Go; skip the network entirely.
function updatesActive(): boolean {
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__
  return Updates.isEnabled && !isDev
}

interface UpdateState {
  status: UpdateStatus
  dismissed: boolean
  lastCheckAt: number
  check: (opts?: { force?: boolean }) => Promise<void>
  restart: () => Promise<boolean>
  dismiss: () => void
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: 'idle',
  dismissed: false,
  lastCheckAt: 0,

  async check(opts = {}) {
    if (!updatesActive()) return
    const { status, lastCheckAt } = get()
    if (status === 'checking' || status === 'downloading') return
    if (status === 'ready') {
      if (opts.force) set({ dismissed: false })
      return
    }
    if (!opts.force && Date.now() - lastCheckAt < CHECK_THROTTLE_MS) return

    set({ status: 'checking', lastCheckAt: Date.now() })
    try {
      const result = await Updates.checkForUpdateAsync()
      if (!result.isAvailable) {
        set({ status: 'upToDate' })
        return
      }
      set({ status: 'downloading' })
      const fetched = await Updates.fetchUpdateAsync()
      set({ status: fetched.isNew ? 'ready' : 'upToDate', dismissed: false })
    } catch (e: unknown) {
      console.warn('[updates] check failed:', e)
      set({ status: 'error' })
    }
  },

  async restart() {
    try {
      await Updates.reloadAsync()
      return true
    } catch (e: unknown) {
      console.warn('[updates] reload failed:', e)
      return false
    }
  },

  // "Later": expo-updates applies the downloaded bundle on the next cold start.
  dismiss: () => set({ dismissed: true }),
}))
```

- [ ] **Step 5: Run to verify pass**

Run: `npx jest src/store/__tests__/updateStore.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add src/__mocks__/expo-updates.ts src/store/updateStore.ts src/store/__tests__/updateStore.test.ts
git commit -m "feat: OTA update store with background download and throttle

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: Update prompt component and triggers

**Files:**
- Create: `src/components/UpdateReadyPrompt.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Create the prompt**

```tsx
// src/components/UpdateReadyPrompt.tsx
import { Alert } from 'react-native'
import { usePathname } from 'expo-router'
import { ConfirmModal } from './ConfirmModal'
import { useUpdateStore } from '../store/updateStore'
import { useAuthStore } from '../store/authStore'
import { shouldShowUpdatePrompt } from '../utils/updatePrompt'

export function UpdateReadyPrompt() {
  const status = useUpdateStore(s => s.status)
  const dismissed = useUpdateStore(s => s.dismissed)
  const signedIn = useAuthStore(s => s.session !== null)
  const pathname = usePathname()
  const { restart, dismiss } = useUpdateStore.getState()

  const visible = shouldShowUpdatePrompt({ status, dismissed, signedIn, pathname })

  async function onRestart() {
    const ok = await restart()
    if (!ok) Alert.alert("Couldn't restart", 'Close and reopen TacoAtlas to finish updating.')
  }

  return (
    <ConfirmModal
      visible={visible}
      title="A fresh batch is ready"
      body="TacoAtlas has an update. Restart now to get it. It only takes a second."
      confirmLabel="Restart now"
      cancelLabel="Later"
      onConfirm={onRestart}
      onCancel={dismiss}
    />
  )
}
```

- [ ] **Step 2: Mount and trigger in `app/_layout.tsx`**

Add imports:

```ts
import { useUpdateStore } from '../src/store/updateStore'
import { UpdateReadyPrompt } from '../src/components/UpdateReadyPrompt'
```

Extend the Task 7 block: add an effect for launch/sign-in, and add the update check to the existing `useAppForeground` callback so there is still only one foreground listener:

```ts
  useEffect(() => {
    if (ready && userId) useUpdateStore.getState().check()
  }, [ready, userId])

  useAppForeground(() => {
    const currentUserId = useAuthStore.getState().session?.user.id ?? null
    useAnnouncementStore.getState().refresh(currentUserId)
    if (currentUserId) useUpdateStore.getState().check()
  })
```

In the JSX, after `{ready && <RestorePromptModal />}`, add:

```tsx
      {ready && <UpdateReadyPrompt />}
```

- [ ] **Step 3: Type-check and suite**

Run: `npx tsc --noEmit 2>&1 | grep -E "UpdateReadyPrompt|_layout" ; npx jest 2>&1 | tail -4`
Expected: no tsc lines; Jest green.

- [ ] **Step 4: Commit**

```bash
git add src/components/UpdateReadyPrompt.tsx app/_layout.tsx
git commit -m "feat: restart-to-update prompt for downloaded OTA updates

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: Version label

**Files:**
- Modify: `package.json` (dependency)
- Create: `src/utils/version.ts`
- Test: `src/utils/__tests__/version.test.ts`
- Create: `src/services/appVersion.ts`

- [ ] **Step 1: Pin expo-application as a direct dependency**

Run: `npx expo install expo-application`
Then: `npm ls expo-application`
Expected: `expo-application@55.0.15` (same version already linked via expo-notifications, so no native change). **If any other version appears, stop:** that is a native change and needs a store build. Report it before continuing.

- [ ] **Step 2: Write the failing tests**

```ts
// src/utils/__tests__/version.test.ts
import { formatVersionLabel, shortUpdateId } from '../version'

describe('formatVersionLabel', () => {
  it('version and build', () => {
    expect(formatVersionLabel('1.3.1', '52', '1.3.1')).toBe('1.3.1 (52)')
  })
  it('falls back to the config version when native is unavailable', () => {
    expect(formatVersionLabel(null, null, '1.3.1')).toBe('1.3.1')
  })
  it('omits an empty build number', () => {
    expect(formatVersionLabel('1.3.1', '', null)).toBe('1.3.1')
  })
  it('says unknown when nothing is known', () => {
    expect(formatVersionLabel(null, null, null)).toBe('unknown')
  })
})

describe('shortUpdateId', () => {
  it('first 8 hex chars without dashes', () => {
    expect(shortUpdateId('0a1b2c3d-4e5f-6789-abcd-ef0123456789')).toBe('0a1b2c3d')
  })
  it('null for null', () => {
    expect(shortUpdateId(null)).toBeNull()
  })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npx jest src/utils/__tests__/version.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement the pure helpers**

```ts
// src/utils/version.ts
// "1.3.1 (52)": store version, then the store build number (Android
// versionCode / iOS buildNumber). OTA updates never change this label; the
// short update id shown beneath it tells OTA builds apart.
export function formatVersionLabel(
  appVersion: string | null,
  buildNumber: string | null,
  fallbackVersion: string | null,
): string {
  const version = appVersion ?? fallbackVersion
  if (!version) return 'unknown'
  return buildNumber ? `${version} (${buildNumber})` : version
}

export function shortUpdateId(updateId: string | null): string | null {
  return updateId ? updateId.replace(/-/g, '').slice(0, 8) : null
}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx jest src/utils/__tests__/version.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 6: Create the native reader**

```ts
// src/services/appVersion.ts
import Constants from 'expo-constants'
import * as Updates from 'expo-updates'
import { formatVersionLabel, shortUpdateId } from '../utils/version'

// expo-application is required lazily: if a binary were ever built without
// it, the import would throw at startup. Here it only costs the build number.
function readNativeVersion(): { version: string | null; build: string | null } {
  try {
    const Application = require('expo-application') as typeof import('expo-application')
    return { version: Application.nativeApplicationVersion, build: Application.nativeBuildVersion }
  } catch (e: unknown) {
    console.warn('[version] expo-application unavailable:', e)
    return { version: null, build: null }
  }
}

export function getVersionLabel(): string {
  const { version, build } = readNativeVersion()
  return formatVersionLabel(version, build, Constants.expoConfig?.version ?? null)
}

// Null when running the bundle embedded in the store binary.
export function getOtaLabel(): string | null {
  if (Updates.isEmbeddedLaunch) return null
  return shortUpdateId(Updates.updateId)
}
```

- [ ] **Step 7: Remove the stale versionCode from app.json**

Run: `grep -n '"versionCode"' app.json`
If a line appears, delete that line (and fix the trailing comma on the line before it if needed). EAS uses the remote version source (`eas.json` `appVersionSource: "remote"`), so this value is ignored and misleading (see CHANGELOG versionCode 51 notes).
Then: `node -e "JSON.parse(require('fs').readFileSync('app.json','utf8'))" && echo ok`
Expected: `ok`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json app.json src/utils/version.ts src/utils/__tests__/version.test.ts src/services/appVersion.ts
git commit -m "feat: version label from the installed binary (1.3.1 (52))

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Extract the Settings App section

**Files:**
- Create: `src/components/settings/settingsStyles.ts`
- Create: `src/components/settings/AppSection.tsx`
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Shared row styles**

```ts
// src/components/settings/settingsStyles.ts
import { StyleSheet } from 'react-native'
import { colors, spacing, radius } from '../../utils/theme'

// Row styles shared by every Settings card (profile.tsx and extracted sections).
export const settingsStyles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: colors.creamDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.surfaceBorder },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm + 2 },
  accountRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder },
  accountRowText: { flex: 1 },
  accountLabel: { fontSize: 14, color: colors.cream },
  accountSub: { fontSize: 11, color: colors.creamMuted, marginTop: 2 },
})
```

- [ ] **Step 2: The App section**

```tsx
// src/components/settings/AppSection.tsx
import { useMemo } from 'react'
import { View, Text, TouchableOpacity, Switch, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { settingsStyles as s } from './settingsStyles'
import { useWelcomeStore } from '../../store/welcomeStore'
import { useUpdateStore } from '../../store/updateStore'
import { useAnnouncementStore, selectUnreadCount } from '../../store/announcementStore'
import { getVersionLabel, getOtaLabel } from '../../services/appVersion'
import { updateStatusLabel } from '../../utils/updatePrompt'
import { colors, radius } from '../../utils/theme'

export function AppSection() {
  const showWelcomeOnLaunch = useWelcomeStore(st => st.showOnLaunch)
  const setShowWelcomeOnLaunch = useWelcomeStore(st => st.setShowOnLaunch)
  const updateStatus = useUpdateStore(st => st.status)
  const unreadCount = useAnnouncementStore(selectUnreadCount)
  const versionLabel = useMemo(getVersionLabel, [])
  const otaLabel = useMemo(getOtaLabel, [])
  const busy = updateStatus === 'checking' || updateStatus === 'downloading'
  const statusText = updateStatusLabel(updateStatus)

  async function onUpdatePress() {
    const { status, check, restart } = useUpdateStore.getState()
    if (status === 'ready') {
      const ok = await restart()
      if (!ok) Alert.alert("Couldn't restart", 'Close and reopen TacoAtlas to finish updating.')
      return
    }
    await check({ force: true })
  }

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>App</Text>
      <View style={s.card}>
        <View style={[s.accountRow, s.accountRowBorder]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.creamMuted} />
          <View style={s.accountRowText}>
            <Text style={s.accountLabel}>TacoAtlas {versionLabel}</Text>
            <Text style={s.accountSub}>App version</Text>
          </View>
        </View>
        {otaLabel ? (
          <View style={[s.accountRow, s.accountRowBorder]}>
            <Ionicons name="cloud-download-outline" size={18} color={colors.creamMuted} />
            <View style={s.accountRowText}>
              <Text style={s.accountLabel}>OTA {otaLabel}</Text>
              <Text style={s.accountSub}>Over-the-air update</Text>
            </View>
          </View>
        ) : null}
        <TouchableOpacity style={[s.accountRow, s.accountRowBorder]} onPress={onUpdatePress} disabled={busy} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={18} color={colors.creamMuted} />
          <View style={s.accountRowText}>
            <Text style={s.accountLabel}>Check for Updates</Text>
            {statusText ? <Text style={s.accountSub}>{statusText}</Text> : null}
          </View>
          {busy
            ? <ActivityIndicator size="small" color={colors.amber} />
            : <Ionicons name="chevron-forward" size={16} color={colors.creamDim} />}
        </TouchableOpacity>
        <TouchableOpacity style={[s.accountRow, s.accountRowBorder]} onPress={() => router.push('/announcements')} activeOpacity={0.7}>
          <Ionicons name="megaphone-outline" size={18} color={colors.creamMuted} />
          <View style={s.accountRowText}>
            <Text style={s.accountLabel}>Announcements</Text>
            <Text style={s.accountSub}>{unreadCount > 0 ? `${unreadCount} unread` : 'News from the TacoAtlas team'}</Text>
          </View>
          {unreadCount > 0 ? (
            <View style={styles.count}><Text style={styles.countText}>{unreadCount}</Text></View>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={colors.creamDim} />
        </TouchableOpacity>
        <View style={[s.accountRow, s.accountRowBorder]}>
          <Ionicons name="compass-outline" size={18} color={colors.creamMuted} />
          <View style={s.accountRowText}>
            <Text style={s.accountLabel}>Show Guide on Launch</Text>
            <Text style={s.accountSub}>The three-step how-to when you open the app</Text>
          </View>
          <Switch
            value={showWelcomeOnLaunch}
            onValueChange={setShowWelcomeOnLaunch}
            trackColor={{ false: colors.surfaceBorder, true: colors.amberDim }}
            thumbColor={showWelcomeOnLaunch ? colors.amber : colors.creamDim}
            accessibilityLabel="Show the quick-start guide when the app opens"
          />
        </View>
        <TouchableOpacity style={s.accountRow} onPress={() => router.push('/welcome')} activeOpacity={0.7}>
          <Ionicons name="help-circle-outline" size={18} color={colors.creamMuted} />
          <Text style={[s.accountLabel, { flex: 1 }]}>View Quick Start</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.creamDim} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  count: { minWidth: 20, height: 20, borderRadius: radius.full, backgroundColor: colors.amber, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText: { fontSize: 11, fontWeight: '700', color: colors.bg },
})
```

- [ ] **Step 3: Replace the section in profile.tsx**

In `app/(tabs)/profile.tsx`:
1. Replace the whole block from `{/* App section */}` through its closing `</View>` (the one before `{/* Founder tools`) with `<AppSection />`.
2. Delete `function getOtaLabel()` (near line 37), `async function handleCheckForUpdate()` (near line 240), the `checkingUpdate`, `updateStatus` state lines and `const otaLabel = useMemo(...)` (near lines 55-57), and the `showWelcomeOnLaunch` / `setShowWelcomeOnLaunch` lines (near lines 47-48).
3. In the `StyleSheet.create({...})` at the bottom, delete the 8 keys now in `settingsStyles` (`section`, `sectionTitle`, `card`, `accountRow`, `accountRowBorder`, `accountRowText`, `accountLabel`, `accountSub`) and make the first entry `...settingsStyles,`.
4. Add imports:

```ts
import { AppSection } from '../../src/components/settings/AppSection'
import { settingsStyles } from '../../src/components/settings/settingsStyles'
```

5. Remove imports that are now unused. Check each:

Run: `for id in Constants Updates useWelcomeStore useMemo ActivityIndicator Switch; do printf "%s: " $id; grep -cw "$id" "app/(tabs)/profile.tsx"; done`
Any identifier whose count is **1** (only the import line) must be removed from its import statement.

- [ ] **Step 4: Type-check, suite, size**

Run: `npx tsc --noEmit 2>&1 | grep -E "profile.tsx|AppSection|settingsStyles" ; npx jest 2>&1 | tail -4 ; wc -l "app/(tabs)/profile.tsx"`
Expected: no tsc lines; Jest green. Line count drops from 974 to roughly 860. This is still over the 800 cap; record it for the follow-up in Task 18 (extracting the Privacy and Account sections is out of scope here).

- [ ] **Step 5: Commit**

```bash
git add src/components/settings "app/(tabs)/profile.tsx"
git commit -m "refactor: extract Settings App section, add Announcements row and live update status

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: Release script

**Files:**
- Create: `scripts/releaseLib.js`
- Create: `scripts/release.js`
- Test: `scripts/__tests__/releaseLib.test.ts`
- Modify: `package.json` (scripts)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Write the failing tests**

```ts
// scripts/__tests__/releaseLib.test.ts
// eslint-disable-next-line @typescript-eslint/no-var-requires
const lib = require('../releaseLib.js')

describe('bumpVersion', () => {
  it.each([
    ['1.3.1', 'patch', '1.3.2'],
    ['1.3.1', 'minor', '1.4.0'],
    ['1.3.1', 'major', '2.0.0'],
  ])('%s %s -> %s', (from, level, to) => {
    expect(lib.bumpVersion(from, level)).toBe(to)
  })
  it('rejects non-semver', () => {
    expect(() => lib.bumpVersion('1.3', 'patch')).toThrow('Unrecognized version "1.3"')
  })
})

describe('setAppJsonVersion', () => {
  it('changes only expo.version and keeps a trailing newline', () => {
    const input = JSON.stringify({ expo: { name: 'TacoAtlas', version: '1.3.1' } }, null, 2) + '\n'
    const out = lib.setAppJsonVersion(input, '1.3.2')
    expect(JSON.parse(out)).toEqual({ expo: { name: 'TacoAtlas', version: '1.3.2' } })
    expect(out.endsWith('\n')).toBe(true)
  })
})

const CHANGELOG = [
  '# Changelog', '', 'Intro.', '',
  '## Unreleased', '', '### Added', '- **Announcements** in Settings', '- Update popup', '',
  '## versionCode 52 (2026-09-08)', '', '- old', '',
].join('\n')

describe('unreleasedNotes', () => {
  it('returns the first bullet without markdown bold', () => {
    expect(lib.unreleasedSummary(CHANGELOG)).toBe('Announcements in Settings')
  })
  it('throws when Unreleased is missing or empty', () => {
    expect(() => lib.unreleasedSummary('# Changelog\n\n## versionCode 1\n- x\n')).toThrow('## Unreleased')
    expect(() => lib.unreleasedSummary('# Changelog\n\n## Unreleased\n\n## versionCode 1\n- x\n')).toThrow('## Unreleased')
  })
})

describe('stampUnreleased', () => {
  it('renames Unreleased to the given heading and leaves the rest', () => {
    const out = lib.stampUnreleased(CHANGELOG, '1.3.2 (2026-09-22)')
    expect(out).toContain('## 1.3.2 (2026-09-22)\n')
    expect(out).not.toContain('## Unreleased')
    expect(out).toContain('## versionCode 52 (2026-09-08)')
  })
})

describe('parseArgs', () => {
  it('defaults to patch, not dry run', () => {
    expect(lib.parseArgs(['store'])).toEqual({ mode: 'store', level: 'patch', dryRun: false })
  })
  it('reads flags', () => {
    expect(lib.parseArgs(['ota', '--dry-run'])).toEqual({ mode: 'ota', level: 'patch', dryRun: true })
    expect(lib.parseArgs(['store', '--minor'])).toEqual({ mode: 'store', level: 'minor', dryRun: false })
  })
  it('rejects unknown modes', () => {
    expect(() => lib.parseArgs(['ship'])).toThrow('Usage')
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest scripts/__tests__/releaseLib.test.ts`
Expected: FAIL, `Cannot find module '../releaseLib.js'`.

- [ ] **Step 3: Implement the pure helpers**

```js
// scripts/releaseLib.js
// Pure helpers for scripts/release.js. CommonJS so Node runs it directly and
// Jest can require it without a transform.

function bumpVersion(version, level) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!m) throw new Error(`Unrecognized version "${version}"`)
  const [major, minor, patch] = m.slice(1).map(Number)
  if (level === 'major') return `${major + 1}.0.0`
  if (level === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

function setAppJsonVersion(appJsonText, version) {
  const json = JSON.parse(appJsonText)
  const next = { ...json, expo: { ...json.expo, version } }
  return JSON.stringify(next, null, 2) + '\n'
}

const UNRELEASED = /^## Unreleased[ \t]*$/m

function unreleasedSection(changelog) {
  const start = changelog.search(UNRELEASED)
  if (start === -1) return null
  const rest = changelog.slice(start).split('\n').slice(1)
  const end = rest.findIndex(line => line.startsWith('## '))
  return (end === -1 ? rest : rest.slice(0, end)).join('\n')
}

function unreleasedSummary(changelog) {
  const section = unreleasedSection(changelog)
  const bullet = section && section.split('\n').find(line => /^\s*[-*] \S/.test(line))
  if (!bullet) {
    throw new Error('Add at least one bullet under "## Unreleased" in CHANGELOG.md first.')
  }
  return bullet.replace(/^\s*[-*] /, '').replace(/\*\*/g, '').trim()
}

function stampUnreleased(changelog, heading) {
  return changelog.replace(UNRELEASED, `## ${heading}`)
}

function parseArgs(argv) {
  const [mode, ...flags] = argv
  if (mode !== 'store' && mode !== 'ota') {
    throw new Error('Usage: node scripts/release.js <store|ota> [--minor|--major] [--dry-run]')
  }
  const level = flags.includes('--major') ? 'major' : flags.includes('--minor') ? 'minor' : 'patch'
  return { mode, level, dryRun: flags.includes('--dry-run') }
}

module.exports = { bumpVersion, setAppJsonVersion, unreleasedSummary, stampUnreleased, parseArgs }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx jest scripts/__tests__/releaseLib.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: The CLI**

```js
// scripts/release.js
// npm run release:store  -> bump version, stamp CHANGELOG, commit, EAS production build
// npm run release:ota    -> stamp CHANGELOG, commit, eas update to production
// Add --dry-run to print the plan without changing anything.
//
// Rule: app.json "version" changes ONLY on store releases. runtimeVersion uses
// the appVersion policy, so bumping it in an OTA would strand every install.
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const lib = require('./releaseLib')

const root = path.resolve(__dirname, '..')
const appJsonPath = path.join(root, 'app.json')
const changelogPath = path.join(root, 'CHANGELOG.md')

function sh(cmd, dryRun) {
  console.log(`$ ${cmd}`)
  if (!dryRun) execSync(cmd, { stdio: 'inherit', cwd: root })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function main() {
  const { mode, level, dryRun } = lib.parseArgs(process.argv.slice(2))

  const dirty = execSync('git status --porcelain', { cwd: root }).toString().trim()
  if (dirty && !dryRun) throw new Error('Working tree is not clean. Commit or stash first.')

  const appJson = fs.readFileSync(appJsonPath, 'utf8')
  const changelog = fs.readFileSync(changelogPath, 'utf8')
  const summary = lib.unreleasedSummary(changelog)
  const current = JSON.parse(appJson).expo.version

  if (mode === 'store') {
    const next = lib.bumpVersion(current, level)
    console.log(`Store release ${current} -> ${next}: ${summary}`)
    if (!dryRun) {
      fs.writeFileSync(appJsonPath, lib.setAppJsonVersion(appJson, next))
      fs.writeFileSync(changelogPath, lib.stampUnreleased(changelog, `${next} (${today()})`))
    }
    sh('git add app.json CHANGELOG.md', dryRun)
    sh(`git commit -m "chore: release ${next}"`, dryRun)
    sh('eas build --profile production --platform android', dryRun)
    console.log(`\nWhen EAS finishes, add the build number to the CHANGELOG heading: "## ${next} (<build>) (${today()})".`)
    return
  }

  console.log(`OTA update on ${current}: ${summary}`)
  if (!dryRun) fs.writeFileSync(changelogPath, lib.stampUnreleased(changelog, `${current} OTA update (${today()})`))
  sh('git add CHANGELOG.md', dryRun)
  sh(`git commit -m "chore: OTA update on ${current}"`, dryRun)
  sh(`eas update --channel production --message ${JSON.stringify(summary)}`, dryRun)
}

try {
  main()
} catch (e) {
  console.error(`release: ${e.message}`)
  process.exit(1)
}
```

- [ ] **Step 6: Add npm scripts**

In `package.json` `"scripts"`, after `"test": "jest"`, add:

```json
    "release:store": "node scripts/release.js store",
    "release:ota": "node scripts/release.js ota"
```

(Remember the comma after `"test": "jest"`.)

- [ ] **Step 7: Add the Unreleased section to CHANGELOG**

In `CHANGELOG.md`, directly above `## versionCode 52`, insert:

```markdown
## Unreleased

### Added
- **Announcements** in Settings, with a banner for anything new and read/unread per item.
- **Update popup**: when an update finishes downloading, TacoAtlas offers to restart into it.
- Settings shows the full version and build, e.g. `1.3.1 (52)`.
- Founder tools to write, send, edit and delete announcements.

### Security
- Closed a hole that let any signed-in user grant themselves admin or Pro (migration `lock_privileged_profile_columns`, applied to production 2026-09-22).

### Internal
- `npm run release:store` / `npm run release:ota`. `version` in app.json changes only on store releases.
```

- [ ] **Step 8: Dry-run both modes**

Run: `node scripts/release.js store --dry-run && node scripts/release.js ota --dry-run`
Expected: prints `Store release 1.3.1 -> 1.3.2: Announcements in Settings, with a banner…` and the three commands; then `OTA update on 1.3.1: …` and its commands. No files change: `git status --porcelain` shows only your uncommitted edits from this task.

- [ ] **Step 9: Commit**

```bash
git add scripts package.json CHANGELOG.md
git commit -m "feat: release scripts for store builds and OTA updates

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Full verification

- [ ] **Step 1: Full test suite and type check**

Run: `npx jest 2>&1 | tail -5 ; npx tsc --noEmit 2>&1 | tail -5`
Expected: Jest shows **60 suites** (50 baseline + 10 new) and 266 + 83 = **349 tests**, all passing. tsc output matches the pre-work baseline (run `git stash; npx tsc --noEmit | wc -l; git stash pop` if unsure what the baseline was).

- [ ] **Step 2: Preview build**

Run: `eas build --profile preview --platform android`
Install the APK on a device.

- [ ] **Step 3: Manual checks (all must pass)**

Announcements (admin account on device A, regular account on device B):
1. A: Settings → Founder → Announcements → + → title "Test banner", body "Hello" → Save draft. B: no banner, Settings shows no unread.
2. A: open the draft → Send → confirm. B: background and reopen the app. Floating banner appears above the tab bar; Profile tab shows badge 1.
3. B: tap banner → Announcements screen opens with it expanded; banner and badge gone.
4. B: tap "Mark as unread" → banner returns. Tap × on the banner → gone.
5. A: edit the sent title → Save changes. B: pull to refresh → new title shows, still read.
6. A: Delete → confirm. B: pull to refresh → gone.
7. A: start a new draft, type, tap back → "Discard changes?" appears.
8. Sign out on B, open an announcement, sign in → it stays read (local merge).

Update popup:
9. With the preview build installed and signed in, change any visible string, then run `eas update --channel preview --message "popup test"`. Background and reopen after ~30 seconds (or Settings → Check for Updates). Popup "A fresh batch is ready" appears. Tap Later → gone. Settings shows "Update ready. Tap to restart." → tap → app restarts; OTA row shows a new id.
10. Repeat with the Add Review form open: popup waits until you leave it.

Version:
11. Settings shows `TacoAtlas 1.3.1 (<build>)` with the preview build's number.

- [ ] **Step 4: Record results**

Append to the `## Unreleased` → `### Internal` list in `CHANGELOG.md`: `- Verified on preview build <build number>: announcements, update popup, version label.` Commit:

```bash
git add CHANGELOG.md
git commit -m "docs: record preview verification for announcements and update popup

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Follow-up to flag (not in scope)**

`app/(tabs)/profile.tsx` is still ~860 lines (cap 800). Flag a separate task to extract the Privacy and Account sections into `src/components/settings/`.
