-- Add optional direct external online booking URL to custom doctor profiles
alter table public.arzt_custom_profiles
  add column if not exists booking_url text;
