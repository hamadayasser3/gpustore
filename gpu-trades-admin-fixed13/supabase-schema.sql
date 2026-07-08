-- ============================================================================
-- GPU Trades — Admin Roles & Permissions schema (Phase 1)
-- Run this once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Staff profiles (one row per staff/admin account, linked to Supabase Auth)
-- ----------------------------------------------------------------------------
create table if not exists public.staff_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null unique,
  role        text not null check (role in (
                'Super Admin', 'Admin', 'Warehouse', 'Sales', 'Customer Support', 'Accountant'
              )),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. Staff invites (Super Admin invites a new staff member by email + role;
--    the invited person then completes signup themselves on staff-signup.html)
-- ----------------------------------------------------------------------------
create table if not exists public.staff_invites (
  id          bigint generated always as identity primary key,
  email       text not null unique,
  full_name   text,
  role        text not null check (role in (
                'Super Admin', 'Admin', 'Warehouse', 'Sales', 'Customer Support', 'Accountant'
              )),
  invited_by  uuid references public.staff_profiles(id) on delete set null,
  used        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3. Activity log (audit trail of staff actions)
-- ----------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id          bigint generated always as identity primary key,
  staff_id    uuid references public.staff_profiles(id) on delete set null,
  staff_name  text,
  action      text not null,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. Helper functions (SECURITY DEFINER so they can read staff_profiles
--    without recursive-RLS problems, and so writes only ever happen through
--    a controlled, validated path instead of raw client inserts).
-- ----------------------------------------------------------------------------
create or replace function public.current_staff_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.staff_profiles where id = auth.uid() and is_active = true;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select role = 'Super Admin' from public.staff_profiles where id = auth.uid() and is_active = true),
    false
  );
$$;

create or replace function public.staff_count()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select count(*) from public.staff_profiles;
$$;

-- First-ever Super Admin bootstrap (only works while staff_profiles is empty)
create or replace function public.bootstrap_super_admin(p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.staff_profiles) > 0 then
    raise exception 'STAFF_ALREADY_EXISTS';
  end if;

  insert into public.staff_profiles (id, full_name, email, role, is_active)
  values (auth.uid(), p_full_name, auth.jwt() ->> 'email', 'Super Admin', true);
end;
$$;

-- Invited staff member completes their own registration
create or replace function public.accept_staff_invite(p_full_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.staff_invites;
begin
  select * into v_invite
  from public.staff_invites
  where lower(email) = lower(auth.jwt() ->> 'email') and used = false
  limit 1;

  if v_invite is null then
    raise exception 'NO_VALID_INVITE';
  end if;

  insert into public.staff_profiles (id, full_name, email, role, is_active)
  values (
    auth.uid(),
    coalesce(nullif(p_full_name, ''), v_invite.full_name, split_part(auth.jwt() ->> 'email', '@', 1)),
    auth.jwt() ->> 'email',
    v_invite.role,
    true
  );

  update public.staff_invites set used = true where id = v_invite.id;

  return v_invite.role;
end;
$$;

-- Log an activity row for the currently authenticated staff member
create or replace function public.log_activity(p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_logs (staff_id, staff_name, action)
  select id, full_name, p_action from public.staff_profiles where id = auth.uid();
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Row Level Security
-- ----------------------------------------------------------------------------
alter table public.staff_profiles enable row level security;
alter table public.staff_invites  enable row level security;
alter table public.activity_logs  enable row level security;

-- staff_profiles: reads
drop policy if exists "staff can view own row" on public.staff_profiles;
create policy "staff can view own row" on public.staff_profiles
  for select using (auth.uid() = id);

drop policy if exists "admins can view all staff" on public.staff_profiles;
create policy "admins can view all staff" on public.staff_profiles
  for select using (public.current_staff_role() in ('Super Admin', 'Admin'));

-- staff_profiles: only Super Admin can change role / is_active of ANY row
drop policy if exists "super admin can update staff" on public.staff_profiles;
create policy "super admin can update staff" on public.staff_profiles
  for update using (public.is_super_admin()) with check (public.is_super_admin());

-- staff_profiles: only Super Admin can remove a staff account
drop policy if exists "super admin can delete staff" on public.staff_profiles;
create policy "super admin can delete staff" on public.staff_profiles
  for delete using (public.is_super_admin());

-- NOTE: there is intentionally NO insert policy on staff_profiles.
-- Rows can only be created via bootstrap_super_admin() or accept_staff_invite(),
-- which run as SECURITY DEFINER and validate everything server-side.

-- staff_invites: Super Admin manages invites
drop policy if exists "super admin manages invites" on public.staff_invites;
create policy "super admin manages invites" on public.staff_invites
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- staff_invites: an invited person can see their own pending invite (by email)
drop policy if exists "invited user can read own invite" on public.staff_invites;
create policy "invited user can read own invite" on public.staff_invites
  for select using (lower(email) = lower(auth.jwt() ->> 'email'));

-- activity_logs: any authenticated staff member can view the audit trail
drop policy if exists "staff can view activity log" on public.activity_logs;
create policy "staff can view activity log" on public.activity_logs
  for select using (public.current_staff_role() is not null);

-- NOTE: no insert policy on activity_logs either — rows are only added
-- through log_activity(), which stamps the real authenticated staff id.

-- ============================================================================
-- Done. Next: open admin.html -> since staff_profiles is empty, you'll get
-- the "create the first Super Admin" screen automatically.
-- ============================================================================
