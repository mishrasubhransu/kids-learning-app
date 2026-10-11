-- Shared families: several Google accounts, one set of children.
--
-- A family is keyed by its OWNER's user id — every existing row keeps its
-- user_id, nothing moves, and an account with no family_accounts row is
-- simply the owner of its own family. Other accounts join through a
-- short-lived invite code and get a role:
--
--   parent — identical control over every child, family member and
--            setting; only the owner can remove another parent.
--   child  — bound to ONE child profile (the kid's own Google login on
--            the kid's device). Can play and record progress, can update
--            only its own profile row, never reaches the Parent Zone.
--
-- One family per account: an account can't join while it belongs to a
-- family or has members of its own, and at most 5 accounts can be linked
-- to a family. Those two rules are what keep a future paid tier from being
-- shared with the whole street.
--
-- Every RLS policy on the family tables moves from "my uid" to "my
-- family's uid" via family_of(); write policies additionally require a
-- parent role. The helpers are security definer so a policy check is one
-- indexed lookup and never recurses into family_accounts' own RLS.

-- ---------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------

create table if not exists public.family_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('parent', 'child')),
  -- a child login is bound to exactly one profile; deleting the profile
  -- unlinks the login (it falls back to its own, empty family)
  child_profile_id uuid references public.child_profiles (id) on delete cascade,
  -- snapshot so parents can see who's linked without reading auth.users
  email text,
  created_at timestamptz not null default now(),
  check ((role = 'child') = (child_profile_id is not null)),
  check (user_id <> family_id)
);

create unique index if not exists family_accounts_one_login_per_child
  on public.family_accounts (child_profile_id)
  where child_profile_id is not null;
create index if not exists family_accounts_family
  on public.family_accounts (family_id);

create table if not exists public.family_invites (
  code text primary key,
  family_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('parent', 'child')),
  child_profile_id uuid references public.child_profiles (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_by uuid references auth.users (id) on delete set null,
  claimed_at timestamptz
);

alter table public.family_accounts enable row level security;
alter table public.family_invites enable row level security;
-- family_invites: no policies — only the RPCs below touch it

-- ---------------------------------------------------------------------
-- helpers (stable: one lookup per statement, inlined into policies)
-- ---------------------------------------------------------------------

create or replace function public.family_of(p_user uuid)
returns uuid
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select family_id from public.family_accounts where user_id = p_user),
    p_user
  );
$$;

create or replace function public.family_role(p_user uuid)
returns text
language sql stable security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.family_accounts where user_id = p_user),
    'owner'
  );
$$;

create or replace function public.linked_child(p_user uuid)
returns uuid
language sql stable security definer
set search_path = public
as $$
  select child_profile_id from public.family_accounts where user_id = p_user;
$$;

create or replace function public.is_family_parent()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.family_role(auth.uid()) in ('owner', 'parent');
$$;

grant execute on function public.family_of(uuid) to authenticated;
grant execute on function public.family_role(uuid) to authenticated;
grant execute on function public.linked_child(uuid) to authenticated;
grant execute on function public.is_family_parent() to authenticated;

-- ---------------------------------------------------------------------
-- family_accounts: members see their family's roster; writes via RPC
-- ---------------------------------------------------------------------

create policy "Family sees its accounts"
  on public.family_accounts for select to authenticated
  using (family_id = public.family_of(auth.uid()));

-- ---------------------------------------------------------------------
-- child_profiles
-- ---------------------------------------------------------------------

drop policy if exists "Parents manage own children" on public.child_profiles;

create policy "Family reads children"
  on public.child_profiles for select to authenticated
  using (user_id = public.family_of(auth.uid()));

create policy "Parents add children"
  on public.child_profiles for insert to authenticated
  with check (user_id = public.family_of(auth.uid()) and public.is_family_parent());

-- a child login may update its own row (view counters, earned stickers)
create policy "Parents and own login update children"
  on public.child_profiles for update to authenticated
  using (
    user_id = public.family_of(auth.uid())
    and (public.is_family_parent() or id = public.linked_child(auth.uid()))
  )
  with check (
    user_id = public.family_of(auth.uid())
    and (public.is_family_parent() or id = public.linked_child(auth.uid()))
  );

create policy "Parents delete children"
  on public.child_profiles for delete to authenticated
  using (user_id = public.family_of(auth.uid()) and public.is_family_parent());

