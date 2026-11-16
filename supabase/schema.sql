-- Run this file in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'New Bro',
  phone text unique,
  role text not null default 'member' check (role in ('admin','member')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.profiles add column if not exists is_active boolean not null default true;

create table if not exists public.pushup_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  entry_date date not null default current_date,
  reps integer not null check (reps between 1 and 5000),
  sets integer not null check (sets between 1 and 100),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists pushup_entries_date_idx on public.pushup_entries(entry_date desc);
create index if not exists pushup_entries_user_date_idx on public.pushup_entries(user_id, entry_date desc);

-- Create a profile automatically when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    nullif(new.raw_user_meta_data->>'phone','')
  );
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.pushup_entries enable row level security;
create policy "Authenticated users can view crew profiles" on public.profiles for select to authenticated using (true);
create policy "Users can update their own basic profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = 'member');
create policy "Admins can manage profiles" on public.profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Crew can view workout totals" on public.pushup_entries for select to authenticated using (true);
create policy "Members insert their own workouts" on public.pushup_entries for insert to authenticated with check (user_id = auth.uid());
create policy "Members update their own workouts" on public.pushup_entries for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Members delete their own workouts" on public.pushup_entries for delete to authenticated using (user_id = auth.uid());

-- IMPORTANT: after your first account signs up, promote it to admin in SQL Editor:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'YOUR_EMAIL');
