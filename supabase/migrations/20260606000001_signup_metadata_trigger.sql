-- ─────────────────────────────────────────────────────────────
-- Fix signup: persist username + display_name through email confirmation
-- ─────────────────────────────────────────────────────────────
-- Previously: handle_new_user() set display_name = email and left
-- username NULL. The client tried to upsert the real values, but only
-- when auth.signUp returned a session — which doesn't happen when
-- email confirmation is enabled. Result: users completed signup but
-- appeared as guests with no username until they edited their profile.
--
-- Now: read display_name and username from raw_user_meta_data, which
-- the client passes via supabase.auth.signUp({ options: { data: ... } }).
-- Works regardless of which device confirms the email.
-- ─────────────────────────────────────────────────────────────

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.email),
    lower(nullif(new.raw_user_meta_data->>'username', ''))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- ─────────────────────────────────────────────────────────────
-- username_available — public RPC for client-side pre-flight check
-- ─────────────────────────────────────────────────────────────
-- profiles RLS only lets authenticated users read rows, so the signup
-- screen can't query usernames directly. This SECURITY DEFINER function
-- returns only a boolean — no row data is leaked.
-- ─────────────────────────────────────────────────────────────

create or replace function username_available(uname text)
returns boolean
language sql
security definer
stable
as $$
  select not exists (
    select 1 from profiles where lower(username) = lower(uname)
  );
$$;

grant execute on function username_available(text) to anon, authenticated;
