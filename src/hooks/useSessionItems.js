import { useEffect, useMemo, useRef } from 'react';
import useChildSetting from './useChildSetting';
import { voiceSlug } from '../lib/locale';

// Caps how many items a lesson or test session shows, preferring the ones
// the child did NOT see last session — so a capped category cycles fully
// across visits instead of repeating the same first N. Selection only: the
// picked items keep their canonical order (a capped alphabet is a sliding
// A–H, I–P… window, never a scramble).
//
// The pick is persisted per child as this session's "last shown" set —
// JSON-stringified because useChildSetting mirrors values to localStorage.
// `active` defers persisting until the mode actually shows these items, so
// a test pool that was never opened doesn't rotate.
const parseShown = (raw) => {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

// Keyed by the locale-independent slug (English-derived), so a language
// switch never resets a child's rotation. Pre-split state stored raw names
// ("Ice Cream"); those keys just read as unseen once — a one-time reshuffle,
// not data loss.
const itemKey = (item) => item.slug ?? voiceSlug(String(item.name ?? item.id));

const useSessionItems = (category, kind, items, cap, active = true) => {
  const storageKey = `${kind}Shown-${category}`;
  const [lastShownRaw, setLastShown] = useChildSetting(storageKey, null);
  const capNum = !cap || cap === 'all' ? Infinity : Number(cap) || Infinity;
  const persistedRef = useRef(null);

  // lastShownRaw is read at pick time but deliberately NOT a dependency:
  // the pick must stay frozen for the visit — our own persist updates the
  // setting, and re-picking then would swap a live session's items (and
  // reset any game keyed on their identity).
  const picked = useMemo(() => {
    if (!items || items.length === 0 || capNum >= items.length) return items;
    const lastShown = new Set(parseShown(lastShownRaw));
    const unseen = items.filter((i) => !lastShown.has(itemKey(i)));
    const seen = items.filter((i) => lastShown.has(itemKey(i)));
    const pick = new Set([...unseen, ...seen].slice(0, capNum).map(itemKey));
    return items.filter((i) => pick.has(itemKey(i)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, capNum, storageKey]);

  useEffect(() => {
    if (!active || !picked || picked === items) return;
    const serialized = JSON.stringify(picked.map(itemKey));
    const persistKey = `${storageKey}:${serialized}`;
    if (persistedRef.current === persistKey) return;
    persistedRef.current = persistKey;
    setLastShown(serialized);
  }, [active, picked, items, storageKey, setLastShown]);

  return picked;
};

export default useSessionItems;
