-- Add opt-out privacy controls to user profiles.
-- All three columns default to TRUE (public) so existing users
-- see no change in behaviour after the migration runs.

alter table public.profiles
  add column if not exists is_profile_public   boolean not null default true,
  add column if not exists is_name_public      boolean not null default true,
  add column if not exists are_reviews_public  boolean not null default true;
