import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Loader2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatCode, useCountdown } from './inviteCode';

// COPY a family's customization to another Google account that wants its
// own independent version (a grandparent's house, say). For a child's own
// device, or a second parent, link the account to the family instead
// (FamilyAccounts.jsx) — that stays in sync, this is a one-off fork.
// Two halves of one panel, both talking to /api/transfer-account:
//
//   Send    — mints a 6-letter code that lives 15 minutes; the parent reads
//             it off this screen on the other device.
//   Receive — the OTHER account types the code in its own Parent Zone.
//             Everything that account had is replaced by the sender's
//             children, family, settings, clips and photos.
//
// The sender keeps its copy, so a later re-send simply overwrites.

const CODE_TTL_LABEL = '15 minutes';
// localStorage caches that would show the previous account's names for a
// beat after a receive — dropped so the reload fetches fresh
const CACHE_KEYS = ['childProfiles-v1', 'activeChildId', 'familyMembers-v2'];

const callTransfer = async (session, body) => {
  const res = await fetch('/api/transfer-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
};

const SendPanel = ({ session, onClose }) => {
  const [issued, setIssued] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const left = useCountdown(issued?.expiresAt);

  const issue = async () => {
    setBusy(true);
    setError(null);
    try {
      setIssued(await callTransfer(session, { action: 'issue' }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    issue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const close = () => {
    // Best-effort: an unclaimed code expires on its own anyway
    callTransfer(session, { action: 'cancel' }).catch(() => {});
    onClose();
  };

  const expired = issued && left === 0;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-800">Copy to another account</div>
          <p className="text-sm text-gray-500 mt-1">
            On the other device, sign in with the receiving Google account, open
            Parent Zone → Account → <b>Receive</b>, and type this code. Everything
            on that account is replaced by yours. Your own account keeps its copy.
          </p>
        </div>
        <button
          type="button"
          onClick={close}
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
                onClick={issue}
                disabled={busy}
                className="font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Code expired — make a new one
              </button>
            ) : (
              <>
                Expires in {mm}:{ss}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ReceivePanel = ({ session, onClose }) => {
  const [code, setCode] = useState('');
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const ready = clean.length === 6 && !busy;

  useEffect(() => {
    if (!armed) return undefined;
    const id = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(id);
  }, [armed]);

  const claim = async () => {
    if (!ready) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    setBusy(true);
    setError(null);
    try {
      const summary = await callTransfer(session, { action: 'claim', code: clean });
      setDone(summary);
      CACHE_KEYS.forEach((k) => localStorage.removeItem(k));
      Object.keys(localStorage)
        .filter((k) => k.startsWith('setting-'))
        .forEach((k) => localStorage.removeItem(k));
      // Contexts load on mount — a full reload is the one sure way every
      // cached name, clip and photo is the new family's
      setTimeout(() => window.location.assign('/home'), 1500);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-gray-800">Receive from another account</div>
          <p className="text-sm text-gray-500 mt-1">
            Type the code shown on the sending account's screen. The children,
            family, settings and photos on <b>this</b> account are replaced.
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

      {done ? (
        <div className="text-sm text-green-700 font-semibold">
          Received {done.children} {done.children === 1 ? 'child' : 'children'} and{' '}
          {done.members} family {done.members === 1 ? 'member' : 'members'}. Reloading…
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && claim()}
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
            onClick={claim}
            disabled={!ready}
            className={`px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-colors whitespace-nowrap ${
              armed ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Copying…
              </span>
            ) : armed ? (
              'Tap again to replace'
            ) : (
              'Receive'
            )}
          </button>
        </div>
      )}
      {error && <div className="text-sm text-red-600">{error}</div>}
      {busy && (
        <p className="text-xs text-gray-500">
          Copying clips and photos can take a minute. Keep this page open.
        </p>
      )}
    </div>
  );
};

const AccountTransfer = () => {
  const { session } = useAuth();
  const [mode, setMode] = useState(null); // null | 'send' | 'receive'

  if (mode === 'send') return <SendPanel session={session} onClose={() => setMode(null)} />;
  if (mode === 'receive') return <ReceivePanel session={session} onClose={() => setMode(null)} />;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="text-sm text-gray-600 mb-3">
        Copy everything to a separate Google account that should have its own
        independent version — the copy won't stay in sync. To share with a
        second parent or give a child their own login, use Family accounts
        above instead. Codes last {CODE_TTL_LABEL}.
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMode('send')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors"
        >
          <ArrowUpRight size={16} /> Copy to another account
        </button>
        <button
          type="button"
          onClick={() => setMode('receive')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowDownLeft size={16} /> Receive from another account
        </button>
      </div>
    </div>
  );
};

export default AccountTransfer;
