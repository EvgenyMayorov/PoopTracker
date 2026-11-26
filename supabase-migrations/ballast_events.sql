-- SQL for ballast_events table in Supabase

-- Create the separate table for ballast reset events (NOT in the main `events` table!)
-- This ensures ballast resets never appear in the general feed/friends/events history
create table if not exists public.ballast_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

-- Create index for efficient time-based queries per user
create index if not exists idx_ballast_events_user_created
on public.ballast_events (user_id, created_at desc);

-- Enable RLS
alter table public.ballast_events enable row level security;

-- Drop existing policies if any, then create RLS policies for user-scoped access

drop policy if exists "Users can read own ballast events" on public.ballast_events;
create policy "Users can read own ballast events"
on public.ballast_events for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own ballast events" on public.ballast_events;
create policy "Users can insert own ballast events"
on public.ballast_events for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own ballast events" on public.ballast_events;
create policy "Users can delete own ballast events"
on public.ballast_events for delete
using (auth.uid() = user_id);