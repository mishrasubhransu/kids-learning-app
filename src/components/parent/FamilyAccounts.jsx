import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Link2, Loader2, X, LogOut, KeyRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useFamily } from '../../context/FamilyContext';
import { useChildProfile, DEFAULT_CHILD_NAME } from '../../context/ChildProfileContext';
import { formatCode, useCountdown, mmss } from './inviteCode';

// Who else can sign in to this family (supabase …_family_accounts.sql,
// …_family_email_invites.sql):
//
//   Parents — equal control. Invite by email (good for 30 days), or with
//             a 15-minute code the other adult types in THEIR Parent Zone
//             → Family accounts → Join.
//   Child logins — one Google account per child, bound to that profile.
//             Always by email: the parent types the kid's Gmail here. When
//             that account signs in it is asked for a code — "Show code"
//             on the pending row reveals one for 60 seconds — and then
//             lands straight in the child's lessons: no family of its own,
//             nothing for it to subscribe to, Parent Zone closed.
//
// Email + code together: a mistyped address can only produce a prompt the
// wrong person can't answer, and nothing is ever applied silently.
//
// Both kinds stay live: whatever any parent changes shows up everywhere,
// and the kid's progress flows back to the parents' progress panel.

const roleLabel = { parent: 'Parent', child: 'Child login' };

