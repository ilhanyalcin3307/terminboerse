alter table public.arzt_custom_profiles
  add column if not exists working_hours jsonb not null default '[]'::jsonb;