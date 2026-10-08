import { useEffect, useState } from 'react';

// Browsers can't report "a keyboard is attached", so this infers it: a
// mouse/trackpad as the PRIMARY pointer means a laptop or desktop (a
// touchscreen laptop still reports a fine primary pointer), and any real
// letter/number keypress proves a keyboard on anything else — a tablet in a
// keyboard case flips over on its first keystroke. Once seen, it sticks for
// the life of the component; a tablet that loses its case shows the
// on-screen keys again next visit.
const DESKTOP_QUERY = '(hover: hover) and (pointer: fine)';

const desktopPointer = () =>
  typeof window !== 'undefined' && window.matchMedia?.(DESKTOP_QUERY).matches;

export default function usePhysicalKeyboard() {
  const [hasKeyboard, setHasKeyboard] = useState(desktopPointer);

  useEffect(() => {
    if (hasKeyboard) return;
    const onKey = (e) => {
      if (e.key?.length === 1 && /[a-z0-9]/i.test(e.key)) setHasKeyboard(true);
    };
    const media = window.matchMedia?.(DESKTOP_QUERY);
    const onMedia = (e) => e.matches && setHasKeyboard(true);
    window.addEventListener('keydown', onKey);
    media?.addEventListener?.('change', onMedia);
    return () => {
      window.removeEventListener('keydown', onKey);
      media?.removeEventListener?.('change', onMedia);
    };
  }, [hasKeyboard]);

  return hasKeyboard;
}
