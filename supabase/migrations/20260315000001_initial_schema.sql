-- supabase/migrations/20260315000001_initial_schema.sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Cities
create table cities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  state_region text,
  country text not null default 'US',
  created_at timestamptz default now()
);

-- Vendors
create type vendor_status as enum ('pending', 'approved');

create table vendors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  lat double precision not null,
  lng double precision not null,
  address text,
  city_id uuid references cities(id),
  hours text,
  photo_url text,
  status vendor_status default 'pending',
  submitted_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index vendors_city_id_idx on vendors(city_id);
create index vendors_status_idx on vendors(status);

-- Reviews
create type return_intent as enum ('yes', 'maybe', 'no');

create table reviews (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid references vendors(id) on delete cascade,
  user_id uuid references auth.users(id),
  overall_rating int check (overall_rating between 1 and 5),
  return_intent return_intent,
  notes text,
  photos text[] default '{}',
  is_public boolean default false,
  created_at timestamptz default now()
);

create index reviews_vendor_id_idx on reviews(vendor_id);
create index reviews_user_id_idx on reviews(user_id);

-- Taco entries
create table taco_entries (
  id uuid primary key default uuid_generate_v4(),
  review_id uuid references reviews(id) on delete cascade,
  taco_type text not null,
  rating int check (rating between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

-- Salsa entries
create type heat_level as enum ('mild', 'medium', 'hot', 'fire');

create table salsa_entries (
  id uuid primary key default uuid_generate_v4(),
  review_id uuid references reviews(id) on delete cascade,
  salsa_name text not null,
  flavor_rating int check (flavor_rating between 1 and 5),
  heat_level heat_level,
  created_at timestamptz default now()
);

-- Condiments
create table condiments (
  id uuid primary key default uuid_generate_v4(),
  review_id uuid references reviews(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- User profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Auto-create profile on sign up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Row Level Security
alter table vendors enable row level security;
alter table reviews enable row level security;
alter table taco_entries enable row level security;
alter table salsa_entries enable row level security;
alter table condiments enable row level security;
alter table profiles enable row level security;

-- Vendor policies
create policy "Approved vendors are public" on vendors
  for select using (status = 'approved');

create policy "Users can insert their own vendors" on vendors
  for insert with check (auth.uid() = submitted_by);

create policy "Admins can update vendors" on vendors
  for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- Review policies
create policy "Public reviews are visible" on reviews
  for select using (is_public = true or auth.uid() = user_id);

create policy "Users can insert their own reviews" on reviews
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own reviews" on reviews
  for update using (auth.uid() = user_id);

-- Taco entries policies
create policy "Review sub-entries follow review access" on taco_entries
  for select using (
    exists (select 1 from reviews r where r.id = review_id and (r.is_public = true or r.user_id = auth.uid()))
  );

create policy "Users can insert taco entries for their reviews" on taco_entries
  for insert with check (
    exists (select 1 from reviews r where r.id = review_id and r.user_id = auth.uid())
  );

-- Salsa entries policies
create policy "Review sub-entries follow review access" on salsa_entries
  for select using (
    exists (select 1 from reviews r where r.id = review_id and (r.is_public = true or r.user_id = auth.uid()))
  );

create policy "Users can insert salsa entries for their reviews" on salsa_entries
  for insert with check (
    exists (select 1 from reviews r where r.id = review_id and r.user_id = auth.uid())
  );

-- Condiments policies
create policy "Review sub-entries follow review access" on condiments
  for select using (
    exists (select 1 from reviews r where r.id = review_id and (r.is_public = true or r.user_id = auth.uid()))
  );

create policy "Users can insert condiments for their reviews" on condiments
  for insert with check (
    exists (select 1 from reviews r where r.id = review_id and r.user_id = auth.uid())
  );

-- Profile policies
create policy "Profiles are public" on profiles
  for select using (true);

create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id);
