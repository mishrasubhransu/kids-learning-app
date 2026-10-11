import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { setAnalyticsFamily } from '../lib/analytics';

// Which family this login belongs to, and with what power. A family is
// keyed by its owner's user id (supabase/migrations/…_family_accounts.sql):
// an account with no family_accounts row owns its own family, so for every
// pre-existing user familyId === user.id and nothing changes.
//
//   role 'owner'  — the account the data lives under; invites, removes
//   role 'parent' — equal control over everything; can't remove parents
//   role 'child'  — the kid's own login, bound to one profile; plays only
//
// Every data hook keys its rows and caches by familyId instead of user.id.
// Resolution is cached in localStorage so the first paint doesn't wait on
// the network; a wrong cache only lasts until the fetch lands.

const LS_CACHE = 'familyAccount-v1'; // { userId, familyId, role, linkedChildId }

const FamilyContext = createContext({});

export const useFamily = () => useContext(FamilyContext);

const ownFamily = (user) => ({
  familyId: user?.id ?? null,
  role: 'owner',
  linkedChildId: null,
});

const readCache = (userId) => {
  try {
    const cached = JSON.parse(localStorage.getItem(LS_CACHE));
    return cached?.userId === userId ? cached : null;
  } catch {
    return null;
  }
};

const writeCache = (userId, membership) => {
  try {
    localStorage.setItem(LS_CACHE, JSON.stringify({ userId, ...membership }));
  } catch {
    /* best-effort */
  }
};

const fromRow = (user, row) =>
  row
    ? { familyId: row.family_id, role: row.role, linkedChildId: row.child_profile_id }
    : ownFamily(user);

export const FamilyProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState(() => {
    const cached = readCache(user?.id);
    return cached
      ? { userId: user.id, membership: cached, resolved: false }
      : { userId: user?.id ?? null, membership: ownFamily(user), resolved: false };
  });

  const membership = state.userId === (user?.id ?? null) ? state.membership : ownFamily(user);
  const resolved = state.userId === (user?.id ?? null) && state.resolved;

  // null = offline or table missing: the cached (or own-family) answer
  // stands. Nothing is ever applied here — an invite addressed to this
  // login is offered by InvitePrompt and needs the parent's code.
  const lookup = useCallback(async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('family_accounts')
      .select('family_id, role, child_profile_id')
      .eq('user_id', user.id)
      .maybeSingle();
    return error ? null : fromRow(user, data);
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const next = await lookup();
    if (next) writeCache(user.id, next);
    setState((s) => ({
      userId: user.id,
      membership: next || (s.userId === user.id ? s.membership : ownFamily(user)),
      resolved: true,
    }));
  }, [user, lookup]);

  // The derived `membership`/`resolved` above already fall back to the
  // login's own family while state still belongs to a previous user, so a
  // user switch needs no reset here — only a fresh lookup
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    lookup().then((next) => {
      if (cancelled) return;
      if (next) writeCache(user.id, next);
      setState((s) => ({
        userId: user.id,
        membership: next || (s.userId === user.id ? s.membership : ownFamily(user)),
        resolved: true,
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [user, lookup]);

  useEffect(() => {
    setAnalyticsFamily(membership.familyId);
  }, [membership.familyId]);

  // ---- roster & invites (Parent Zone) ----
  const listAccounts = useCallback(async () => {
    const { data } = await supabase
      .from('family_accounts')
      .select('user_id, role, child_profile_id, email, created_at')
      .order('created_at');
    return data || [];
  }, []);

  const rpc = async (fn, args) => {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data;
  };

  // email = pre-authorize that Gmail (30 days, claimed on its sign-in);
  // no email = a 15-minute code to type in
  const issueInvite = useCallback(
    async (role, childProfileId = null, email = null) => {
      const rows = await rpc('issue_family_invite', {
        p_role: role,
        p_child_profile_id: childProfileId,
        p_email: email,
      });
      const row = Array.isArray(rows) ? rows[0] : rows;
      return { code: row.code, expiresAt: row.expires_at, email: row.email };
    },
    []
  );

  const listInvites = useCallback(async () => {
    const { data } = await supabase
      .from('family_invites')
      .select('code, role, child_profile_id, email, expires_at, created_at')
      .is('claimed_at', null)
      .not('email', 'is', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at');
    return data || [];
  }, []);

  const cancelInvite = useCallback(async (code) => {
    await rpc('cancel_family_invite', { p_code: code });
  }, []);

  // Parent side: mint the short-lived code for one of their email invites
  const revealInviteCode = useCallback(async (code) => {
    const rows = await rpc('reveal_invite_code', { p_code: code });
    const row = Array.isArray(rows) ? rows[0] : rows;
    return { otp: row.otp, expiresAt: row.otp_expires_at };
  }, []);

  // Invited side: invites addressed to THIS login (InvitePrompt), joined
  // only with the code the parent just revealed — never silently
  const listOffers = useCallback(async () => {
    const { data } = await supabase.rpc('pending_family_invites');
    return data || [];
  }, []);

  const acceptInviteWithCode = useCallback(
    async (code, otp) => {
      const result = await rpc('accept_invite_with_code', { p_code: code, p_otp: otp });
      await refresh();
      return result;
    },
    [refresh]
  );

  const declineInvite = useCallback(async (code) => {
    await rpc('decline_family_invite', { p_code: code });
  }, []);

  const joinFamily = useCallback(
    async (code) => {
      const result = await rpc('join_family', { p_code: code });
      await refresh();
      return result;
    },
    [refresh]
  );

  const leaveFamily = useCallback(async () => {
    await rpc('leave_family', {});
    await refresh();
  }, [refresh]);

  const removeAccount = useCallback(async (userId) => {
    await rpc('remove_family_account', { p_user_id: userId });
  }, []);

  const value = useMemo(
    () => ({
      familyId: membership.familyId,
      role: membership.role,
      linkedChildId: membership.linkedChildId,
      isParent: membership.role === 'owner' || membership.role === 'parent',
      isOwner: membership.role === 'owner',
      isChildLogin: membership.role === 'child',
      resolved,
      refresh,
      listAccounts,
      listInvites,
      listOffers,
      issueInvite,
      revealInviteCode,
      cancelInvite,
      acceptInviteWithCode,
      declineInvite,
      joinFamily,
      leaveFamily,
      removeAccount,
    }),
    [
      membership,
      resolved,
      refresh,
      listAccounts,
      listInvites,
      listOffers,
      issueInvite,
      revealInviteCode,
      cancelInvite,
      acceptInviteWithCode,
      declineInvite,
      joinFamily,
      leaveFamily,
      removeAccount,
    ]
  );

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
};
