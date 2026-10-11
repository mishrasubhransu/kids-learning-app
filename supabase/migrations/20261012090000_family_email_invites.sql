-- Email invites: the parent types the other account's Gmail and that
-- account is claimed into the family the moment it signs in — before the
-- profile context, before any future paywall. A child's login therefore
-- never has a family of its own and never needs its own subscription.
--
-- Codes stay as the fallback (two parents standing next to each other).
-- An email invite lives 30 days; a code 15 minutes. Either kind is applied
-- by the same accept_family_invite(), which join_family (code typed in)
-- and claim_pending_invites (matched by email on sign-in) both call.
--
-- "Treat it like a fresh account": an account that signed in earlier and
-- bootstrapped its own empty profile is still claimable — its own rows are
-- simply left behind (hidden) once it belongs to the family. Only an
-- account that already has LINKED MEMBERS of its own is refused.

alter table public.family_invites
  add column if not exists email text;

create index if not exists family_invites_pending_email
  on public.family_invites (email)
  where claimed_at is null;

-- Parents see their family's pending invites (to show "Pending: …")
create policy "Parents see family invites"
  on public.family_invites for select to authenticated
  using (family_id = public.family_of(auth.uid()) and public.is_family_parent());

-- ---------------------------------------------------------------------
-- shared acceptance (internal: called by the two security-definer RPCs)
-- ---------------------------------------------------------------------

create or replace function public.accept_family_invite(
  inv public.family_invites,
  p_uid uuid,
  p_email text
)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
begin
  if inv.family_id = p_uid then
    raise exception 'That is your own family''s invite — use it on the other account';
  end if;
  if exists (select 1 from public.family_accounts where user_id = p_uid) then
    raise exception 'This account already belongs to a family — leave it first';
  end if;
  if exists (select 1 from public.family_accounts where family_id = p_uid) then
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
  values (p_uid, inv.family_id, inv.role, inv.child_profile_id, p_email);

  update public.family_invites
     set claimed_by = p_uid, claimed_at = now()
   where code = inv.code;

  return jsonb_build_object(
    'family_id', inv.family_id,
    'role', inv.role,
    'child_profile_id', inv.child_profile_id
  );
end;
$$;

revoke execute on function public.accept_family_invite(public.family_invites, uuid, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- issue: now with an optional email (replaces the 2-arg version)
-- ---------------------------------------------------------------------

drop function if exists public.issue_family_invite(text, uuid);

create or replace function public.issue_family_invite(
  p_role text,
  p_child_profile_id uuid default null,
  p_email text default null
)
returns table (code text, expires_at timestamptz, email text)
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_family uuid;
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
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
  if v_email is not null then
    if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'That doesn''t look like an email address';
    end if;
    if v_email = lower(auth.jwt() ->> 'email') then
      raise exception 'That is your own email';
    end if;
    if exists (
      select 1 from public.family_accounts
       where family_id = v_family and lower(family_accounts.email) = v_email
    ) then
      raise exception 'That account is already part of this family';
    end if;
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

  -- Expired codes everywhere; this family's earlier unclaimed invite for
  -- the same purpose (one pending login per child, one per parent email,
  -- one live code) so the screen never shows two answers
  delete from public.family_invites
   where family_invites.expires_at < now()
      or (family_id = v_family
          and claimed_at is null
          and role = p_role
          and (
            (p_role = 'child' and child_profile_id = p_child_profile_id)
            or (p_role = 'parent' and v_email is not null and lower(family_invites.email) = v_email)
            or (p_role = 'parent' and v_email is null and family_invites.email is null)
          ));

  loop
    v_code := public.mint_invite_code();
    exit when not exists (select 1 from public.family_invites where family_invites.code = v_code);
  end loop;
  v_expires := now() + case when v_email is null then interval '15 minutes' else interval '30 days' end;

  insert into public.family_invites (code, family_id, role, child_profile_id, created_by, expires_at, email)
  values (v_code, v_family, p_role, p_child_profile_id, v_uid, v_expires, v_email);

  return query select v_code, v_expires, v_email;
end;
$$;

revoke execute on function public.issue_family_invite(text, uuid, text) from public, anon;
grant execute on function public.issue_family_invite(text, uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- join by code (unchanged behaviour, shared acceptance)
-- ---------------------------------------------------------------------

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
  return public.accept_family_invite(inv, v_uid, auth.jwt() ->> 'email');
end;
$$;

-- ---------------------------------------------------------------------
-- claim on sign-in: a pending invite addressed to this login's email
-- ---------------------------------------------------------------------

create or replace function public.claim_pending_invites()
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(auth.jwt() ->> 'email');
  inv public.family_invites%rowtype;
begin
  if v_uid is null or v_email is null then
    return null;
  end if;
  -- Already placed, or has a family of its own with members: nothing to do
  if exists (select 1 from public.family_accounts where user_id = v_uid)
     or exists (select 1 from public.family_accounts where family_id = v_uid) then
    return null;
  end if;
  -- Newest matching invite wins; one whose child got linked meanwhile is
  -- skipped rather than failing the sign-in
  for inv in
    select * from public.family_invites
     where lower(family_invites.email) = v_email
       and claimed_at is null
       and family_invites.expires_at > now()
       and family_id <> v_uid
     order by created_at desc
  loop
    if inv.role = 'child' and (
      not exists (select 1 from public.child_profiles where id = inv.child_profile_id)
      or exists (select 1 from public.family_accounts where child_profile_id = inv.child_profile_id)
    ) then
      continue;
    end if;
    return public.accept_family_invite(inv, v_uid, auth.jwt() ->> 'email');
  end loop;
  return null;
end;
$$;

create or replace function public.cancel_family_invite(p_code text)
returns void
language plpgsql volatile security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_family_parent() then
    raise exception 'Only a parent can cancel an invite';
  end if;
  delete from public.family_invites
   where code = p_code
     and family_id = public.family_of(auth.uid())
     and claimed_at is null;
end;
$$;

revoke execute on function public.claim_pending_invites() from public, anon;
revoke execute on function public.cancel_family_invite(text) from public, anon;
grant execute on function public.claim_pending_invites() to authenticated;
grant execute on function public.cancel_family_invite(text) to authenticated;
