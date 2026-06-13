-- Better Planner — add 'holiday' and 'lds_conference' event kinds.
-- Needed so the seed script can insert Halloween-style observances and
-- LDS General Conference as visually distinct calendar events.
--
-- Run this in the Supabase SQL Editor BEFORE re-running scripts/seed-events.ts.
-- Postgres requires enum value additions to be committed before they can be
-- used, so run this on its own (do not wrap with the inserts).
--
-- Safe to re-run.

alter type public.event_kind add value if not exists 'holiday';
alter type public.event_kind add value if not exists 'lds_conference';
