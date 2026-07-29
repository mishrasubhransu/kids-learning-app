import { supabase } from './supabase';

// Family member photos: public-read bucket with unguessable uuid paths
// (same trust model as name-audio); RLS restricts writes to the caller's
// own <user_id>/ folder. Paths are timestamped so replacing a photo is a
// brand-new URL — no stale caches.

const BUCKET = 'family-photos';

export const familyPhotoUrl = (path) =>
  path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null;

// The blob arrives already framed and sized: every pick goes through
// PhotoCropper, which exports an exact square JPEG (default 900×900) —
// re-encoding here would only lose quality.
export const uploadFamilyPhoto = async (userId, memberId, blob) => {
  const path = `${userId}/${memberId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return path;
};

// Best-effort: a leftover file is invisible (nothing references it) and
// unguessable, so failures here never surface to the parent.
export const removeFamilyPhotos = async (userId, memberId) => {
  try {
    const prefix = `${userId}/${memberId}`;
    const { data } = await supabase.storage.from(BUCKET).list(prefix, { limit: 100 });
    if (data?.length) {
      await supabase.storage
        .from(BUCKET)
        .remove(data.map((f) => `${prefix}/${f.name}`));
    }
  } catch {
    /* orphaned files are harmless */
  }
};
