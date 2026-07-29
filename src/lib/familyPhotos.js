import { supabase } from './supabase';

// Family member photos: public-read bucket with unguessable uuid paths
// (same trust model as name-audio); RLS restricts writes to the caller's
// own <user_id>/ folder. Paths are timestamped so replacing a photo is a
// brand-new URL — no stale caches.

const BUCKET = 'family-photos';

export const familyPhotoUrl = (path) =>
  path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null;

// Phone photos are huge; the lesson shows at most a few hundred px. Decode,
// fit inside maxDim, re-encode as JPEG (canvas WebP encode is not universal).
const downscale = (file, maxDim = 900) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not process photo'))),
        'image/jpeg',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read photo'));
    };
    img.src = url;
  });

export const uploadFamilyPhoto = async (userId, memberId, file) => {
  const blob = await downscale(file);
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
