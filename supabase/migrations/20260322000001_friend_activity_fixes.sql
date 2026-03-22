-- supabase/migrations/20260322000001_friend_activity_fixes.sql
-- Fixes required for friend activity feed (Mi Gente):
--   1. Add 'personal' to vendor_status enum
--   2. Add spot_type column to vendors
--   3. Add privacy column to reviews (backfill from is_public)
--   4. RLS: owners + friends can read/update personal vendors
--   5. RLS: friends can read privacy='friends' reviews + sub-entries

-- ─────────────────────────────────────────────
-- 1. Extend vendor_status enum with 'personal'
-- (ALTER TYPE ADD VALUE must run outside a transaction block)
-- ─────────────────────────────────────────────
alter type vendor_status add value if not exists 'personal';

-- ─────────────────────────────────────────────
-- 2. Add spot_type to vendors
-- ─────────────────────────────────────────────
alter table vendors
  add column if not exists spot_type text;

-- ─────────────────────────────────────────────
-- 3. Add privacy to reviews, backfill from is_public
-- ─────────────────────────────────────────────
alter table reviews
  add column if not exists privacy text not null default 'public';

-- Backfill: existing rows with is_public=true → 'public', false → 'private'
update reviews
  set privacy = case when is_public = true then 'public' else 'private' end
  where privacy = 'public';   -- only touch rows that still have the default

-- ─────────────────────────────────────────────
-- 4. Vendor RLS — personal vendors
-- ─────────────────────────────────────────────

-- Owner can always read their own personal vendors
create policy "Owners can read their personal vendors" on vendors
  for select using (
    status = 'personal' and submitted_by = auth.uid()
  );

-- Owner can update their personal vendors
create policy "Owners can update their personal vendors" on vendors
  for update using (
    status = 'personal' and submitted_by = auth.uid()
  );

-- Friends can read personal vendors (needed for activity feed join)
create policy "Friends can read personal vendors" on vendors
  for select using (
    status = 'personal'
    and exists (
      select 1 from friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = submitted_by)
          or (f.addressee_id = auth.uid() and f.requester_id = submitted_by)
        )
    )
  );

-- ─────────────────────────────────────────────
-- 5. Reviews RLS — friends-only visibility
-- ─────────────────────────────────────────────

-- Replace the existing public-reviews policy with one that also allows friends
drop policy if exists "Public reviews are visible" on reviews;

create policy "Reviews are visible based on privacy" on reviews
  for select using (
    -- Own reviews always visible
    auth.uid() = user_id
    -- Public reviews visible to all
    or is_public = true
    or privacy = 'public'
    -- Friends-only reviews visible to accepted friends
    or (
      privacy = 'friends'
      and exists (
        select 1 from friendships f
        where f.status = 'accepted'
          and (
            (f.requester_id = auth.uid() and f.addressee_id = user_id)
            or (f.addressee_id = auth.uid() and f.requester_id = user_id)
          )
      )
    )
  );

-- ─────────────────────────────────────────────
-- 6. Sub-entries RLS — mirror review visibility for friends
-- ─────────────────────────────────────────────

-- Helper: returns true when the current user can see a given review_id
-- (avoids repeating the full friends subquery in every policy)
create or replace function can_read_review(rid uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from reviews r
    where r.id = rid
      and (
        r.user_id = auth.uid()
        or r.is_public = true
        or r.privacy = 'public'
        or (
          r.privacy = 'friends'
          and exists (
            select 1 from friendships f
            where f.status = 'accepted'
              and (
                (f.requester_id = auth.uid() and f.addressee_id = r.user_id)
                or (f.addressee_id = auth.uid() and f.requester_id = r.user_id)
              )
          )
        )
      )
  )
$$;

-- taco_entries
drop policy if exists "Review sub-entries follow review access" on taco_entries;
create policy "Review sub-entries follow review access" on taco_entries
  for select using (can_read_review(review_id));

-- salsa_entries
drop policy if exists "Review sub-entries follow review access" on salsa_entries;
create policy "Review sub-entries follow review access" on salsa_entries
  for select using (can_read_review(review_id));

-- condiments
drop policy if exists "Review sub-entries follow review access" on condiments;
create policy "Review sub-entries follow review access" on condiments
  for select using (can_read_review(review_id));
