import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { setAnalyticsChild } from '../lib/analytics';
import { defaultEnabledLessons } from '../data/lessons';
import { CATEGORY_IMAGE_STYLES } from '../lib/imageStyles';

// Child profiles: fetched once per session, cached in localStorage for
// instant load (same philosophy as useUserSetting — network errors are
// swallowed and the local copy wins).
//
// The ACTIVE child is deliberately device-local (localStorage only, never
// synced): two siblings can be on two tablets at once, each with their own
// profile — cross-device sync would make them fight.

const LS_CACHE = 'childProfiles-v1'; // { userId, profiles }
const LS_ACTIVE = 'activeChildId';

export const DEFAULT_CHILD_NAME = 'My Child';

const ChildProfileContext = createContext({});

export const useChildProfile = () => useContext(ChildProfileContext);

const readCache = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_CACHE)) || null;
  } catch {
    return null;
  }
};

const writeCache = (userId, profiles) => {
  try {
    localStorage.setItem(LS_CACHE, JSON.stringify({ userId, profiles }));
  } catch {
    /* storage full — cache is best-effort */
  }
};

// The device's pre-profile settings become the auto-created profile's
// settings, so nothing visibly resets for existing users.
const legacyDeviceSettings = () => {
  const s = { enabledLessons: defaultEnabledLessons() };
  const numberMax = localStorage.getItem('numberMax');
  if (numberMax) s.numberMax = numberMax;
  const objectType = localStorage.getItem('objectType');
  if (objectType) s.objectType = objectType;
  const letterCase = localStorage.getItem('setting-letterCase');
  if (letterCase) s.letterCase = letterCase;
  Object.keys(CATEGORY_IMAGE_STYLES).forEach((cat) => {
    const style = localStorage.getItem(`imageStyle-${cat}`);
    if (style) s[`imageStyle-${cat}`] = style;
  });
  return s;
};

