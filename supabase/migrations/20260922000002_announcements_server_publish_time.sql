-- ─────────────────────────────────────────────────────────────
-- Stamp announcements.published_at with the server clock
-- ─────────────────────────────────────────────────────────────
-- The client sends any non-null published_at to mean "send now". Trusting the
-- admin phone's clock would let a fast clock hide an announcement from every
-- user (RLS compares against the server's now()) while the admin's own feed
-- still shows it. The value is overwritten here; once sent, it never moves.
-- ─────────────────────────────────────────────────────────────

create or replace function public.announcements_touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  if old.published_at is null and new.published_at is not null then
    new.published_at := now();
  elsif old.published_at is not null then
    new.published_at := old.published_at;
  end if;
  return new;
end;
$$;

create or replace function public.announcements_stamp_on_insert()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.published_at is not null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists announcements_stamp_on_insert on public.announcements;
create trigger announcements_stamp_on_insert
  before insert on public.announcements
  for each row execute function public.announcements_stamp_on_insert();
