import { useCallback, useRef } from 'react';

// Feedback audio must never stack: a fast second tap during praise or
// encouragement would start another clip on top of the one still speaking.
// Test modes wrap their feedback chain in withLock() and ignore taps while
// locked(). Ref-based on purpose — taps are ignored silently, without a
// re-render or visually disabling the retry invitation.
const MAX_LOCK_MS = 8000; // a stuck onend must never brick the buttons

const useAudioLock = () => {
  const lockedRef = useRef(false);

  const locked = useCallback(() => lockedRef.current, []);

  const withLock = useCallback((fn) => {
    lockedRef.current = true;
    return Promise.race([
      Promise.resolve().then(fn),
      new Promise((resolve) => setTimeout(resolve, MAX_LOCK_MS)),
    ]).finally(() => {
      lockedRef.current = false;
    });
  }, []);

  return { locked, withLock };
};

export default useAudioLock;
