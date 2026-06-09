-- ─────────────────────────────────────────────────────────────
-- Fix: handle_new_user / username_available search_path
-- ─────────────────────────────────────────────────────────────
-- After yesterday's `create or replace function` via the dashboard,
-- the function's owner search_path no longer includes `public`, so
-- the unqualified `profiles` reference fails with:
--   ERROR: relation "profiles" does not exist
-- which surfaces in the app as "Database error saving new user".
--
-- Fix:
--  1. Schema-qualify the table name to public.profiles
--  2. Pin search_path inside the function (recommended for
--     SECURITY DEFINER per Supabase hardening guidance)
-- ─────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    lower(nullif(new.raw_user_meta_data->>'username', ''))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.username_available(uname text)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(uname)
  );
$$;

grant execute on function public.username_available(text) to anon, authenticated;
