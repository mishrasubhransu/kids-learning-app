-- Per-message daily throttle for server-side Telegram error alerts
-- (api/_lib/telegram-alert.js). One row per (message-hash, UTC day);
-- bump_alert atomically increments and returns the new count so callers
-- can stop sending once a message has gone out 4 times that day.

create table if not exists public.alert_throttle (
  key text not null,
  day date not null,
  count integer not null default 1,
  -- Kept for debugging: the throttle key is a hash, this shows what it was
  last_message text,
  updated_at timestamptz not null default now(),
  primary key (key, day)
);

alter table public.alert_throttle enable row level security;
-- No policies on purpose: only the service role (bypasses RLS) touches this.

create or replace function public.bump_alert(p_key text, p_message text)
returns integer
language sql
security definer
set search_path = public
as $$
  delete from public.alert_throttle
    where day < (now() at time zone 'utc')::date - 7;
  insert into public.alert_throttle as t (key, day, count, last_message)
  values (p_key, (now() at time zone 'utc')::date, 1, p_message)
  on conflict (key, day)
  do update set count = t.count + 1,
                last_message = excluded.last_message,
                updated_at = now()
  returning count;
$$;

-- Alerts are service-role only; keep browser clients away from the counter
revoke execute on function public.bump_alert(text, text)
  from public, anon, authenticated;