-- ---------------------------------------------------------------------
-- family_members
-- ---------------------------------------------------------------------

drop policy if exists "Parents manage own family" on public.family_members;

create policy "Family reads members"
  on public.family_members for select to authenticated
  using (user_id = public.family_of(auth.uid()));

create policy "Parents write members"
  on public.family_members for insert to authenticated
  with check (user_id = public.family_of(auth.uid()) and public.is_family_parent());

create policy "Parents update members"
  on public.family_members for update to authenticated
  using (user_id = public.family_of(auth.uid()) and public.is_family_parent())
  with check (user_id = public.family_of(auth.uid()) and public.is_family_parent());

create policy "Parents delete members"
  on public.family_members for delete to authenticated
  using (user_id = public.family_of(auth.uid()) and public.is_family_parent());

-- ---------------------------------------------------------------------
-- user_settings (family-wide prefs: letter case, recorded voice grant…)
-- ---------------------------------------------------------------------

drop policy if exists "Users manage own settings" on public.user_settings;

create policy "Family reads settings"
  on public.user_settings for select to authenticated
  using (user_id = public.family_of(auth.uid()));

create policy "Parents write settings"
  on public.user_settings for insert to authenticated
  with check (user_id = public.family_of(auth.uid()) and public.is_family_parent());

create policy "Parents update settings"
  on public.user_settings for update to authenticated
  using (user_id = public.family_of(auth.uid()) and public.is_family_parent())
  with check (user_id = public.family_of(auth.uid()) and public.is_family_parent());

create policy "Parents delete settings"
  on public.user_settings for delete to authenticated
  using (user_id = public.family_of(auth.uid()) and public.is_family_parent());

-- ---------------------------------------------------------------------
-- usage_events: recorded by the account on the device, readable by the
-- family's parents (the per-child progress panel)
-- ---------------------------------------------------------------------

alter table public.usage_events
  add column if not exists family_id uuid;

update public.usage_events set family_id = user_id where family_id is null;

create index if not exists usage_events_family_child_time
  on public.usage_events (family_id, child_id, occurred_at desc);

drop policy if exists "Users insert own usage events" on public.usage_events;

create policy "Users insert own usage events"
  on public.usage_events for insert to authenticated
  with check (
    auth.uid() = user_id
    and (family_id is null or family_id = public.family_of(auth.uid()))
  );

create policy "Parents read family usage events"
  on public.usage_events for select to authenticated
  using (family_id = public.family_of(auth.uid()) and public.is_family_parent());

-- ---------------------------------------------------------------------
-- storage: family-photos folders are named after the family (owner) id
-- ---------------------------------------------------------------------

drop policy if exists "Own folder insert family photos" on storage.objects;
drop policy if exists "Own folder update family photos" on storage.objects;
drop policy if exists "Own folder delete family photos" on storage.objects;

create policy "Family folder insert family photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] = public.family_of(auth.uid())::text
    and public.is_family_parent()
  );

create policy "Family folder update family photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] = public.family_of(auth.uid())::text
    and public.is_family_parent()
  )
  with check (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] = public.family_of(auth.uid())::text
    and public.is_family_parent()
  );

create policy "Family folder delete family photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] = public.family_of(auth.uid())::text
    and public.is_family_parent()
  );

-- ---------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------

-- 6 chars from an alphabet without 0/O or 1/I, drawn from a v4 uuid's
-- random bytes (256 % 32 = 0, so each position is uniform)
create or replace function public.mint_invite_code()
returns text
language plpgsql volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  code text := '';
  i integer;
begin
  for i in 0..5 loop
    code := code || substr(alphabet, 1 + (get_byte(bytes, i) % 32), 1);
  end loop;
  return code;
end;
$$;

revoke execute on function public.mint_invite_code() from public, anon, authenticated;

