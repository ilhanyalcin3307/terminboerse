-- Persistent doctor profile view/impression counters (replaces in-memory-only KV fallback)

create table if not exists public.doctor_view_counters (
  doctor_id text primary key,
  profile_views integer not null default 0,
  list_impressions integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_doctor_view_counters_profile_views
  on public.doctor_view_counters (profile_views desc);

alter table public.doctor_view_counters enable row level security;
-- No public policies. Server-side service role access only.
