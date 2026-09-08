-- ─────────────────────────────────────────────────────────────
-- Founder auto-friend: every new signup starts with one connection
-- ─────────────────────────────────────────────────────────────
-- A crowdsourced atlas is worthless on first open if you have no crew —
-- Mi Gente is empty, there's no activity feed, and nothing signals that
-- other people are using this. Pairing every new account with the founder
-- account guarantees at least one real connection from minute one.
--
-- Founder identity lives in a column rather than a hardcoded UUID so this
-- survives a database restore and can grow to several founder accounts.
-- ─────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists is_founder boolean not null default false;

-- Mark the owner account. Looked up by email — do not hardcode the id.
-- is_admin comes along for the ride: it was never granted to anyone, which
-- left the admin queue (and the new founder dashboard) unreachable.
update public.profiles p
   set is_founder = true,
       is_admin   = true
  from auth.users u
 where u.id = p.id
   and lower(u.email) = 'mographguy@gmail.com';

-- ─────────────────────────────────────────────────────────────
-- link_founder_friendships — idempotent pairing for one user
-- ─────────────────────────────────────────────────────────────
-- Used by both the signup trigger and the backfill below.
--
-- Two constraints on friendships shape this:
--   * unique (requester_id, addressee_id) is DIRECTIONAL, so a row where
--     the user reached out to the founder does NOT conflict with a row in
--     the founder→user direction. Checking one direction would create
--     duplicate friendships.
--   * check (requester_id <> addressee_id) — the founder must not be
--     paired with themselves.
--
-- An existing row in either direction is left completely alone. That row
-- may be 'blocked' or a 'pending' request the user initiated, and quietly
-- overwriting either would undo a decision the user made.
-- ─────────────────────────────────────────────────────────────

create or replace function public.link_founder_friendships(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.friendships (requester_id, addressee_id, status)
  select f.id, target_user_id, 'accepted'
    from public.profiles f
   where f.is_founder = true
     and f.id <> target_user_id
     and not exists (
       select 1 from public.friendships x
        where (x.requester_id = f.id and x.addressee_id = target_user_id)
           or (x.requester_id = target_user_id and x.addressee_id = f.id)
     )
  on conflict (requester_id, addressee_id) do nothing;
end;
$$;

revoke execute on function public.link_founder_friendships(uuid) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Trigger: pair on profile creation
-- ─────────────────────────────────────────────────────────────
-- Hangs off profiles rather than auth.users so it runs after
-- handle_new_user() has created the row this depends on.
--
-- Failure here must never block a signup — a user who can't create an
-- account is a far worse outcome than a user without the founder in their
-- crew, and the backfill below can always repair a miss.
-- ─────────────────────────────────────────────────────────────

create or replace function public.auto_friend_founders()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  begin
    perform public.link_founder_friendships(new.id);
  exception when others then
    raise warning 'auto_friend_founders failed for %: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists on_profile_created_auto_friend on public.profiles;
create trigger on_profile_created_auto_friend
  after insert on public.profiles
  for each row execute function public.auto_friend_founders();

-- ─────────────────────────────────────────────────────────────
-- Backfill every existing account
-- ─────────────────────────────────────────────────────────────

do $$
declare
  existing_id uuid;
begin
  for existing_id in select id from public.profiles loop
    perform public.link_founder_friendships(existing_id);
  end loop;
end;
$$;