create or replace function public.issue_family_invite(
  p_role text,
  p_child_profile_id uuid default null
)
returns table (code text, expires_at timestamptz)
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_family uuid;
  v_code text;
  v_expires timestamptz;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;
  v_family := public.family_of(v_uid);
  if not public.is_family_parent() then
    raise exception 'Only a parent can invite';
  end if;
  if p_role not in ('parent', 'child') then
    raise exception 'Unknown role';
  end if;
  if p_role = 'child' then
    if p_child_profile_id is null then
      raise exception 'Pick which child this login is for';
    end if;
    if not exists (
      select 1 from public.child_profiles
       where id = p_child_profile_id and user_id = v_family
    ) then
      raise exception 'Child not found';
    end if;
    if exists (
      select 1 from public.family_accounts where child_profile_id = p_child_profile_id
    ) then
      raise exception 'That child already has a linked login — unlink it first';
    end if;
  else
    p_child_profile_id := null;
  end if;
  if (select count(*) from public.family_accounts where family_id = v_family) >= 5 then
    raise exception 'A family can have at most 5 linked accounts';
  end if;

  -- expired codes everywhere, and this family's earlier unclaimed code for
  -- the same purpose (one live code per purpose keeps the screen honest)
  delete from public.family_invites
   where family_invites.expires_at < now()
      or (family_id = v_family
          and role = p_role
          and child_profile_id is not distinct from p_child_profile_id
          and claimed_at is null);

  loop
    v_code := public.mint_invite_code();
    exit when not exists (select 1 from public.family_invites where family_invites.code = v_code);
  end loop;
  v_expires := now() + interval '15 minutes';

  insert into public.family_invites (code, family_id, role, child_profile_id, created_by, expires_at)
  values (v_code, v_family, p_role, p_child_profile_id, v_uid, v_expires);

  return query select v_code, v_expires;
end;
$$;

create or replace function public.join_family(p_code text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  inv public.family_invites%rowtype;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;
  select * into inv
    from public.family_invites
   where family_invites.code = v_code and claimed_at is null and family_invites.expires_at > now();
  if not found then
    raise exception 'That code is not valid or has expired';
  end if;
  if inv.family_id = v_uid then
    raise exception 'That is your own family''s code — use it on the other account';
  end if;
  if exists (select 1 from public.family_accounts where user_id = v_uid) then
    raise exception 'This account already belongs to a family — leave it first';
  end if;
  if exists (select 1 from public.family_accounts where family_id = v_uid) then
    raise exception 'This account has linked accounts of its own — remove them first';
  end if;
  if inv.role = 'child' then
    if not exists (select 1 from public.child_profiles where id = inv.child_profile_id) then
      raise exception 'That child profile no longer exists';
    end if;
    if exists (select 1 from public.family_accounts where child_profile_id = inv.child_profile_id) then
      raise exception 'That child already has a linked login';
    end if;
  end if;
  if (select count(*) from public.family_accounts where family_id = inv.family_id) >= 5 then
    raise exception 'That family already has 5 linked accounts';
  end if;

  insert into public.family_accounts (user_id, family_id, role, child_profile_id, email)
  values (v_uid, inv.family_id, inv.role, inv.child_profile_id, auth.jwt() ->> 'email');

  update public.family_invites
     set claimed_by = v_uid, claimed_at = now()
   where family_invites.code = v_code;

  return jsonb_build_object(
    'family_id', inv.family_id,
    'role', inv.role,
    'child_profile_id', inv.child_profile_id
  );
end;
$$;

create or replace function public.leave_family()
returns void
language sql volatile security definer
set search_path = public
as $$
  delete from public.family_accounts where user_id = auth.uid();
$$;

-- Parents unlink child logins; only the owner removes another parent
create or replace function public.remove_family_account(p_user_id uuid)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  target public.family_accounts%rowtype;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;
  select * into target from public.family_accounts where user_id = p_user_id;
  if not found or target.family_id <> public.family_of(v_uid) then
    raise exception 'Account not found in your family';
  end if;
  if not public.is_family_parent() then
    raise exception 'Only a parent can remove accounts';
  end if;
  if target.role = 'parent' and public.family_role(v_uid) <> 'owner' then
    raise exception 'Only the family owner can remove a parent';
  end if;
  delete from public.family_accounts where user_id = p_user_id;
end;
$$;

revoke execute on function public.issue_family_invite(text, uuid) from public, anon;
revoke execute on function public.join_family(text) from public, anon;
revoke execute on function public.leave_family() from public, anon;
revoke execute on function public.remove_family_account(uuid) from public, anon;
grant execute on function public.issue_family_invite(text, uuid) to authenticated;
grant execute on function public.join_family(text) to authenticated;
grant execute on function public.leave_family() to authenticated;
grant execute on function public.remove_family_account(uuid) to authenticated;
