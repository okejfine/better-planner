-- Better Planner — complete, idempotent schema.
-- Safe to run on a fresh project OR on top of an earlier partial apply.
-- Run this in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> paste -> Run).

-- ============================================================================
-- 0. Enums (create-if-missing, then ensure all values present)
-- ============================================================================
do $$ begin
  create type public.event_kind as enum (
    'byu_football_home','byu_football_away','federal_holiday','custom'
  );
exception when duplicate_object then null; end $$;

alter type public.event_kind add value if not exists 'lone_peak_home';
alter type public.event_kind add value if not exists 'lone_peak_away';
alter type public.event_kind add value if not exists 'holiday';
alter type public.event_kind add value if not exists 'lds_conference';

do $$ begin
  create type public.city as enum ('lindon');
exception when duplicate_object then null; end $$;

alter type public.city add value if not exists 'lindon';
alter type public.city add value if not exists 'highland';
alter type public.city add value if not exists 'lehi';
alter type public.city add value if not exists 'orem';
alter type public.city add value if not exists 'alpine';
alter type public.city add value if not exists 'washington_dc';
alter type public.city add value if not exists 'holiday_ut';
alter type public.city add value if not exists 'cabo_mx';
alter type public.city add value if not exists 'honolulu_hi';
alter type public.city add value if not exists 'maui_hi';
alter type public.city add value if not exists 'cancun_mx';
alter type public.city add value if not exists 'huntington_beach_ca';

-- ============================================================================
-- 1. Profiles + new-user trigger
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  avatar_color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_palette text[] := array[
    '#6366f1','#ec4899','#f97316','#10b981','#0ea5e9','#a855f7','#facc15','#ef4444'
  ];
  v_color text;
begin
  v_display_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    split_part(new.email, '@', 1)
  );
  v_color := v_palette[1 + (abs(hashtext(new.id::text)) % array_length(v_palette, 1))];
  insert into public.profiles (id, email, display_name, avatar_color)
  values (new.id, new.email, v_display_name, v_color)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 2. Events
-- ============================================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  kind public.event_kind not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists events_date_idx on public.events(date);

-- ============================================================================
-- 3. Per-user day ratings
-- ============================================================================
create table if not exists public.day_ratings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  stars smallint check (stars between 1 and 5),
  vetoed boolean not null default false,
  shortlisted boolean not null default false,
  preferred_cities public.city[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
create index if not exists day_ratings_date_idx on public.day_ratings(date);
-- Ensure column exists if table was created by an older migration.
alter table public.day_ratings
  add column if not exists preferred_cities public.city[] not null default '{}';

-- ============================================================================
-- 4. Threaded comments
-- ============================================================================
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);
create index if not exists comments_date_idx on public.comments(date);

-- ============================================================================
-- 5. Weather (daily means, hourly means, per-year rain events)
-- ============================================================================
create table if not exists public.weather_daily (
  city public.city not null,
  month_day char(4) not null,  -- 'MMDD'
  mean_high_f numeric(4,1) not null,
  mean_low_f numeric(4,1) not null,
  rain_probability numeric(4,3) not null,
  primary key (city, month_day)
);

create table if not exists public.weather_hourly (
  city public.city not null,
  month_day char(4) not null,
  hour smallint not null check (hour between 0 and 23),
  mean_temp_f numeric(4,1) not null,
  mean_precip_mm numeric(5,2) not null,
  mean_wind_mph numeric(4,1) not null,
  years_with_rain smallint not null default 0,
  primary key (city, month_day, hour)
);
-- Ensure column exists if table was created by an older migration.
alter table public.weather_hourly
  add column if not exists years_with_rain smallint not null default 0;

create table if not exists public.weather_year_rain (
  city public.city not null,
  month_day char(4) not null,
  hour smallint not null check (hour between 0 and 23),
  year smallint not null,
  precip_mm numeric(5,2) not null,
  primary key (city, month_day, hour, year)
);

-- ============================================================================
-- 6. Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.day_ratings enable row level security;
alter table public.comments enable row level security;
alter table public.weather_daily enable row level security;
alter table public.weather_hourly enable row level security;
alter table public.weather_year_rain enable row level security;

-- Profiles: anyone authed can read; users can update their own row.
drop policy if exists "profiles_read_authed" on public.profiles;
create policy "profiles_read_authed" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- Optional but important for app-side recovery when profile row is missing.
drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- Events: anyone authed can read; custom events are writable by creator.
drop policy if exists "events_read_authed" on public.events;
create policy "events_read_authed" on public.events
  for select using (auth.role() = 'authenticated');

drop policy if exists "events_insert_self" on public.events;
create policy "events_insert_self" on public.events
  for insert with check (created_by = auth.uid() and kind = 'custom');

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own" on public.events
  for update using (created_by = auth.uid());

drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own" on public.events
  for delete using (created_by = auth.uid());

-- Day ratings: anyone authed can read; only own rows writable.
drop policy if exists "ratings_read_authed" on public.day_ratings;
create policy "ratings_read_authed" on public.day_ratings
  for select using (auth.role() = 'authenticated');

drop policy if exists "ratings_upsert_self" on public.day_ratings;
create policy "ratings_upsert_self" on public.day_ratings
  for insert with check (user_id = auth.uid());

drop policy if exists "ratings_update_self" on public.day_ratings;
create policy "ratings_update_self" on public.day_ratings
  for update using (user_id = auth.uid());

drop policy if exists "ratings_delete_self" on public.day_ratings;
create policy "ratings_delete_self" on public.day_ratings
  for delete using (user_id = auth.uid());

-- Comments: anyone authed can read; users can write their own.
drop policy if exists "comments_read_authed" on public.comments;
create policy "comments_read_authed" on public.comments
  for select using (auth.role() = 'authenticated');

drop policy if exists "comments_insert_self" on public.comments;
create policy "comments_insert_self" on public.comments
  for insert with check (user_id = auth.uid());

drop policy if exists "comments_update_own" on public.comments;
create policy "comments_update_own" on public.comments
  for update using (user_id = auth.uid());

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own" on public.comments
  for delete using (user_id = auth.uid());

-- Weather: read-only for authed users (writes are service-role/admin only).
drop policy if exists "weather_daily_read_authed" on public.weather_daily;
create policy "weather_daily_read_authed" on public.weather_daily
  for select using (auth.role() = 'authenticated');

drop policy if exists "weather_hourly_read_authed" on public.weather_hourly;
create policy "weather_hourly_read_authed" on public.weather_hourly
  for select using (auth.role() = 'authenticated');

drop policy if exists "weather_year_rain_read_authed" on public.weather_year_rain;
create policy "weather_year_rain_read_authed" on public.weather_year_rain
  for select using (auth.role() = 'authenticated');