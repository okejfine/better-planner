-- Migration 0008: iCal imported events (one-time upload per user, replace strategy)
-- Run in Supabase SQL Editor.

create table if not exists public.imported_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  title text not null,
  uid text not null,
  source_filename text,
  created_at timestamptz not null default now()
);

create index if not exists imported_events_date_idx on public.imported_events(date);
create index if not exists imported_events_user_idx on public.imported_events(user_id);

-- RLS: all authenticated can read; users manage only their own rows.
alter table public.imported_events enable row level security;

drop policy if exists "imported_events_read_authed" on public.imported_events;
create policy "imported_events_read_authed" on public.imported_events
  for select using (auth.role() = 'authenticated');

drop policy if exists "imported_events_insert_self" on public.imported_events;
create policy "imported_events_insert_self" on public.imported_events
  for insert with check (user_id = auth.uid());

drop policy if exists "imported_events_delete_self" on public.imported_events;
create policy "imported_events_delete_self" on public.imported_events
  for delete using (user_id = auth.uid());
