alter table public.arzt_custom_profiles
  add column if not exists services jsonb not null default '[]'::jsonb,
  add column if not exists languages jsonb not null default '[]'::jsonb,
  add column if not exists insurance_models jsonb not null default '[]'::jsonb,
  add column if not exists accepts_new_patients boolean;