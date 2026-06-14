-- Migration 0006: Wedding settings (final date) + admin helper
-- Run in Supabase SQL Editor.

-- ============================================================================
-- is_admin() helper — checks whether the current JWT user is an admin email
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security invoker
stable
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid()
      and lower(email) = any(array['king@hoth.com','emward123@live.com'])
  );
$$;

-- ============================================================================
-- wedding_settings: singleton row (id = 1) holding global wedding config
-- ============================================================================
create table if not exists public.wedding_settings (
  id integer primary key default 1,
  final_date date,
  set_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);

-- Ensure the singleton row exists
insert into public.wedding_settings (id) values (1) on conflict (id) do nothing;

-- RLS
alter table public.wedding_settings enable row level security;

drop policy if exists "wedding_settings_read_authed" on public.wedding_settings;
create policy "wedding_settings_read_authed" on public.wedding_settings
  for select using (auth.role() = 'authenticated');

drop policy if exists "wedding_settings_update_admin" on public.wedding_settings;
create policy "wedding_settings_update_admin" on public.wedding_settings
  for update using (public.is_admin());

drop policy if exists "wedding_settings_insert_admin" on public.wedding_settings;
create policy "wedding_settings_insert_admin" on public.wedding_settings
  for insert with check (public.is_admin());
