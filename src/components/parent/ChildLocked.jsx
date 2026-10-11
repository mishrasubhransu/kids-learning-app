import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFamily } from '../../context/FamilyContext';

const HOLD_MS = 3000;

// What a CHILD LOGIN sees at /parent: nothing to unlock. The device signed
// in with the kid's own account is theirs to play on; settings live with
// the parents' logins.
//
// One escape hatch, behind the same 3-second hold the Parent Zone trusts:
// leave the family. It exists for the account that was pulled in by a
// mistyped invite (auto-claim only takes untouched accounts, so nothing
// of theirs was lost — but they need a way out that isn't "ask the
// stranger who invited you").
const ChildLocked = ({ childName }) => {
  const { leaveFamily } = useFamily();
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    setProgress(0);
  }, []);

  const start = useCallback(
    (e) => {
      e.preventDefault();
      if (leaving) return;
      startRef.current = performance.now();
      const step = () => {
        if (startRef.current == null) return;
        const p = (performance.now() - startRef.current) / HOLD_MS;
        if (p >= 1) {
          setProgress(1);
          setLeaving(true);
          leaveFamily()
            .then(() => {
              ['childProfiles-v1', 'activeChildId', 'familyMembers-v2', 'familyAccount-v1'].forEach(
                (k) => localStorage.removeItem(k)
              );
              window.location.assign('/home');
            })
            .catch(() => {
              setLeaving(false);
              setProgress(0);
            });
          return;
        }
        setProgress(p);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [leaveFamily, leaving]
  );

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div className="h-full bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100 flex flex-col items-center justify-center gap-6 p-6 text-center">
      <span className="text-6xl" aria-hidden="true">
        🔒
      </span>
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
          {childName ? `${childName}'s device` : 'A child’s device'}
        </h1>
        <p className="text-gray-500 max-w-sm">
          This login is linked to one child. Lessons, family and settings are
          changed from a parent&apos;s login.
        </p>
      </div>
      <Link to="/home" className="text-gray-500 hover:text-gray-700 text-sm">
        ← Back to learning
      </Link>

      <div className="mt-6 text-xs text-gray-400 max-w-xs">
        Not your family? Press and hold for 3 seconds to leave it.
        <button
          type="button"
          onPointerDown={start}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          disabled={leaving}
          aria-label="Hold for 3 seconds to leave this family"
          className="mt-2 mx-auto block px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-500 select-none touch-none relative overflow-hidden"
        >
          <span
            className="absolute inset-y-0 left-0 bg-red-100"
            style={{ width: `${progress * 100}%` }}
            aria-hidden="true"
          />
          <span className="relative">{leaving ? 'Leaving…' : 'Leave this family'}</span>
        </button>
      </div>
    </div>
  );
};

export default ChildLocked;
