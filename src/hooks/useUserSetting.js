import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Per-user setting backed by Supabase (user_settings table) with
// localStorage as an instant-load cache. Works offline or before the
// table exists — Supabase errors are ignored and localStorage wins.
const useUserSetting = (key, defaultValue) => {
  const { user } = useAuth();
  const storageKey = `setting-${key}`;
  const [value, setValue] = useState(
    () => localStorage.getItem(storageKey) ?? defaultValue
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('user_settings')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', key)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setValue(data.value);
        localStorage.setItem(storageKey, data.value);
      });
    return () => {
      cancelled = true;
    };
  }, [user, key, storageKey]);

  const update = useCallback(
    (next) => {
      setValue(next);
      localStorage.setItem(storageKey, next);
      if (user) {
        supabase
          .from('user_settings')
          .upsert(
            { user_id: user.id, key, value: next, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,key' }
          )
          .then(({ error }) => {
            if (error) console.warn(`Setting "${key}" sync failed:`, error.message);
          });
      }
    },
    [user, key, storageKey]
  );

  return [value, update];
};

export default useUserSetting;
