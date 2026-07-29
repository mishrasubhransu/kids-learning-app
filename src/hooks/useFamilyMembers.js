import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { uploadFamilyPhoto, removeFamilyPhotos } from '../lib/familyPhotos';

// Family members for the signed-in account (shared by every child profile —
// the same grandma belongs to all siblings). Same caching philosophy as
// child profiles: localStorage copy loads instantly, the network refresh
// wins when it arrives, and network errors keep the local copy.
//
// Name clips are fire-and-forget: created/renamed members get an ElevenLabs
// clip via the name-audio API; until (or unless) it lands, the lesson just
// speaks the name with TTS.

const LS_CACHE = 'familyMembers-v1'; // { userId, members }

const readCache = (userId) => {
  try {
    const cached = JSON.parse(localStorage.getItem(LS_CACHE));
    return cached?.userId === userId ? cached.members : null;
  } catch {
    return null;
  }
};

const writeCache = (userId, members) => {
  try {
    localStorage.setItem(LS_CACHE, JSON.stringify({ userId, members }));
  } catch {
    /* cache is best-effort */
  }
};

const useFamilyMembers = () => {
  const { user, session } = useAuth();
  // State is keyed by userId so a signed-in-account change never flashes
  // the previous family — the derived value below just goes null until the
  // new account's fetch lands
  const [state, setState] = useState(() => ({
    userId: user?.id ?? null,
    members: readCache(user?.id) || null,
  }));
  // Which account's fetch has completed — loading is derived, not stored
  const [loadedFor, setLoadedFor] = useState(null);
  const members = state.userId === (user?.id ?? null) ? state.members : null;
  const loading = Boolean(user) && loadedFor !== user.id && members === null;

  const apply = useCallback(
    (updater) => {
      setState((prev) => {
        const base = prev.userId === user?.id ? prev.members : null;
        const next = typeof updater === 'function' ? updater(base) : updater;
        if (user) writeCache(user.id, next);
        return { userId: user?.id ?? null, members: next };
      });
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from('family_members')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) {
          setState({ userId: user.id, members: data });
          writeCache(user.id, data);
        }
        // Offline or table missing: fail open with whatever the cache had
        setLoadedFor(user.id);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Ask the serverless function for the member's name clip. Fire-and-forget:
  // a dev server without the API runtime (or any failure) just means TTS.
  const requestMemberAudio = useCallback(
    async (memberId) => {
      const token = session?.access_token;
      if (!token) return;
      try {
        const res = await fetch('/api/generate-name-audio', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ memberId, action: 'name' }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.path) {
          apply((prev) =>
            (prev || []).map((m) =>
              m.id === memberId ? { ...m, name_audio_path: data.path } : m
            )
          );
        }
      } catch {
        /* TTS fallback covers it */
      }
    },
    [session, apply]
  );

  const addMember = useCallback(
    async ({ name, relation, photoFile }) => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('family_members')
        .insert({ user_id: user.id, name, relation })
        .select()
        .single();
      if (error || !data) throw new Error(error?.message || 'Could not save');
      let member = data;
      if (photoFile) {
        const photo_path = await uploadFamilyPhoto(user.id, member.id, photoFile);
        const { data: updated } = await supabase
          .from('family_members')
          .update({ photo_path, updated_at: new Date().toISOString() })
          .eq('id', member.id)
          .select()
          .single();
        member = updated || { ...member, photo_path };
      }
      apply((prev) => [...(prev || []), member]);
      requestMemberAudio(member.id);
      return member;
    },
    [user, apply, requestMemberAudio]
  );

  const updateMember = useCallback(
    async (memberId, { name, relation, photoFile }) => {
      if (!user) return;
      const before = members?.find((m) => m.id === memberId);
      const fields = { name, relation, updated_at: new Date().toISOString() };
      if (photoFile) {
        fields.photo_path = await uploadFamilyPhoto(user.id, memberId, photoFile);
      }
      const { data, error } = await supabase
        .from('family_members')
        .update(fields)
        .eq('id', memberId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      apply((prev) => (prev || []).map((m) => (m.id === memberId ? data : m)));
      if (name && name !== before?.name) requestMemberAudio(memberId);
    },
    [user, members, apply, requestMemberAudio]
  );

  const removeMember = useCallback(
    async (memberId) => {
      if (!user) return;
      apply((prev) => (prev || []).filter((m) => m.id !== memberId));
      // Voice clips live in the service-role-only bucket, so the API removes
      // them — before the row delete, which its ownership check needs.
      const token = session?.access_token;
      if (token) {
        try {
          await fetch('/api/generate-name-audio', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ memberId, action: 'delete' }),
          });
        } catch {
          /* storage cleanup is best-effort */
        }
      }
      await removeFamilyPhotos(user.id, memberId);
      await supabase.from('family_members').delete().eq('id', memberId);
    },
    [user, session, apply]
  );

  return { members: members || [], loading, addMember, updateMember, removeMember };
};

export default useFamilyMembers;
