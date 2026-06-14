-- Migration 0007: Wedding sub-events (ceremony, reception, dinner, etc.)
-- Run in Supabase SQL Editor.

create table if not exists public.wedding_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'custom',
  title text not null,
  location public.city,
  event_date date,
  event_time time,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wedding_events_sort_idx on public.wedding_events(sort_order, created_at);

-- RLS: all authenticated can read; authenticated can insert/edit their own rows;
-- any collaborator can edit (open collaboration model); only creator can delete.
alter table public.wedding_events enable row level security;

drop policy if exists "wedding_events_read_authed" on public.wedding_events;
create policy "wedding_events_read_authed" on public.wedding_events
  for select using (auth.role() = 'authenticated');

drop policy if exists "wedding_events_insert_authed" on public.wedding_events;
create policy "wedding_events_insert_authed" on public.wedding_events
  for insert with check (auth.role() = 'authenticated' and created_by = auth.uid());

drop policy if exists "wedding_events_update_authed" on public.wedding_events;
create policy "wedding_events_update_authed" on public.wedding_events
  for update using (auth.role() = 'authenticated');

drop policy if exists "wedding_events_delete_own" on public.wedding_events;
create policy "wedding_events_delete_own" on public.wedding_events
  for delete using (created_by = auth.uid() or public.is_admin());
