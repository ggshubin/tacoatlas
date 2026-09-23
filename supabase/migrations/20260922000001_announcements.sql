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
