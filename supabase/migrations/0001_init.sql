-- Bogi v1 schema: users, courses, plays, comparisons, friendships, want_to_play
-- Rankings are derived from `comparisons` at read time (see src/lib/ranking.ts),
-- not stored as a column anywhere.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users
-- Mirrors auth.users. Kept as its own table (rather than reading auth.users
-- directly) so we can safely expose name/avatar to friends via RLS.
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Auto-create a public.users row whenever someone signs up via Supabase Auth.
create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- courses
-- Shared directory of golf courses. Any signed-in user can add a course that
-- is missing; everyone can see the full list.
-- ---------------------------------------------------------------------------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  state text,
  public_or_private text not null default 'unknown'
    check (public_or_private in ('public', 'private', 'unknown')),
  photo_url text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create extension if not exists pg_trgm;
create index courses_name_trgm_idx on public.courses using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- plays
-- "I've played this course" — the set of courses eligible for a user's
-- ranked list and for comparisons. One row per (user, course).
-- ---------------------------------------------------------------------------
create table public.plays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  date_played date,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index plays_user_id_idx on public.plays (user_id);

-- ---------------------------------------------------------------------------
-- comparisons
-- Append-only log of head-to-head results. A user's ranked list is the
-- topological sort of these edges (winner ranks above loser). See
-- src/lib/ranking.ts for the derivation.
-- ---------------------------------------------------------------------------
create table public.comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  course_id_winner uuid not null references public.courses (id) on delete cascade,
  course_id_loser uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (course_id_winner <> course_id_loser)
);

create index comparisons_user_id_idx on public.comparisons (user_id);

-- ---------------------------------------------------------------------------
-- friendships
-- Simple directed request/accept model. user_id = requester.
-- ---------------------------------------------------------------------------
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  friend_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (user_id <> friend_id),
  unique (user_id, friend_id)
);

create index friendships_user_id_idx on public.friendships (user_id);
create index friendships_friend_id_idx on public.friendships (friend_id);

-- Helper: are the current user and `target_id` accepted friends?
-- security definer + stable so it can be used inside RLS policies on other
-- tables without those policies needing direct access to `friendships`.
create function public.is_friend_with(target_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.user_id = auth.uid() and f.friend_id = target_id)
        or (f.friend_id = auth.uid() and f.user_id = target_id)
      )
  );
$$;

-- Look up a single user by exact email, for sending a friend request. Only
-- exposes id/name/email (never avatar or anything else) since the caller
-- has no relationship to this person yet and normal `users` RLS wouldn't
-- otherwise let them see the row at all.
create function public.find_user_by_email(lookup_email text)
returns table (id uuid, name text, email text)
language sql
security definer
set search_path = public
stable
as $$
  select u.id, u.name, u.email
  from public.users u
  where u.email = lookup_email
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- want_to_play
-- A saved wish-list, separate from played/ranked courses.
-- ---------------------------------------------------------------------------
create table public.want_to_play (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index want_to_play_user_id_idx on public.want_to_play (user_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.courses enable row level security;
alter table public.plays enable row level security;
alter table public.comparisons enable row level security;
alter table public.friendships enable row level security;
alter table public.want_to_play enable row level security;

-- users: see yourself and your accepted friends; only update yourself.
create policy "users_select_self_or_friend" on public.users
  for select using (auth.uid() = id or public.is_friend_with(id));

create policy "users_update_self" on public.users
  for update using (auth.uid() = id);

-- courses: shared directory, readable/insertable by any signed-in user.
create policy "courses_select_all" on public.courses
  for select using (auth.role() = 'authenticated');

create policy "courses_insert_authenticated" on public.courses
  for insert with check (auth.uid() is not null);

-- plays: own rows, plus read access into accepted friends' plays.
create policy "plays_select_self_or_friend" on public.plays
  for select using (auth.uid() = user_id or public.is_friend_with(user_id));

create policy "plays_insert_self" on public.plays
  for insert with check (auth.uid() = user_id);

create policy "plays_update_self" on public.plays
  for update using (auth.uid() = user_id);

create policy "plays_delete_self" on public.plays
  for delete using (auth.uid() = user_id);

-- comparisons: own rows, plus read access into accepted friends' comparisons
-- (needed to render a friend's derived ranked list).
create policy "comparisons_select_self_or_friend" on public.comparisons
  for select using (auth.uid() = user_id or public.is_friend_with(user_id));

create policy "comparisons_insert_self" on public.comparisons
  for insert with check (auth.uid() = user_id);

create policy "comparisons_delete_self" on public.comparisons
  for delete using (auth.uid() = user_id);

-- friendships: either party can see a friendship; requester creates it;
-- either party can update (accept) or delete (unfriend/cancel/decline) it.
create policy "friendships_select_participant" on public.friendships
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friendships_insert_self" on public.friendships
  for insert with check (auth.uid() = user_id);

create policy "friendships_update_participant" on public.friendships
  for update using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friendships_delete_participant" on public.friendships
  for delete using (auth.uid() = user_id or auth.uid() = friend_id);

-- want_to_play: private to the owner.
create policy "want_to_play_select_self" on public.want_to_play
  for select using (auth.uid() = user_id);

create policy "want_to_play_insert_self" on public.want_to_play
  for insert with check (auth.uid() = user_id);

create policy "want_to_play_delete_self" on public.want_to_play
  for delete using (auth.uid() = user_id);
