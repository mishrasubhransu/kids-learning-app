import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';

// Per-family setting backed by Supabase (user_settings table, keyed by the
// family's owner id) with localStorage as an instant-load cache. Works
// offline or before the table exists — Supabase errors are ignored and
// localStorage wins. A child login reads these but its writes are refused
// by RLS (and only warn).
const useUserSetting = (key, defaultValue) => {
  const { user } = useAuth();
  const { familyId, resolved } = useFamily();
  const storageKey = `setting-${key}`;
  const [value, setValue] = useState(
    () => localStorage.getItem(storageKey) ?? defaultValue
  );

  useEffect(() => {
    if (!user || !resolved) return;
    let cancelled = false;
    supabase
      .from('user_settings')
      .select('value')
      .eq('user_id', familyId)
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
  }, [user, familyId, resolved, key, storageKey]);

  const update = useCallback(
    (next) => {
      setValue(next);
      localStorage.setItem(storageKey, next);
      if (user) {
        supabase
          .from('user_settings')
          .upsert(
            { user_id: familyId, key, value: next, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,key' }
          )
          .then(({ error }) => {
            if (error) console.warn(`Setting "${key}" sync failed:`, error.message);
          });
      }
    },
    [user, familyId, key, storageKey]
  );

  return [value, update];
};

export default useUserSetting;
