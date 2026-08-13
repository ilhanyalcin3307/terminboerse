-- Durable calendar persistence for Arztbereich without Vercel KV

create table if not exists public.arzt_scheduling_status (
  doctor_id text primary key,
  profile_updated boolean not null default false,
  calendar_connected boolean not null default false,
  calendar_id text,
  scheduling_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.arzt_google_calendar_connections (
  doctor_id text primary key,
  calendar_id text not null,
  google_email text,
  refresh_token_encrypted text not null,
  access_token_encrypted text,
  access_token_expires_at bigint,
  scope text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.arzt_scheduling_status enable row level security;
alter table public.arzt_google_calendar_connections enable row level security;

-- Service role writes bypass RLS; deny direct client-side access by not creating public policies.
