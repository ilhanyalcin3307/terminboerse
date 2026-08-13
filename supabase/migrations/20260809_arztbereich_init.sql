-- Arztbereich base schema for Supabase
-- Run in Supabase SQL editor or via supabase migration workflow.

create extension if not exists pgcrypto;

create table if not exists public.arzt_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'doctor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arzt_account_doctors (
  id uuid primary key default gen_random_uuid(),
  arzt_account_id uuid not null references public.arzt_accounts(id) on delete cascade,
  doctor_id text not null,
  created_at timestamptz not null default now(),
  unique (arzt_account_id, doctor_id)
);

create table if not exists public.arzt_custom_profiles (
  id text primary key,
  name text not null,
  specialty text not null,
  district text not null,
  address text not null,
  provider_type text not null check (provider_type in ('OEGK', 'Wahlarzt', 'Privat')),
  phone text,
  email text,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.arzt_registration_requests (
  id uuid primary key default gen_random_uuid(),
  registration_type text not null check (registration_type in ('existing', 'new')),
  selected_doctor_id text,
  doctor_name text,
  doctor_email text not null,
  doctor_phone text not null,
  specialty text,
  clinic_address text,
  district text,
  provider_type text not null check (provider_type in ('OEGK', 'Wahlarzt', 'Privat')),
  note text,
  password_sha256 text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by text,
  review_note text,
  approved_doctor_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_arzt_registration_requests_status_created_at
  on public.arzt_registration_requests (status, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_arzt_accounts_updated_at on public.arzt_accounts;
create trigger trg_arzt_accounts_updated_at
before update on public.arzt_accounts
for each row
execute function public.set_updated_at();

drop trigger if exists trg_arzt_custom_profiles_updated_at on public.arzt_custom_profiles;
create trigger trg_arzt_custom_profiles_updated_at
before update on public.arzt_custom_profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_arzt_registration_requests_updated_at on public.arzt_registration_requests;
create trigger trg_arzt_registration_requests_updated_at
before update on public.arzt_registration_requests
for each row
execute function public.set_updated_at();

alter table public.arzt_accounts enable row level security;
alter table public.arzt_account_doctors enable row level security;
alter table public.arzt_custom_profiles enable row level security;
alter table public.arzt_registration_requests enable row level security;

-- Minimal read policy for authenticated users on custom profiles.
-- Admin/doctor filtering will still be enforced in backend APIs.
drop policy if exists "authenticated read arzt_custom_profiles" on public.arzt_custom_profiles;
create policy "authenticated read arzt_custom_profiles"
  on public.arzt_custom_profiles
  for select
  to authenticated
  using (true);
