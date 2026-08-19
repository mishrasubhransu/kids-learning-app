import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import {
  uploadFamilyPhoto,
  removeFamilyPhoto,
  removeFamilyPhotos,
} from '../lib/familyPhotos';

// Family members for the signed-in account (shared by every child profile —
// the same grandma belongs to all siblings). Same caching philosophy as
// child profiles: localStorage copy loads instantly, the network refresh
// wins when it arrives, and network errors keep the local copy.
//
// Name clips are fire-and-forget: created/renamed members get an ElevenLabs
// clip via the name-audio API; until (or unless) it lands, the lesson just
// speaks the name with TTS.

const LS_CACHE = 'familyMembers-v2'; // { userId, members } — v2: photo_paths + relation_detail

// photo_paths is canonical; rows from before the multi-photo migration may
// only have the single photo_path
export const memberPhotoPaths = (member) =>
  member?.photo_paths?.length
    ? member.photo_paths
    : member?.photo_path
      ? [member.photo_path]
      : [];

// A member has their voice when the stored clip matches name_lang: en
// speaks mp3 (ElevenLabs), every other locale wav (Gemini) — so a missing
// path or a mismatched extension is a clip the API failed to (re)generate,
// e.g. a TTS quota outage killing a language-change wave. Same heuristic
// as scripts/regenerate-family-name-audio.mjs.
export const memberAudioStale = (member) => {
  const ext = (member?.name_lang || 'en') === 'en' ? 'mp3' : 'wav';
  return !member?.name_audio_path?.endsWith(`.${ext}`);
};

// Lesson order: members with a fixed turn (sort_order 1, 2, 3…) lead in
// that order, everyone on random (sort_order 0) follows — the lesson
// shuffles that tail per visit. Sorted client-side because the DB's plain
// ascending order would put the 0s first.
const byLessonOrder = (a, b) =>
  (a.sort_order || Infinity) - (b.sort_order || Infinity) ||
  (a.created_at || '').localeCompare(b.created_at || '');
const sortMembers = (members) => members && [...members].sort(byLessonOrder);

// Saving a fixed turn that's already taken shifts the chain down: whoever
// holds that turn moves one down, and if THAT number is held too the chain
// keeps going — stopping at the first free number, so a gap ends the
// cascade. Returns the {id, sort_order} row updates to make it so.
const turnShifts = (members, turn, excludeId) => {
  if (!turn) return [];
  const updates = [];
  const moved = new Set([excludeId]);
  for (let n = turn; ; n++) {
    const occupants = (members || []).filter(
      (m) => !moved.has(m.id) && (m.sort_order || 0) === n
    );
    if (!occupants.length) return updates;
    occupants.forEach((m) => {
      moved.add(m.id);
      updates.push({ id: m.id, sort_order: n + 1 });
    });
  }
};

// Sequential on purpose — it's at most a handful of rows, and a failure
// just leaves a tie the next fetch (or re-save) reconciles
const pushTurnShifts = async (shifts) => {
  for (const s of shifts) {
    await supabase
      .from('family_members')
      .update({ sort_order: s.sort_order, updated_at: new Date().toISOString() })
      .eq('id', s.id);
  }
};

const withTurnShifts = (members, shifts) =>
  (members || []).map((m) => {
    const s = shifts.find((u) => u.id === m.id);
    return s ? { ...m, sort_order: s.sort_order } : m;
  });

