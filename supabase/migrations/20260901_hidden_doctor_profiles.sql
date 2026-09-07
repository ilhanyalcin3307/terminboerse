-- Admin-managed public visibility for OGD doctor records.
-- Hidden records remain available in the source dataset and can be restored.

create table if not exists public.arzt_hidden_profiles (
  doctor_id text primary key,
  hidden_at timestamptz not null default now(),
  hidden_by text not null
);

create index if not exists idx_arzt_hidden_profiles_hidden_at
  on public.arzt_hidden_profiles (hidden_at desc);

alter table public.arzt_hidden_profiles enable row level security;
-- No public policies. Server-side service role access only.