const InviteCard = ({ title, hint, issue, onClose }) => {
  const [issued, setIssued] = useState(null);
  const [error, setError] = useState(null);
  // Busy from the first render: the code is minted on mount
  const [busy, setBusy] = useState(true);
  const left = useCountdown(issued?.expiresAt);

  const mint = useCallback(
    () =>
      issue()
        .then((next) => {
          setIssued(next);
          setError(null);
        })
        .catch((e) => setError(e.message))
        .finally(() => setBusy(false)),
    [issue]
  );

  useEffect(() => {
    mint();
  }, [mint]);

  const remint = () => {
    setBusy(true);
    mint();
  };

  const expired = issued && left === 0;

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-800">{title}</div>
          <p className="text-sm text-gray-500 mt-1">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
        >
          <X size={18} />
        </button>
      </div>
      {busy && !issued && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Making a code…
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {issued && (
        <div className="text-center py-2">
          <div
            className={`font-mono text-4xl font-bold tracking-[0.3em] ${
              expired ? 'text-gray-300 line-through' : 'text-indigo-700'
            }`}
          >
            {formatCode(issued.code)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {expired ? (
              <button
                type="button"
                onClick={remint}
                disabled={busy}
                className="font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Code expired — make a new one
              </button>
            ) : (
              <>Expires in {mmss(left)}</>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Type the other account's Gmail; the invite waits for that login. A typo
// here would hand a stranger a seat at the family (a child seat sees the
// kids' names and the My Family photos; a parent seat sees everything), so
// the address is read back large for a second look before it's saved —
// and it stays visible as "waiting for sign-in" with a Cancel until the
// account turns up, and as an Unlink/Remove afterwards.
const EmailInviteCard = ({ title, hint, confirmLabel, onSubmit, onDone, onCode, onClose }) => {
  const [email, setEmail] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const clean = email.trim().toLowerCase();
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean);
  const ready = valid && !busy;

  const submit = async () => {
    if (!ready) return;
    if (!reviewing) {
      setReviewing(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onDone(await onSubmit(clean));
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-800">{title}</div>
          <p className="text-sm text-gray-500 mt-1">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
        >
          <X size={18} />
        </button>
      </div>
      {reviewing ? (
        <div className="space-y-3">
          <div className="text-center py-2">
            <div className="text-xs text-gray-500 mb-1">Check the address — a typo would let in the wrong person</div>
            <div className="font-mono text-xl sm:text-2xl font-bold text-indigo-700 break-all">
              {clean}
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setReviewing(false)}
              disabled={busy}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!ready}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {busy ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Saving…
                </span>
              ) : (
                `Yes, ${confirmLabel.toLowerCase()}`
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="name@gmail.com"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!ready}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap"
          >
            Next
          </button>
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {onCode && (
        <button
          type="button"
          onClick={onCode}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800"
        >
          <KeyRound size={14} /> Or show a code to type in instead
        </button>
      )}
    </div>
  );
};

// The 60-second code for one pending email invite; re-mintable any time.
// Closes itself once the invite is claimed (polls while open), so the
// parent sees the roster update the moment the other device joins.
const RevealCodeCard = ({ invite, title, onClose }) => {
  const { revealInviteCode } = useFamily();
  const [shown, setShown] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(true);
  const left = useCountdown(shown?.expiresAt);

  const reveal = useCallback(
    () =>
      revealInviteCode(invite.code)
        .then((next) => {
          setShown(next);
          setError(null);
        })
        .catch((e) => setError(e.message))
        .finally(() => setBusy(false)),
    [revealInviteCode, invite.code]
  );

  useEffect(() => {
    reveal();
  }, [reveal]);

  // Gone from the pending list = claimed (or cancelled elsewhere): close
  useEffect(() => {
    const id = setInterval(() => {
      supabase
        .from('family_invites')
        .select('code')
        .eq('code', invite.code)
        .is('claimed_at', null)
        .maybeSingle()
        .then(({ data, error }) => {
          if (!error && !data) onClose();
        });
    }, 3000);
    return () => clearInterval(id);
  }, [invite.code, onClose]);

  const again = () => {
    setBusy(true);
    reveal();
  };
  const expired = shown && left === 0;

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-800">{title}</div>
          <p className="text-sm text-gray-500 mt-1">
            Sign <b>{invite.email}</b> in to ToddLearn on its device. It will ask for this
            code. Codes last 60 seconds — tap for a new one whenever you need.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
        >
          <X size={18} />
        </button>
      </div>
      {busy && !shown && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" /> Making a code…
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {shown && (
        <div className="text-center py-2">
          <div
            className={`font-mono text-4xl font-bold tracking-[0.3em] ${
              expired ? 'text-gray-300 line-through' : 'text-indigo-700'
            }`}
          >
            {formatCode(shown.otp)}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {expired ? 'Code expired' : `Expires in ${mmss(left)}`}
            <button
              type="button"
              onClick={again}
              disabled={busy}
              className="ml-3 font-semibold text-indigo-600 hover:text-indigo-800"
            >
              New code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const JoinCard = ({ onClose }) => {
  const { joinFamily } = useFamily();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

  const join = async () => {
    if (clean.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await joinFamily(clean);
      // Caches hold this login's own (now hidden) family — reload fresh
      ['childProfiles-v1', 'activeChildId', 'familyMembers-v2'].forEach((k) =>
        localStorage.removeItem(k)
      );
      Object.keys(localStorage)
        .filter((k) => k.startsWith('setting-'))
        .forEach((k) => localStorage.removeItem(k));
      window.location.assign('/home');
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-800">Join a family</div>
          <p className="text-sm text-gray-500 mt-1">
            Type the code from the inviting parent's screen. This account then
            sees their children instead of its own.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
        >
          <X size={18} />
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && join()}
          placeholder="ABC DEF"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={7}
          disabled={busy}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-lg font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="button"
          onClick={join}
          disabled={clean.length !== 6 || busy}
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors whitespace-nowrap"
        >
          {busy ? (
            <span className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Joining…
            </span>
          ) : (
            'Join'
          )}
        </button>
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
};

const FamilyAccounts = () => {
  const { user } = useAuth();
  const {
    isOwner,
    isParent,
    role,
    listAccounts,
    listInvites,
    issueInvite,
    cancelInvite,
    removeAccount,
    leaveFamily,
  } = useFamily();
  const { childProfiles } = useChildProfile();
  const [accounts, setAccounts] = useState(null);
  const [invites, setInvites] = useState([]);
  // null | 'parent' | 'parent-code' | 'join' | { child } | { reveal, title }
  const [panel, setPanel] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [error, setError] = useState(null);

  const reload = useCallback(
    () =>
      Promise.all([listAccounts(), listInvites()]).then(([rows, pending]) => {
        setAccounts(rows);
        setInvites(pending);
      }),
    [listAccounts, listInvites]
  );

  // Re-read the roster whenever a panel closes — someone may have joined,
  // or an email invite was just saved
  useEffect(() => {
    let cancelled = false;
    Promise.all([listAccounts(), listInvites()]).then(([rows, pending]) => {
      if (cancelled) return;
      setAccounts(rows);
      setInvites(pending);
    });
    return () => {
      cancelled = true;
    };
  }, [listAccounts, listInvites, panel]);

  useEffect(() => {
    if (!confirmId) return undefined;
    const id = setTimeout(() => setConfirmId(null), 4000);
    return () => clearTimeout(id);
  }, [confirmId]);

  const remove = async (account) => {
    if (confirmId !== account.user_id) {
      setConfirmId(account.user_id);
      return;
    }
    setConfirmId(null);
    setError(null);
    try {
      await removeAccount(account.user_id);
      await reload();
    } catch (e) {
      setError(e.message);
    }
  };

  const cancel = async (invite) => {
    setError(null);
    try {
      await cancelInvite(invite.code);
      await reload();
    } catch (e) {
      setError(e.message);
    }
  };

  const clearDeviceCaches = () => {
    ['childProfiles-v1', 'activeChildId', 'familyMembers-v2'].forEach((k) =>
      localStorage.removeItem(k)
    );
    Object.keys(localStorage)
      .filter((k) => k.startsWith('setting-'))
      .forEach((k) => localStorage.removeItem(k));
  };

  const leave = async () => {
    if (confirmId !== 'leave') {
      setConfirmId('leave');
      return;
    }
    setConfirmId(null);
    try {
      await leaveFamily();
      clearDeviceCaches();
      window.location.assign('/home');
    } catch (e) {
      setError(e.message);
    }
  };

  const profiles = childProfiles || [];
  const parents = (accounts || []).filter((a) => a.role === 'parent');
  const pendingParents = invites.filter((i) => i.role === 'parent');
  const loginFor = (childId) =>
    (accounts || []).find((a) => a.role === 'child' && a.child_profile_id === childId);
  const pendingFor = (childId) =>
    invites.find((i) => i.role === 'child' && i.child_profile_id === childId);
  const childName = (c) => (c.name === DEFAULT_CHILD_NAME ? 'your child' : c.name);
  const linkedCount = (accounts || []).length;
  const full = linkedCount >= 5;

  if (panel === 'parent') {
    return (
      <EmailInviteCard
        title="Invite a parent"
        hint="Their Google email. When that account signs in to ToddLearn it is asked for a code you show from here, then gets the same control you have. The invite is good for 30 days."
        confirmLabel="Invite"
        onSubmit={(email) => issueInvite('parent', null, email)}
        onDone={(inv) => setPanel({ reveal: inv, title: 'Code for the new parent' })}
        onCode={() => setPanel('parent-code')}
        onClose={() => setPanel(null)}
      />
    );
  }
  if (panel === 'parent-code') {
    return (
      <InviteCard
        title="Invite a parent with a code"
        hint="On their device, they sign in with their own Google account, open Parent Zone → Family accounts → Join a family, and type this code. They get the same control you have."
        issue={() => issueInvite('parent')}
        onClose={() => setPanel(null)}
      />
    );
  }
  if (panel === 'join') return <JoinCard onClose={() => setPanel(null)} />;
  if (panel?.child) {
    const c = panel.child;
    return (
      <EmailInviteCard
        title={`Link a login for ${childName(c)}`}
        hint={`${childName(c)}'s own Google email. Sign that account in on ${childName(c)}'s device; it asks for a code you show from here, then lands straight in ${childName(c)}'s lessons with the Parent Zone closed to it. The invite is good for 30 days.`}
        confirmLabel="Link"
        onSubmit={(email) => issueInvite('child', c.id, email)}
        onDone={(inv) => setPanel({ reveal: inv, title: `Code for ${childName(c)}'s login` })}
        onClose={() => setPanel(null)}
      />
    );
  }
  if (panel?.reveal) {
    return (
      <RevealCodeCard invite={panel.reveal} title={panel.title} onClose={() => setPanel(null)} />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
      {/* ---- parents ---- */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Parents
        </div>
        <ul className="space-y-1.5">
          <li className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-gray-700">
              {isOwner ? user?.email : 'Family owner'}
              {isOwner && <span className="ml-2 text-xs text-gray-400">owner · you</span>}
            </span>
          </li>
          {parents.map((a) => (
            <li key={a.user_id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-gray-700">
                {a.email || 'Parent'}
                {a.user_id === user?.id && (
                  <span className="ml-2 text-xs text-gray-400">you</span>
                )}
              </span>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => remove(a)}
                  className={`text-xs font-semibold whitespace-nowrap ${
                    confirmId === a.user_id ? 'text-red-600' : 'text-gray-400 hover:text-red-500'
                  }`}
                >
                  {confirmId === a.user_id ? 'Tap again to remove' : 'Remove'}
                </button>
              )}
            </li>
          ))}
          {pendingParents.map((i) => (
            <li key={i.code} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-gray-500">
                {i.email}
                <span className="ml-2 text-xs text-amber-600">waiting for sign-in</span>
              </span>
              <span className="flex items-center gap-3 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setPanel({ reveal: i, title: 'Code for the new parent' })}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <KeyRound size={14} /> Show code
                </button>
                <button
                  type="button"
                  onClick={() => cancel(i)}
                  className="text-xs font-semibold text-gray-400 hover:text-red-500"
                >
                  Cancel
                </button>
              </span>
            </li>
          ))}
        </ul>
        {isParent && (
          <button
            type="button"
            onClick={() => setPanel('parent')}
            disabled={full}
            className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 transition-colors"
          >
            <UserPlus size={16} /> Invite a parent
          </button>
        )}
      </div>

      {/* ---- child logins ---- */}
      {isParent && profiles.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Child logins
          </div>
          <ul className="space-y-1.5">
            {profiles.map((c) => {
              const login = loginFor(c.id);
              const pending = !login && pendingFor(c.id);
              return (
                <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-gray-700">
                    <span className="mr-1.5" aria-hidden="true">
                      {c.avatar}
                    </span>
                    {c.name}
                    {login ? (
                      <span className="ml-2 text-xs text-gray-400 truncate">
                        {login.email || roleLabel.child}
                      </span>
                    ) : pending ? (
                      <span className="ml-2 text-xs text-amber-600 truncate">
                        {pending.email} · waiting for sign-in
                      </span>
                    ) : (
                      <span className="ml-2 text-xs text-gray-400">no login</span>
                    )}
                  </span>
                  {pending ? (
                    <span className="flex items-center gap-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() =>
                          setPanel({ reveal: pending, title: `Code for ${childName(c)}'s login` })
                        }
                        className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        <KeyRound size={14} /> Show code
                      </button>
                      <button
                        type="button"
                        onClick={() => cancel(pending)}
                        className="text-xs font-semibold text-gray-400 hover:text-red-500"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : login ? (
                    <button
                      type="button"
                      onClick={() => remove(login)}
                      className={`text-xs font-semibold whitespace-nowrap ${
                        confirmId === login.user_id
                          ? 'text-red-600'
                          : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      {confirmId === login.user_id ? 'Tap again to unlink' : 'Unlink'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPanel({ child: c })}
                      disabled={full}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 whitespace-nowrap"
                    >
                      <Link2 size={14} /> Link a login
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {full && (
        <p className="text-xs text-gray-500">
          A family can have at most 5 linked accounts.
        </p>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {/* ---- this login's own membership ---- */}
      <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-3">
        {role === 'owner' && linkedCount === 0 && (
          <button
            type="button"
            onClick={() => setPanel('join')}
            className="text-sm font-semibold text-gray-600 hover:text-gray-900"
          >
            Join another family with a code
          </button>
        )}
        {role !== 'owner' && (
          <button
            type="button"
            onClick={leave}
            className={`flex items-center gap-2 text-sm font-semibold ${
              confirmId === 'leave' ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
            }`}
          >
            <LogOut size={16} />
            {confirmId === 'leave' ? 'Tap again to leave this family' : 'Leave this family'}
          </button>
        )}
      </div>
    </div>
  );
};

export default FamilyAccounts;
