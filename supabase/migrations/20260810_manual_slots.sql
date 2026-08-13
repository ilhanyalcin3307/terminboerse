-- Manual free-slot persistence for Arztbereich (3-day rolling window in app logic)

create table if not exists public.arzt_manual_slots (
  id uuid primary key default gen_random_uuid(),
  doctor_id text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'free' check (status in ('free', 'booked', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists idx_arzt_manual_slots_doctor_start
  on public.arzt_manual_slots (doctor_id, starts_at);

create index if not exists idx_arzt_manual_slots_status_start
  on public.arzt_manual_slots (status, starts_at);

drop trigger if exists trg_arzt_manual_slots_updated_at on public.arzt_manual_slots;
create trigger trg_arzt_manual_slots_updated_at
before update on public.arzt_manual_slots
for each row
execute function public.set_updated_at();

alter table public.arzt_manual_slots enable row level security;
-- No public policies. Server-side service role access only.
