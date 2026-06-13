-- Add preferred_cities to day_ratings so each user can mark which venue
-- cities they'd accept for a wedding on a given candidate date.
-- Empty array = none selected (valid; "no preference expressed yet").
alter table public.day_ratings
  add column if not exists preferred_cities public.city[] not null default '{}';
