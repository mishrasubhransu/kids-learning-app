-- Email invites now need a one-time code too. The parent types the other
-- account's Gmail; that only ADDRESSES the invite. To actually join, the
-- invited login must type a short-lived code the parent reveals on their
-- own screen ("Show code" → 30 seconds, re-revealable any time). Both must
-- match: the email on the invite and the login's email, the code and the
-- one just revealed. So a mistyped address can only ever produce a prompt
-- the wrong person cannot answer, and nothing is ever applied silently —
-- the auto-claim-on-sign-in from the previous migration is gone.
--
-- The invite's `code` column stays as its identifier (never shown for an
-- email invite); the typed code lives in `otp`. Five wrong guesses clear
-- the otp, so a reveal is needed again.

alter table public.family_invites
  add column if not exists otp text,
  add column if not exists otp_expires_at timestamptz,
  add column if not exists otp_attempts integer not null default 0;

drop function if exists public.claim_pending_invites();
drop function if exists public.account_is_untouched(uuid);

-- Parent side: (re)mint the code for one of their family's email invites
create or replace function public.reveal_invite_code(p_code text)
returns table (otp text, otp_expires_at timestamptz)
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_otp text;
  v_exp timestamptz := now() + interval '30 seconds';
begin
  if auth.uid() is null or not public.is_family_parent() then
    raise exception 'Only a parent can show a code';
  end if;
  v_otp := public.mint_invite_code();
  update public.family_invites
     set otp = v_otp, otp_expires_at = v_exp, otp_attempts = 0
   where family_invites.code = p_code
     and family_id = public.family_of(auth.uid())
     and claimed_at is null
     and family_invites.expires_at > now()
     and email is not null;
  if not found then
    raise exception 'That invite is no longer pending';
  end if;
  return query select v_otp, v_exp;
end;
$$;

revoke execute on function public.reveal_invite_code(text) from public, anon;
grant execute on function public.reveal_invite_code(text) to authenticated;

-- Invited side: the invite addressed to me + the code just shown to the
-- parent. The one-family rule and the "has members of its own" refusal
-- live in accept_family_invite and apply unchanged.
create or replace function public.accept_invite_with_code(p_code text, p_otp text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(auth.jwt() ->> 'email');
  v_otp text := upper(regexp_replace(coalesce(p_otp, ''), '[^A-Za-z0-9]', '', 'g'));
  inv public.family_invites%rowtype;
begin
  if v_uid is null then
    raise exception 'Not signed in';
  end if;
  select * into inv
    from public.family_invites
   where family_invites.code = p_code
     and lower(family_invites.email) = v_email
     and claimed_at is null
     and family_invites.expires_at > now();
  if not found then
    raise exception 'That invite is no longer pending';
  end if;
  if inv.otp is null or inv.otp_expires_at < now() then
    raise exception 'The code has expired — ask them to show it again';
  end if;
  if inv.otp <> v_otp then
    update public.family_invites
       set otp_attempts = otp_attempts + 1,
           otp = case when otp_attempts + 1 >= 5 then null else otp end
     where family_invites.code = p_code;
    raise exception 'That code doesn''t match';
  end if;
  return public.accept_family_invite(inv, v_uid, auth.jwt() ->> 'email');
end;
$$;

revoke execute on function public.accept_invite_with_code(text, text) from public, anon;
grant execute on function public.accept_invite_with_code(text, text) to authenticated;

-- Invites addressed to me, for the sign-in prompt (unchanged shape, no
-- longer conditioned on the account being untouched — everyone is asked)
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
