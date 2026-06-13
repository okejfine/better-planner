-- Add newly requested city options for expanded weather/location planning.
alter type public.city add value if not exists 'washington_dc';
alter type public.city add value if not exists 'holiday_ut';
alter type public.city add value if not exists 'cabo_mx';
alter type public.city add value if not exists 'honolulu_hi';
alter type public.city add value if not exists 'maui_hi';
alter type public.city add value if not exists 'cancun_mx';
alter type public.city add value if not exists 'huntington_beach_ca';
