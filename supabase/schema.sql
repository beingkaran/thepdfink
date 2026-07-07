-- thepdf.ink — Supabase schema for Pro entitlement.
-- Run once in the SQL Editor of your (new, dedicated) thepdf.ink Supabase project.
--
-- Model: Supabase Auth holds the accounts (auth.users). Each user gets one row
-- in public.profiles carrying the Pro flag:
--   is_pro = true  → Pro user  (your "isProUser 1")
--   is_pro = false → free user (your "isProUser 0")
--
-- The flag is NEVER writable from the browser. It is flipped only by:
--   • the Lemon Squeezy webhook (server-side, service_role key), or
--   • you, manually, in the Table Editor (the admin override you asked for).

-- 1. Profiles: one row per auth user.
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text unique not null,
  is_pro     boolean not null default false,
  pro_since  timestamptz,
  created_at timestamptz not null default now()
);

-- 2. Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Row Level Security: a signed-in user may READ only their own profile.
--    There are deliberately NO insert/update/delete policies for the anon or
--    authenticated roles, so no client can ever set is_pro. The service_role
--    key (used by the webhook) bypasses RLS.
alter table public.profiles enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- 4. Backfill profiles for any users that already exist in this project.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;
