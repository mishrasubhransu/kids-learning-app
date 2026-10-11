import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';

// "Someone added you" — shown to a signed-in login that has an email
// invite waiting (pending_family_invites), whether the account is brand
// new or has used the app for months. Joining needs the code the inviting
// parent reveals on THEIR screen right then (60 seconds), so a mistyped
// address only ever produces a prompt the wrong person can't answer.
// Decline deletes the invite; "Not now" hides it for this session.

const SS_DISMISSED = 'invitePromptDismissed';

const clearDeviceCaches = () => {
  ['childProfiles-v1', 'activeChildId', 'familyMembers-v2'].forEach((k) =>
    localStorage.removeItem(k)
  );
  Object.keys(localStorage)
    .filter((k) => k.startsWith('setting-'))
    .forEach((k) => localStorage.removeItem(k));
};

const InvitePrompt = () => {
  const { user } = useAuth();
  const { resolved, role, listOffers, acceptInviteWithCode, declineInvite } = useFamily();
  const [offer, setOffer] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem(SS_DISMISSED) === '1';
    } catch {
      return false;
    }
  });

  // Only a login that isn't already in a family can be invited into one
  useEffect(() => {
    if (!user || !resolved || role !== 'owner' || hidden) return undefined;
    let cancelled = false;
    listOffers().then((rows) => {
      if (!cancelled) setOffer(rows[0] || null);
    });
    return () => {
      cancelled = true;
    };
  }, [user, resolved, role, hidden, listOffers]);

  if (!offer || hidden) return null;

  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const ready = clean.length === 6 && !busy;

  const join = async () => {
    if (!ready) return;
    setBusy(true);
    setError(null);
    try {
      await acceptInviteWithCode(offer.code, clean);
      clearDeviceCaches();
      window.location.assign('/home');
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const decline = async () => {
    setBusy(true);
    try {
      await declineInvite(offer.code);
    } finally {
      setOffer(null);
      setBusy(false);
    }
  };

  const later = () => {
    try {
      sessionStorage.setItem(SS_DISMISSED, '1');
    } catch {
      /* fine */
    }
    setHidden(true);
  };

  const asWhat = offer.role === 'parent' ? 'a parent' : "a child's login";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-prompt-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div>
          <h2 id="invite-prompt-title" className="text-xl font-bold text-gray-800">
            Someone added you to their family
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            <b>{offer.invited_by || 'A ToddLearn parent'}</b> added this account as {asWhat}.
            Ask them to tap <b>Show code</b> on their screen and type it here.
          </p>
          {offer.role === 'child' && (
            <p className="text-sm text-gray-500 mt-2">
              Joining turns this login into that child&apos;s device and hides anything of its
              own.
            </p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Don&apos;t know them? Decline — it&apos;s probably a mistyped address.
          </p>
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
            disabled={!ready}
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

        <div className="flex justify-between text-sm">
          <button
            type="button"
            onClick={decline}
            disabled={busy}
            className="font-semibold text-gray-500 hover:text-red-600"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={later}
            disabled={busy}
            className="font-semibold text-gray-500 hover:text-gray-800"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvitePrompt;
