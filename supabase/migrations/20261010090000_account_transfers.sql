-- Account transfer codes: a parent issues a short-lived code from their
-- Parent Zone, signs in as the child (or grandparent) elsewhere and claims
-- it there. The claim copies children, family members, settings and the
-- clips/photos behind them into the claiming account.
--
-- Service role only — no RLS policies on purpose. The API route
-- (api/transfer-account.js) is the sole writer and reader; a code is
-- worthless without the bearer token of a signed-in claimant.

create table if not exists public.account_transfers (
  code text primary key,
  from_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_by uuid references auth.users (id) on delete set null,
  claimed_at timestamptz
);

alter table public.account_transfers enable row level security;
