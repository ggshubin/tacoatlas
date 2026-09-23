# Announcements, Update Popup, and Version Display - Design

Date: 2026-09-22
Status: Approved (design), pending spec review

## Goals

1. Founder can create, edit, send (publish) and delete system announcements from the app. Drafts are invisible to users until sent.
2. Users see a banner when an unread announcement exists; reading it (or dismissing it) clears the banner. Read/unread is toggleable per item in Settings.
3. When a logged-in user's app has a downloaded OTA update, a popup announces it and restarts into the new version.
4. Settings shows a consistent, unique version label: `1.3.1 (52)`.

## Non-goals (v1)

- Store-only (native) update prompts. Needs a "latest store build" config row and Play in-app-updates; defer until a native-only release actually needs it.
- Push notifications for announcements. The existing push pipeline could do it later; the banner covers the in-app case.
- Rich text / images in announcements. Plain title + body.
- Scheduled sends, unsend (delete covers it), and "mark as new for everyone" after an edit.
- An OTA update counter in the version label (explicitly declined by the user).

## Prerequisite (done 2026-09-22)

`lock_privileged_profile_columns` applied to production (remote version `20260923004121`, repo file `20260824000001_…`). Before it, any signed-in user could self-grant `is_admin`, which would have let anyone publish announcements. Verified with a rolled-back transaction as `authenticated`: self-grant of `is_admin`/`is_pro` blocked, `grant_admin()` denied, normal privacy edits still succeed.

## 1. Data model (one migration)

```sql
announcements (
  id           uuid pk default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 80),
  body         text not null check (char_length(body) between 1 and 1000),
  published_at timestamptz,            -- null = draft; set by Send
  updated_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  created_by   uuid not null references profiles(id) default auth.uid()
)
index on (published_at desc) where published_at is not null

announcement_reads (
  user_id         uuid references auth.users(id) on delete cascade,
  announcement_id uuid references announcements(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (user_id, announcement_id)
)
```

RLS:
- `announcements` SELECT: `anon, authenticated` where `published_at is not null and published_at <= now()`; admins additionally see drafts.
- `announcements` INSERT/UPDATE/DELETE: `authenticated`, admin only via `exists (select 1 from profiles where id = auth.uid() and is_admin)`. DELETE is a hard delete; `announcement_reads` rows cascade.
- `updated_at` maintained by a `before update` trigger.
- `announcement_reads` SELECT/INSERT/DELETE: `auth.uid() = user_id`. DELETE is what "mark unread" does.

Rollout: write migration file → verify in a rolled-back transaction as `authenticated` (non-admin cannot insert/update/delete or see drafts; admin can; reads scoped to self) → `apply_migration` → `get_advisors security`.

## 2. Client architecture

All new files. `app/(tabs)/profile.tsx` (974 lines, over the 800 cap) gets its App section extracted as part of this work.

| Unit | Responsibility | Depends on |
|---|---|---|
| `src/services/announcementService.ts` | `fetchAnnouncements()`, `fetchReadIds()`, `markRead(ids)`, `markUnread(id)`; admin `listAll()`, `createDraft()`, `update()`, `send()`, `remove()`. Throws on error (adminService pattern). | supabase |
| `src/services/announcementReadsLocal.ts` | AsyncStorage read-set for signed-out users; `mergeIntoRemote()` on sign-in. | AsyncStorage |
| `src/store/announcementStore.ts` | Zustand: `items`, `readIds`, derived `unreadCount`, `latestUnread`; `refresh()`, `setRead(id, bool)`, `markAllRead()`. Optimistic updates with rollback on error. | both services |
| `src/components/AnnouncementBanner.tsx` | Slim amber strip under the safe area on tab screens. Shows `latestUnread.title`. Tap → `/announcements?id=` and marks read. × marks read. Hidden when `unreadCount === 0`. | store |
| `app/announcements.tsx` | List, newest first. Unread = amber dot + bold title. Tap expands and marks read; long-press / swipe toggles read↔unread. "Mark all read" header action. | store |
| `app/admin/announcements.tsx` | Founder list: all announcements with a Draft / Sent chip, newest first. "New" button. | service |
| `app/admin/announcement-edit.tsx` | Create or edit (`?id=`). Title + body with char counters, live preview of the banner. Actions: **Save draft**, **Send** (drafts only; ConfirmModal "Send to everyone?"), **Delete** (ConfirmModal, destructive). Editing a sent announcement saves in place and does not reset anyone's read state (typo fixes stay quiet). | service |
| `src/components/settings/AppSection.tsx` | Extracted Settings "App" card: version row, OTA row, Check for Updates, **Announcements row with unread count**, guide toggle, quick start. | store, useOtaUpdate |
| `app/(tabs)/_layout.tsx` | Profile tab gets `tabBarBadge` dot when `unreadCount > 0` (mirrors `pendingFriendCount`). | store |

