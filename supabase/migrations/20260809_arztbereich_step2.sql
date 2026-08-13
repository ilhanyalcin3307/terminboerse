-- Step 2 after initial Arztbereich schema
-- 1) Add auth user link to registration requests (needed for approval flow)
-- 2) Seed/Upsert admin account mapping

alter table public.arzt_registration_requests
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_arzt_registration_requests_auth_user_id
  on public.arzt_registration_requests (auth_user_id);

-- Ensure admin account exists in app-level role table
insert into public.arzt_accounts (user_id, email, role, is_active)
select id, email, 'admin', true
from auth.users
where lower(email) = 'kontakt@terminboerse.at'
on conflict (user_id) do update
set email = excluded.email,
    role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now();
