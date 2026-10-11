import { useEffect, useState } from 'react';

// Shared bits for the two code flows (family invites, account copies)

// "ABC DEF" — easier to read across the room than six glued letters
export const formatCode = (code) => `${code.slice(0, 3)} ${code.slice(3)}`;

// Seconds until `expiresAt`, ticking once a second; 0 once it has passed
export const useCountdown = (expiresAt) => {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!expiresAt) return undefined;
    const tick = () =>
      setLeft(Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return left;
};

export const mmss = (seconds) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
