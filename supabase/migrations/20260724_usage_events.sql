-- Per-user usage analytics, written by src/lib/analytics.js and read by the
-- /admin/analytics dashboard. One row per event; screen time arrives as
-- "page_view" rows carrying duration_ms, quiz answers as "answer" rows.
-- No roles table — reads are gated by the admin email, like recordings.

create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Denormalized so the dashboard can show who a row belongs to without
  -- needing access to auth.users
  email text,
  session_id uuid not null,
  event text not null,
  path text,
  category text,
  mode text,
  item text,
  duration_ms integer,
  meta jsonb not null default '{}'::jsonb,
  -- Client-side event time; created_at is arrival time (events are batched,
  -- so they can differ by a few seconds)
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_time
  on public.usage_events (user_id, occurred_at desc);
create index if not exists usage_events_time
  on public.usage_events (occurred_at desc);

alter table public.usage_events enable row level security;

create policy "Users insert own usage events"
  on public.usage_events for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Admin read usage events"
  on public.usage_events for select to authenticated
  using ((auth.jwt() ->> 'email') = 'subhransu.kumar.mishra@gmail.com');
