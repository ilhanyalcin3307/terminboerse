# Supabase Next Steps (Arztbereich)

## 1) Set environment variables
Set these in Vercel (Production + Preview):
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

## 2) Apply SQL schema
Run SQL in this order:
- supabase/migrations/20260809_arztbereich_init.sql
- supabase/migrations/20260809_arztbereich_step2.sql

This creates:
- public.arzt_accounts
- public.arzt_account_doctors
- public.arzt_custom_profiles
- public.arzt_registration_requests

## 3) Seed first admin user
1. In Supabase Auth, create user: kontakt@terminboerse.at
2. Run step2 SQL (it upserts admin into public.arzt_accounts automatically).

Manual fallback SQL (if needed):
```sql
insert into public.arzt_accounts (user_id, email, role, is_active)
select id, email, 'admin', true
from auth.users
where email = 'kontakt@terminboerse.at'
on conflict (user_id) do update
set role = excluded.role,
    is_active = excluded.is_active;
```

## 3.1) Quick verification queries
```sql
select id, email, role, is_active, created_at
from public.arzt_accounts
where lower(email) = 'kontakt@terminboerse.at';

select id, email, created_at
from auth.users
where lower(email) = 'kontakt@terminboerse.at';
```

## 4) Planned code switch order
1. Replace custom login endpoint with Supabase Auth sign-in.
2. Move approvals and doctor-account mapping to Supabase tables.
3. Replace lib/arztbereichAdminStore.ts with Supabase-backed implementation.
4. Re-enable /arztbereich page and navbar entry.

## 5) Rollout strategy
- Keep Arztbereich disabled until step 1-3 are green in production.
- Ship in one deploy, then do smoke tests:
  - Admin login
  - Registration request
  - Approve / reject
  - Doctor login

## 6) Security notes
- Never expose SUPABASE_SERVICE_ROLE_KEY to client code.
- Use service-role key only in server route handlers/lib files.
- Keep RLS enabled and enforce role checks in backend APIs.
