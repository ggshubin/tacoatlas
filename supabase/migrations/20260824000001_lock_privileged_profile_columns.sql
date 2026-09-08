-- ─────────────────────────────────────────────────────────────
-- Close the privilege-escalation hole on public.profiles
-- ─────────────────────────────────────────────────────────────
-- 20260328000001_security_hardening.sql is headed "restrict profile UPDATE
-- to safe columns ... this makes it explicit at the policy level", and
-- 20260606000002_profiles_is_pro.sql repeats the claim that "is_admin isn't
-- in the safe-columns set the policy allows". Neither is true. The policy is
--
--   for update using (auth.uid() = id) with check (auth.uid() = id)
--
-- and RLS USING / WITH CHECK constrain *rows*, never *columns*. No migration
-- has ever issued a column-level GRANT. With Supabase's default table-level
-- UPDATE grant, any authenticated user could PATCH their own profile row and
-- set is_admin / is_pro / is_founder on themselves using nothing but the anon
-- key shipped inside the app binary.
--
-- That was dormant while is_admin was granted to nobody. 20260725000002
-- (admin_user_roster / admin_recent_activity) turned it live: those RPCs are
-- SECURITY DEFINER, granted to `authenticated`, and gated solely on is_admin,
-- so self-granting the flag exposes every user's private spots and private
-- review notes.
--
-- ── Why a trigger and not a column GRANT allowlist ──
-- The textbook fix is `revoke update on profiles from authenticated` followed
-- by `grant update (safe, columns, ...)`. Two reasons that is the wrong tool
-- here:
--   1. In Postgres a table-level UPDATE grant subsumes column-level grants,
--      so a column-level REVOKE alone is inert -- the table grant must be
--      dropped first, which means enumerating every safe column exactly.
--   2. The repo migrations are demonstrably NOT a complete picture of the
--      live schema: profiles.username is written by handle_new_user() and
--      read by admin_user_roster(), yet no migration ever adds the column.
--      An allowlist built from this repo would silently drop a legitimate
--      column and break profile editing in production.
-- A denylist trigger is fail-safe in the direction that matters: it cannot
-- break edits to columns it does not name, and the privileged set is small,
-- known, and enumerable. Add any future privileged column to the list below.
-- ─────────────────────────────────────────────────────────────

create or replace function public.enforce_profile_privilege_columns()
returns trigger
language plpgsql
-- SECURITY INVOKER (the default) is load-bearing. Marking this SECURITY
-- DEFINER would make current_user the function owner for every caller, and
-- the role check below would pass unconditionally -- turning the guard off.
set search_path = public, pg_temp
as $$
begin
  -- Roles that legitimately administer these columns: migrations and the
  -- dashboard SQL editor run as postgres; edge functions using the service
  -- role key run as service_role.
  if current_user in ('postgres', 'service_role', 'supabase_admin') then
    return new;
  end if;

  if new.is_admin   is distinct from old.is_admin
  or new.is_pro     is distinct from old.is_pro
  or new.is_founder is distinct from old.is_founder then
    raise exception
      'is_admin, is_pro and is_founder are not user-writable'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_privilege_columns on public.profiles;
create trigger profiles_enforce_privilege_columns
  before update on public.profiles
  for each row execute function public.enforce_profile_privilege_columns();

-- ─────────────────────────────────────────────────────────────
-- grant_admin(uuid) — a second, more direct escalation path
-- ─────────────────────────────────────────────────────────────
-- 20260328000001 created it SECURITY DEFINER ("only callable with service
-- role") and revoked it `from public` only. Revoking from PUBLIC does not
-- remove a separate grant to `authenticated`, and Supabase's stock
-- `alter default privileges ... grant all on functions to anon, authenticated`
-- hands one out at creation time. Any signed-in user could therefore call
--   select grant_admin('<their-own-uuid>')
-- and become an admin in a single request, trigger above notwithstanding --
-- the function is SECURITY DEFINER, so it runs as postgres and is allowed
-- through by design.
--
-- It is called from no client or edge-function code (verified), so the
-- execute privilege is withdrawn from both untrusted roles rather than the
-- function being reworked. It stays available to postgres / service_role.
-- The missing search_path is also pinned: a SECURITY DEFINER function without
-- one resolves `profiles` against the caller's search_path.
-- ─────────────────────────────────────────────────────────────

create or replace function public.grant_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.profiles set is_admin = true where id = target_user_id;
end;
$$;

revoke execute on function public.grant_admin(uuid) from public, anon, authenticated;

-- Belt and braces for the RPCs that read the flag this migration protects.
revoke execute on function public.admin_user_roster()        from public, anon;
revoke execute on function public.admin_recent_activity(int) from public, anon;