export const ChildProfileProvider = ({ children }) => {
  const { user, session } = useAuth();
  const [profiles, setProfiles] = useState(() => {
    const cached = readCache();
    return cached?.profiles ?? null;
  });
  const [activeChildId, setActiveChildId] = useState(
    () => localStorage.getItem(LS_ACTIVE) || null
  );
  const [loading, setLoading] = useState(true);
  // childId -> { state: 'generating' | 'ready' | 'error', message? } so the
  // Parent Zone can show clip progress and surface real error messages
  const [nameAudioStatus, setNameAudioStatus] = useState({});
  const bootstrapping = useRef(false);

  const applyProfiles = useCallback(
    (userId, next) => {
      setProfiles(next);
      writeCache(userId, next);
    },
    []
  );

  // Ask the serverless function to generate the ElevenLabs name clip for
  // praise splicing. Never blocks the app; progress and errors land in
  // nameAudioStatus so the Parent Zone can show them (and offer retry).
  const requestNameAudio = useCallback(
    async (childId) => {
      const token = session?.access_token;
      if (!token || !childId) return;
      setNameAudioStatus((s) => ({ ...s, [childId]: { state: 'generating' } }));
      try {
        const res = await fetch('/api/generate-name-audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ childId }),
        });
        let data = null;
        try {
          data = await res.json();
        } catch {
          // Not JSON — e.g. the Vite dev server answered because no
          // serverless runtime is attached (vercel dev not running)
        }
        if (res.ok && data?.path) {
          setProfiles((prev) => {
            const next = (prev || []).map((p) =>
              p.id === childId ? { ...p, name_audio_path: data.path } : p
            );
            if (user) writeCache(user.id, next);
            return next;
          });
          setNameAudioStatus((s) => ({ ...s, [childId]: { state: 'ready' } }));
        } else {
          const message =
            data?.error || `Audio service unavailable (HTTP ${res.status})`;
          setNameAudioStatus((s) => ({
            ...s,
            [childId]: { state: 'error', message },
          }));
        }
      } catch {
        setNameAudioStatus((s) => ({
          ...s,
          [childId]: { state: 'error', message: 'Network error' },
        }));
      }
    },
    [user, session]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      // A different Google account on this device must not see the previous
      // family's cached names
      const cached = readCache();
      if (cached && cached.userId !== user.id) {
        setProfiles(null);
        localStorage.removeItem(LS_CACHE);
        localStorage.removeItem(LS_ACTIVE);
        setActiveChildId(null);
      }

      const { data, error } = await supabase
        .from('child_profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (error) {
        // Offline or table missing: keep whatever the cache had, fail open
        setLoading(false);
        return;
      }
      if (data.length > 0) {
        applyProfiles(user.id, data);
        setLoading(false);
        return;
      }
      // First run for this account: auto-create one profile with everything
      // enabled + this device's legacy settings, so nothing visibly changes.
      // The partial unique index on is_default makes a two-device race safe.
      if (bootstrapping.current) return;
      bootstrapping.current = true;
      const { data: created, error: insertError } = await supabase
        .from('child_profiles')
        .insert({
          user_id: user.id,
          name: DEFAULT_CHILD_NAME,
          avatar: '🦁',
          is_default: true,
          settings: legacyDeviceSettings(),
        })
        .select()
        .single();
      if (cancelled) return;
      if (insertError) {
        // Unique violation = another device won the race; take its row
        const { data: retry } = await supabase
          .from('child_profiles')
          .select('*')
          .order('created_at', { ascending: true });
        if (!cancelled && retry?.length) applyProfiles(user.id, retry);
      } else if (created) {
        applyProfiles(user.id, [created]);
      }
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, applyProfiles]);

  const activeChild = useMemo(() => {
    if (!profiles || profiles.length === 0) return null;
    return profiles.find((p) => p.id === activeChildId) || profiles[0];
  }, [profiles, activeChildId]);

  // Self-heal: generation only fires on create/rename, so a one-time failure
  // (dev server without /api, missing env vars, network) would otherwise
  // leave a profile silent forever. Retry once per session for named
  // profiles that still have no clip.
  const nameAudioAttempts = useRef(new Set());
  useEffect(() => {
    if (!profiles || !session) return;
    profiles.forEach((p) => {
      if (
        p.name !== DEFAULT_CHILD_NAME &&
        !p.name_audio_path &&
        !nameAudioAttempts.current.has(p.id)
      ) {
        nameAudioAttempts.current.add(p.id);
        requestNameAudio(p.id);
      }
    });
  }, [profiles, session, requestNameAudio]);

  useEffect(() => {
    setAnalyticsChild(activeChild?.id ?? null);
  }, [activeChild]);

  const setActiveChild = useCallback((childId) => {
    setActiveChildId(childId);
    localStorage.setItem(LS_ACTIVE, childId);
  }, []);

  const createChild = useCallback(
    async ({ name, avatar, birthdate, settings }) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('child_profiles')
        .insert({
          user_id: user.id,
          name,
          avatar: avatar || '🦁',
          birthdate: birthdate || null,
          settings: settings || { enabledLessons: defaultEnabledLessons() },
        })
        .select()
        .single();
      if (error || !data) return null;
      setProfiles((prev) => {
        const next = [...(prev || []), data];
        writeCache(user.id, next);
        return next;
      });
      requestNameAudio(data.id);
      return data;
    },
    [user, requestNameAudio]
  );

  const updateChild = useCallback(
    async (childId, fields) => {
      if (!user) return;
      const before = profiles?.find((p) => p.id === childId);
      setProfiles((prev) => {
        const next = (prev || []).map((p) =>
          p.id === childId ? { ...p, ...fields } : p
        );
        writeCache(user.id, next);
        return next;
      });
      const { error } = await supabase
        .from('child_profiles')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', childId);
      if (error) {
        console.warn('Child profile sync failed:', error.message);
        return;
      }
      if (fields.name && fields.name !== before?.name) {
        requestNameAudio(childId);
      }
    },
    [user, profiles, requestNameAudio]
  );

  const deleteChild = useCallback(
    async (childId) => {
      if (!user || !profiles || profiles.length <= 1) return; // never zero profiles
      setProfiles((prev) => {
        const next = (prev || []).filter((p) => p.id !== childId);
        writeCache(user.id, next);
        return next;
      });
      if (activeChildId === childId) {
        const remaining = profiles.filter((p) => p.id !== childId);
        if (remaining[0]) setActiveChild(remaining[0].id);
      }
      await supabase.from('child_profiles').delete().eq('id', childId);
    },
    [user, profiles, activeChildId, setActiveChild]
  );

  // Merge-patch of settings keys, optimistic locally, per-key merge on the
  // server (patch_child_settings RPC) so concurrent sessions editing
  // different toggles don't clobber each other.
  const patchChildSettings = useCallback(
    (childId, patch) => {
      if (!user || !childId) return;
      setProfiles((prev) => {
        const next = (prev || []).map((p) =>
          p.id === childId ? { ...p, settings: { ...p.settings, ...patch } } : p
        );
        writeCache(user.id, next);
        return next;
      });
      supabase
        .rpc('patch_child_settings', { p_child_id: childId, p_patch: patch })
        .then(({ error }) => {
          if (error) console.warn('Child settings sync failed:', error.message);
        });
    },
    [user]
  );

  const updateActiveChildSettings = useCallback(
    (patch) => {
      if (activeChild) patchChildSettings(activeChild.id, patch);
    },
    [activeChild, patchChildSettings]
  );

  const value = useMemo(
    () => ({
      childProfiles: profiles,
      activeChild,
      loading,
      setActiveChild,
      createChild,
      updateChild,
      deleteChild,
      patchChildSettings,
      updateActiveChildSettings,
      nameAudioStatus,
      requestNameAudio,
    }),
    [
      profiles,
      activeChild,
      loading,
      setActiveChild,
      createChild,
      updateChild,
      deleteChild,
      patchChildSettings,
      updateActiveChildSettings,
      nameAudioStatus,
      requestNameAudio,
    ]
  );

  return (
    <ChildProfileContext.Provider value={value}>
      {children}
    </ChildProfileContext.Provider>
  );
};
