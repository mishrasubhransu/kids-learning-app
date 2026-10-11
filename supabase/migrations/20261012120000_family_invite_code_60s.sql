-- Reading a code off one device and typing it on another needed more than
-- 30 seconds in practice (user, 2026-10-12): codes now last 60.

create or replace function public.reveal_invite_code(p_code text)
returns table (otp text, otp_expires_at timestamptz)
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_otp text;
  v_exp timestamptz := now() + interval '60 seconds';
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
