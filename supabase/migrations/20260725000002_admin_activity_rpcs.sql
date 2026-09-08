-- ─────────────────────────────────────────────────────────────
-- Founder dashboard RPCs
-- ─────────────────────────────────────────────────────────────
-- Beta operations need one honest view of what the whole app is doing:
-- who signed up, whether they logged anything, and what's landing right
-- now. RLS deliberately prevents the client from asking that question, so
-- these run SECURITY DEFINER.
--
-- Because they bypass RLS they are hard-gated on the caller's is_admin
-- flag and raise rather than returning an empty set — a silent empty
-- result is indistinguishable from "no activity yet" and would hide a
-- broken permission check.
--
-- These read across every user's privacy setting, including private
-- spots. That is a deliberate founder-account capability and is disclosed
-- in docs/privacy-policy.html.
-- ─────────────────────────────────────────────────────────────

create or replace function public.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.profiles
     where id = auth.uid() and is_admin = true
  ) then
    raise exception 'admin access required'
      using errcode = '42501';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- admin_user_roster — one row per account, newest signup first
-- ─────────────────────────────────────────────────────────────

create or replace function public.admin_user_roster()
returns table (
  id            uuid,
  username      text,
  display_name  text,
  is_founder    boolean,
  joined_at     timestamptz,
  spot_count    bigint,
  review_count  bigint,
  last_active   timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  -- Statement, not a WHERE-clause predicate: the gate must run before any
  -- rows are produced and must not be something the planner can reorder.
  perform public.require_admin();

  return query
  select
    p.id,
    p.username,
    p.display_name,
    p.is_founder,
    p.created_at as joined_at,
    (select count(*) from public.vendors v where v.submitted_by = p.id) as spot_count,
    (select count(*) from public.reviews r where r.user_id = p.id)      as review_count,
    greatest(
      (select max(v.created_at) from public.vendors v where v.submitted_by = p.id),
      (select max(r.created_at) from public.reviews r where r.user_id = p.id)
    ) as last_active
  from public.profiles p
  order by p.created_at desc;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- admin_recent_activity — cross-user feed of spots and reviews
-- ─────────────────────────────────────────────────────────────
-- `privacy` is returned rather than filtered on: seeing that the map is
-- filling up with private-only spots is itself the signal worth having.

create or replace function public.admin_recent_activity(p_limit int default 50)
returns table (
  kind         text,
  id           uuid,
  user_id      uuid,
  username     text,
  display_name text,
  title        text,
  detail       text,
  rating       int,
  privacy      text,
  created_at   timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.require_admin();

  return query
  with feed as (
    select
      'spot'::text   as kind,
      v.id,
      v.submitted_by as user_id,
      v.name         as title,
      coalesce(v.address, v.spot_type) as detail,
      null::int      as rating,
      v.privacy,
      v.created_at
    from public.vendors v
    union all
    select
      'review'::text as kind,
      r.id,
      r.user_id,
      coalesce(v.name, 'Unknown spot') as title,
      r.notes        as detail,
      r.overall_rating as rating,
      r.privacy,
      r.created_at
    from public.reviews r
    left join public.vendors v on v.id = r.vendor_id
  )
  select
    f.kind, f.id, f.user_id, p.username, p.display_name,
    f.title, f.detail, f.rating, f.privacy, f.created_at
  from feed f
  left join public.profiles p on p.id = f.user_id
  order by f.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
end;
$$;

revoke execute on function public.require_admin() from public, anon;
revoke execute on function public.admin_user_roster() from public, anon;
revoke execute on function public.admin_recent_activity(int) from public, anon;

grant execute on function public.admin_user_roster() to authenticated;
grant execute on function public.admin_recent_activity(int) to authenticated;
