-- A mistyped invite email must never hijack an account that is already in
-- use. Auto-claim on sign-in is now limited to UNTOUCHED accounts: at most
-- the one auto-bootstrapped profile still called 'My Child'
-- (DEFAULT_CHILD_NAME in src/context/ChildProfileContext.jsx), no family
-- members, no saved settings. Anyone else sees the invite as an OFFER in
-- their Parent Zone (pending_family_invites) and joins only by choice.
-- A fresh account that was pulled in by mistake gets an escape hatch too:
-- a child login may leave its family (leave_family already allows it;
-- the locked screen now exposes it behind the 3-second hold).

create or replace function public.account_is_untouched(p_uid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select not exists (
           select 1 from public.child_profiles
            where user_id = p_uid and name <> 'My Child'
         )
     and (select count(*) from public.child_profiles where user_id = p_uid) <= 1
     and not exists (select 1 from public.family_members where user_id = p_uid)
     and not exists (select 1 from public.user_settings where user_id = p_uid);
$$;

revoke execute on function public.account_is_untouched(uuid) from public, anon, authenticated;

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
  if exists (select 1 from public.family_accounts where user_id = v_uid)
     or exists (select 1 from public.family_accounts where family_id = v_uid)
     or not public.account_is_untouched(v_uid) then
    return null;
  end if;
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

-- Invites addressed to THIS login that were not auto-claimed: shown as an
-- offer. Carries who invited (their email, so a stranger's typo is
-- recognisable as such) and the role — never the other family's child
-- names.
create or replace function public.pending_family_invites()
returns table (code text, role text, invited_by text, expires_at timestamptz)
language sql stable security definer
set search_path = public
as $$
  select i.code,
         i.role,
         u.email::text as invited_by,
         i.expires_at
    from public.family_invites i
    left join auth.users u on u.id = i.created_by
   where lower(i.email) = lower(auth.jwt() ->> 'email')
     and i.claimed_at is null
     and i.expires_at > now()
     and i.family_id <> auth.uid()
     and not exists (select 1 from public.family_accounts where user_id = auth.uid())
   order by i.created_at desc;
$$;

revoke execute on function public.pending_family_invites() from public, anon;
grant execute on function public.pending_family_invites() to authenticated;

-- Declining removes the invite so it can't keep nagging (and a typo'd
-- parent sees their pending row vanish)
create or replace function public.decline_family_invite(p_code text)
returns void
language sql volatile security definer
set search_path = public
as $$
  delete from public.family_invites
   where code = p_code
     and lower(email) = lower(auth.jwt() ->> 'email')
     and claimed_at is null;
$$;

revoke execute on function public.decline_family_invite(text) from public, anon;
grant execute on function public.decline_family_invite(text) to authenticated;