Refresh triggers: app launch (after session restore) and `AppState` → `active`, throttled to 5 min. Also on sign-in/out (read-set source switches).

## 3. Update popup

`src/hooks/useOtaUpdate.ts` wraps `expo-updates`:
- Active only when `session` exists, `!__DEV__`, and `Updates.isEnabled`.
- On launch and on foreground (throttled 30 min): `checkForUpdateAsync` → if available, `fetchUpdateAsync` silently.
- State machine: `idle → checking → downloading → ready | error`. Exposes `{ status, checkNow(), restart() }`.
- `checkNow()` is reused by the Settings "Check for Updates" row, replacing the inline logic in profile.tsx.

`src/components/UpdateReadyModal.tsx`, mounted in `app/_layout.tsx`:
- Shows when `status === 'ready'` and not already dismissed this session.
- Copy: title "A fresh batch is ready", body "TacoAtlas has an update. Restart now to get it. It only takes a second." Buttons: **Restart now** (`Updates.reloadAsync()`), **Later** (dismiss; expo-updates applies it on next cold start automatically).
- Suppressed while the review form is open (don't interrupt a log in progress); re-evaluated when it closes.

## 4. Versioning

Display: `TacoAtlas 1.3.1 (52)` from `expo-application` `nativeApplicationVersion` + `nativeBuildVersion` (the installed binary, not app.json). Pin `expo-application@55.0.15` as a direct dep (already linked via expo-notifications; no native change). Existing short OTA-ID row stays beneath it.

Rule: `version` in app.json changes **only** on store builds. `runtimeVersion.policy = appVersion` means bumping it in an OTA would orphan every installed build.

`scripts/release.mjs`:
- `npm run release:store` - require clean tree; bump patch in app.json; insert CHANGELOG heading `## [x.y.z] - YYYY-MM-DD`; commit `chore: release x.y.z`; `eas build --profile production --platform android` (EAS auto-increments the build number).
- `npm run release:ota` - require clean tree; never touches version; message = first CHANGELOG entry's first line; `eas update --channel production --message "…"`.
- `--dry-run` prints actions without executing. Minor/major bumps via `--minor` / `--major`.

## 5. Error handling

- Announcement fetch failure: keep last items in store, no banner change, log `console.warn`. Never block app start.
- markRead failure: roll back optimistic state, silent (non-critical).
- Admin save/send/delete failure: Alert with message (existing screen pattern); form keeps its input.
- Unsaved edits on back: ConfirmModal "Discard changes?".
- Update check/fetch failure: `status = 'error'`, no popup; Settings row shows "Could not check for updates".
- `reloadAsync` failure: Alert "Couldn't restart. Close and reopen TacoAtlas."

## 6. Testing

Unit (Jest, TDD):
- `announcementStore`: unread derivation, optimistic read/unread with rollback, markAllRead, signed-out local path.
- `announcementService`: query shapes against mocked supabase (incl. draft vs sent, send sets published_at, delete); error propagation.
- `useOtaUpdate`: state transitions, throttle, disabled when signed-out/dev (mocked `expo-updates`).
- `release.mjs` version bump + CHANGELOG insertion as pure functions.

DB: rolled-back transaction checks for every RLS policy (anon read, non-admin insert blocked, admin insert ok, reads scoped to self).

Manual on a preview build: create draft (not visible on a second non-admin account) → edit → send from Founder screen → banner appears → tap → gone, Settings shows 0 unread → mark unread → banner back. `eas update --channel preview` → popup → Restart → OTA row shows new ID.

## Open risks

- `expo-application` autolinked transitively is **probably** in vc52; confirmed only by running the preview build. If not, the version row falls back to `Constants.expoConfig.version` without the build number until the next store build.
- OTA popup reaches existing installs only once this code itself ships (via OTA or store).
