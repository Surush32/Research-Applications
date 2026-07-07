-- Profiles table linked to Supabase Auth users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  username text unique,
  bio text,
  avatar_url text,
  website text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

-- Anyone authenticated can read profiles (for public profile pages)
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can insert their own profile (fallback if trigger fails)
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Users can only update their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at in sync
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Index for username lookups
create index profiles_username_idx on public.profiles (username);
