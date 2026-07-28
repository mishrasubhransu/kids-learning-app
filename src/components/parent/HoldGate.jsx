import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const HOLD_MS = 3000;
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Toddler gate: hold the button for 3 seconds to enter the Parent Zone.
// Random taps never get through; a grown-up gets a progress ring.
const HoldGate = ({ onUnlock }) => {
  const [progress, setProgress] = useState(0);
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
      startRef.current = performance.now();
      const step = () => {
        if (startRef.current == null) return;
        const p = (performance.now() - startRef.current) / HOLD_MS;
        if (p >= 1) {
          setProgress(1);
          onUnlock();
          return;
        }
        setProgress(p);
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [onUnlock]
  );

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return (
    <div className="h-full bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100 flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
          Parent Zone
        </h1>
        <p className="text-gray-500">Press and hold the circle for 3 seconds</p>
      </div>

      <button
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        aria-label="Hold for 3 seconds to open parent settings"
        className="relative w-40 h-40 rounded-full bg-white shadow-lg flex items-center justify-center select-none touch-none active:shadow-xl"
      >
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 120 120"
          aria-hidden="true"
        >
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="#6366f1"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </svg>
        <span className="text-5xl" aria-hidden="true">
          {progress > 0 ? '🔓' : '🔒'}
        </span>
      </button>

      <Link to="/home" className="text-gray-500 hover:text-gray-700 text-sm">
        ← Back to learning
      </Link>
    </div>
  );
};

export default HoldGate;
