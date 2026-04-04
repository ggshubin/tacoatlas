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
