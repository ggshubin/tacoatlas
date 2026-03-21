-- Add demographic columns to profiles
alter table profiles
  add column if not exists bio text,
  add column if not exists home_city text,
  add column if not exists favorite_taco text;

-- Add 'volcano' heat level to the enum
-- Postgres requires adding enum values outside of transactions
alter type heat_level add value if not exists 'volcano';
