import { useState, useCallback } from 'react';
import { useChildProfile } from '../context/ChildProfileContext';

// Per-CHILD setting stored in the active profile's settings jsonb, with the
// old device-wide localStorage key as fallback so nothing resets while
// profiles load (or if they never do). Updates mirror to localStorage so the
// pre-profile fallback stays fresh on this device.
//
// legacyKey covers historical naming: 'numberMax' and 'objectType' were raw
// keys, useUserSetting used 'setting-letterCase', image styles use
// 'imageStyle-<category>'. Defaults to the setting key itself.
const useChildSetting = (key, defaultValue, { legacyKey = key } = {}) => {
  const { activeChild, updateActiveChildSettings } = useChildProfile();
  // Re-render trigger for pre-profile updates that only touch localStorage
  const [, bump] = useState(0);

  // Read the fallback fresh each render: the key can change on a mounted
  // component (CategoryPage navigating between concept subcategories)
  const value =
    activeChild?.settings?.[key] ??
    localStorage.getItem(legacyKey) ??
    defaultValue;

  const update = useCallback(
    (next) => {
      try {
        localStorage.setItem(legacyKey, next);
      } catch {
        /* best-effort mirror */
      }
      updateActiveChildSettings({ [key]: next });
      bump((n) => n + 1);
    },
    [key, legacyKey, updateActiveChildSettings]
  );

  return [value, update];
};

export default useChildSetting;
