-- Wedding Planner schema
-- Run via Supabase apply_migration MCP tool.

-- ============================================================================
-- 1. Profiles
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  avatar_color text not null default '#6366f1',
  created_at timestamptz not null default now()
);

-- Trigger: when a new auth.users row is inserted, create a matching profiles row
-- using display_name from the user's raw_user_meta_data (set during signup).
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
  values (new.id, new.email, v_display_name, v_color);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- 2. Events on the calendar (BYU football, holidays, custom)
-- ============================================================================
create type public.event_kind as enum (
  'byu_football_home',
  'byu_football_away',
  'federal_holiday',
  'custom'
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  kind public.event_kind not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index events_date_idx on public.events(date);

-- ============================================================================
-- 3. Per-user day ratings (stars + veto + shortlist)
-- ============================================================================
create table public.day_ratings (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  stars smallint check (stars between 1 and 5),
  vetoed boolean not null default false,
  shortlisted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);
create index day_ratings_date_idx on public.day_ratings(date);

-- ============================================================================
-- 4. Threaded comments per day
-- ============================================================================
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  deleted_at timestamptz
);
create index comments_date_idx on public.comments(date);

-- ============================================================================
-- 5. Historical weather (10-year averages)
-- ============================================================================
create type public.city as enum ('lindon', 'highland', 'lehi', 'orem', 'alpine');

create table public.weather_daily (
  city public.city not null,
  month_day char(4) not null,  -- 'MMDD'
  mean_high_f numeric(4,1) not null,
  mean_low_f numeric(4,1) not null,
  rain_probability numeric(4,3) not null,
  primary key (city, month_day)
);

create table public.weather_hourly (
  city public.city not null,
  month_day char(4) not null,
  hour smallint not null check (hour between 0 and 23),
  mean_temp_f numeric(4,1) not null,
  mean_precip_mm numeric(5,2) not null,
  mean_wind_mph numeric(4,1) not null,
  primary key (city, month_day, hour)
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

-- Profiles: anyone authed can read; only own row can update
create policy "profiles_read_authed" on public.profiles
  for select using (auth.role() = 'authenticated');
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- Events: anyone authed can read; insert as self; update/delete own
create policy "events_read_authed" on public.events
  for select using (auth.role() = 'authenticated');
create policy "events_insert_self" on public.events
  for insert with check (created_by = auth.uid() and kind = 'custom');
create policy "events_update_own" on public.events
  for update using (created_by = auth.uid());
create policy "events_delete_own" on public.events
  for delete using (created_by = auth.uid());

-- Day ratings: anyone authed can read; only own rows writable
create policy "ratings_read_authed" on public.day_ratings
  for select using (auth.role() = 'authenticated');
create policy "ratings_upsert_self" on public.day_ratings
  for insert with check (user_id = auth.uid());
create policy "ratings_update_self" on public.day_ratings
  for update using (user_id = auth.uid());
create policy "ratings_delete_self" on public.day_ratings
  for delete using (user_id = auth.uid());

-- Comments: anyone authed can read; insert/edit/delete own
create policy "comments_read_authed" on public.comments
  for select using (auth.role() = 'authenticated');
create policy "comments_insert_self" on public.comments
  for insert with check (user_id = auth.uid());
create policy "comments_update_own" on public.comments
  for update using (user_id = auth.uid());
create policy "comments_delete_own" on public.comments
  for delete using (user_id = auth.uid());

-- Weather: read-only for authed users (writes via service role)
create policy "weather_daily_read_authed" on public.weather_daily
  for select using (auth.role() = 'authenticated');
create policy "weather_hourly_read_authed" on public.weather_hourly
  for select using (auth.role() = 'authenticated');