const readCache = (userId) => {
  try {
    const cached = JSON.parse(localStorage.getItem(LS_CACHE));
    return cached?.userId === userId ? sortMembers(cached.members) : null;
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
        const next = sortMembers(
          typeof updater === 'function' ? updater(base) : updater
        );
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
          const sorted = sortMembers(data);
          setState({ userId: user.id, members: sorted });
          writeCache(user.id, sorted);
        }
        // Offline or table missing: fail open with whatever the cache had
        setLoadedFor(user.id);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Member ids with a clip generation in flight — in-flight isn't stranded,
  // so the Fix-audio warning ignores these (no banner flash on every add,
  // no double-generation from a mid-flight Fix click).
  const [pendingAudio, setPendingAudio] = useState(() => new Set());

  // Ask the serverless function for the member's name clip. Fire-and-forget
  // for add/update callers (a dev server without the API runtime, or any
  // failure, just means TTS); returns whether a fresh clip landed so the
  // Fix-audio flow can count what's still stale.
  const requestMemberAudio = useCallback(
    async (memberId) => {
      const token = session?.access_token;
      if (!token) return false;
      setPendingAudio((prev) => new Set(prev).add(memberId));
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
          return true;
        }
        return false;
      } catch {
        /* TTS fallback covers it */
        return false;
      } finally {
        setPendingAudio((prev) => {
          const next = new Set(prev);
          next.delete(memberId);
          return next;
        });
      }
    },
    [session, apply]
  );

  // relationDetail is the kinship path ({ steps, seniority, label }) or null
  // for the flat legacy values (friend, pet…); the legacy `relation` column
  // is always written too so stale clients keep rendering something sane.
  // photoFiles is an array — photo_paths is canonical, photo_path mirrors
  // its first entry for back-compat.
  const addMember = useCallback(
    async ({
      name,
      relation,
      relationDetail = null,
      childProfileId = null,
      nameLang = 'en',
      namePhonetic = null,
      sortOrder = 0,
      photoFiles = [],
    }) => {
      if (!user) return null;
      const shifts = turnShifts(members, sortOrder, null);
      const { data, error } = await supabase
        .from('family_members')
        .insert({
          user_id: user.id,
          name,
          relation,
          relation_detail: relationDetail,
          child_profile_id: childProfileId,
          name_lang: nameLang,
          name_phonetic: namePhonetic?.trim() || null,
          sort_order: sortOrder,
        })
        .select()
        .single();
      if (error || !data) throw new Error(error?.message || 'Could not save');
      let member = data;
      if (photoFiles.length) {
        const photo_paths = [];
        for (const blob of photoFiles) {
          photo_paths.push(await uploadFamilyPhoto(user.id, member.id, blob));
        }
        const { data: updated } = await supabase
          .from('family_members')
          .update({
            photo_paths,
            photo_path: photo_paths[0],
            updated_at: new Date().toISOString(),
          })
          .eq('id', member.id)
          .select()
          .single();
        member = updated || { ...member, photo_paths, photo_path: photo_paths[0] };
      }
      await pushTurnShifts(shifts);
      apply((prev) => [...withTurnShifts(prev, shifts), member]);
      requestMemberAudio(member.id);
      return member;
    },
    [user, members, apply, requestMemberAudio]
  );

  // keptPhotoPaths: existing paths the parent did NOT remove (undefined =
  // keep all). Dropped files leave storage only after the row stops
  // referencing them, so a failed update never orphans the row's photos.
  const updateMember = useCallback(
    async (
      memberId,
      {
        name,
        relation,
        relationDetail = null,
        childProfileId = null,
        nameLang = 'en',
        namePhonetic = null,
        sortOrder = 0,
        keptPhotoPaths,
        photoFiles = [],
      }
    ) => {
      if (!user) return;
      const before = members?.find((m) => m.id === memberId);
      const shifts = turnShifts(members, sortOrder, memberId);
      const prevPaths = memberPhotoPaths(before);
      const kept = keptPhotoPaths ?? prevPaths;
      const fields = {
        name,
        relation,
        relation_detail: relationDetail,
        child_profile_id: childProfileId,
        name_lang: nameLang,
        name_phonetic: namePhonetic?.trim() || null,
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
      };
      if (photoFiles.length || keptPhotoPaths) {
        const added = [];
        for (const blob of photoFiles) {
          added.push(await uploadFamilyPhoto(user.id, memberId, blob));
        }
        fields.photo_paths = [...kept, ...added];
        fields.photo_path = fields.photo_paths[0] ?? null;
      }
      const { data, error } = await supabase
        .from('family_members')
        .update(fields)
        .eq('id', memberId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      prevPaths.filter((p) => !kept.includes(p)).forEach(removeFamilyPhoto);
      await pushTurnShifts(shifts);
      apply((prev) =>
        withTurnShifts(prev, shifts).map((m) => (m.id === memberId ? data : m))
      );
      // A changed name, voice language OR pronunciation spelling means the
      // old clip is wrong
      const langChanged = nameLang !== (before?.name_lang || 'en');
      const phoneticChanged =
        (namePhonetic?.trim() || null) !== (before?.name_phonetic || null);
      if ((name && name !== before?.name) || langChanged || phoneticChanged) {
        requestMemberAudio(memberId);
      }
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

  return {
    members: members || [],
    loading,
    addMember,
    updateMember,
    removeMember,
    requestMemberAudio,
    pendingAudio,
  };
};

export default useFamilyMembers;
