import { supabase } from './supabase';

// Parent-recorded audio clips, stored in the public "recordings" bucket at
// <category>/<name>.<ext>. A single recordings_meta row holds a version stamp
// plus a manifest { "<category>/<name>": { path, mime, updated_at } }.
//
// Playback is cache-first (Cache Storage API) — the kid's session never waits
// on the network. The only per-load fetch is the tiny meta row, compared
// against the locally cached version to decide whether anything changed.

export const ADMIN_EMAIL = 'subhransu.kumar.mishra@gmail.com';

const BUCKET = 'recordings';
const CACHE_NAME = 'recordings-v1';
const LS_VERSION = 'recordings-version';
const LS_MANIFEST = 'recordings-manifest';

const SYLLABLE_FAMILIES = ['a', 'e', 'i', 'o', 'u'];

// Maps a view category ("phonics-a") to a recordings category ("syllables"),
// or null when that view has no recorded audio.
export const recordingCategoryFor = (viewCategory) => {
  if (!viewCategory?.startsWith('phonics-')) return null;
  const family = viewCategory.slice('phonics-'.length);
  return SYLLABLE_FAMILIES.includes(family) ? 'syllables' : null;
};

export const recordingKey = (category, name) => `${category}/${name}`;

const readLocalManifest = () => {
  try {
    return JSON.parse(localStorage.getItem(LS_MANIFEST)) || {};
  } catch {
    return {};
  }
};

let manifest = readLocalManifest();
let version = localStorage.getItem(LS_VERSION) || '';
const objectUrls = new Map();

const persistLocal = () => {
  localStorage.setItem(LS_MANIFEST, JSON.stringify(manifest));
  localStorage.setItem(LS_VERSION, version);
};

const publicUrl = (path) =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

// The fetch/cache URL carries the updated_at stamp so a re-recorded clip is a
// brand-new URL — busts both the storage CDN cache and our Cache Storage entry.
const cacheUrl = (entry) =>
  `${publicUrl(entry.path)}?v=${encodeURIComponent(entry.updated_at)}`;

export const hasRecording = (category, name) =>
  Boolean(manifest[recordingKey(category, name)]);

export const getRecordingEntry = (category, name) =>
  manifest[recordingKey(category, name)] || null;

const fetchIntoCache = async (entry) => {
  const url = cacheUrl(entry);
  let cache = null;
  try {
    cache = await caches.open(CACHE_NAME);
    const hit = await cache.match(url);
    if (hit) return await hit.blob();
  } catch {
    // Cache API unavailable (insecure context) — fall through to network only
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Recording fetch failed (${res.status})`);
  if (cache) await cache.put(url, res.clone());
  return await res.blob();
};

// Object URL for a recorded clip: cache-first, network on miss, null when no
// recording exists or the bytes are unreachable (caller decides the fallback).
export async function getRecordingObjectUrl(category, name) {
  const key = recordingKey(category, name);
  const entry = manifest[key];
  if (!entry) return null;
  const urlKey = `${key}@${entry.updated_at}`;
  if (objectUrls.has(urlKey)) return objectUrls.get(urlKey);
  try {
    const blob = await fetchIntoCache(entry);
    const url = URL.createObjectURL(blob);
    objectUrls.set(urlKey, url);
    return url;
  } catch (err) {
    console.warn(`Recording "${key}" unavailable:`, err.message);
    return null;
  }
}

// Warm the cache for a set of names (fire-and-forget from category pages).
export async function preloadRecordings(category, names) {
  await Promise.allSettled(
    names
      .filter((name) => hasRecording(category, name))
      .map((name) => getRecordingObjectUrl(category, name))
  );
}

// One meta fetch per app load, after auth. Retries on a later call only if
// the fetch failed (offline / not yet authenticated) — cached audio still
// plays either way.
let syncPromise = null;

export function syncRecordings() {
  if (!syncPromise) {
    syncPromise = doSync()
      .then((ok) => {
        if (!ok) syncPromise = null;
      })
      .catch(() => {
        syncPromise = null;
      });
  }
  return syncPromise;
}

async function doSync() {
  const { data, error } = await supabase
    .from('recordings_meta')
    .select('version, manifest')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) return false;
  if (data.version === version) return true;

  manifest = data.manifest || {};
  version = data.version || '';
  persistLocal();

  // Background refresh: download new/changed clips, drop stale cache entries.
  try {
    const cache = await caches.open(CACHE_NAME);
    const wanted = new Set(Object.values(manifest).map(cacheUrl));
    const keys = await cache.keys();
    await Promise.all(
      keys.filter((req) => !wanted.has(req.url)).map((req) => cache.delete(req))
    );
    await Promise.allSettled(
      Object.values(manifest).map(async (entry) => {
        const url = cacheUrl(entry);
        if (!(await cache.match(url))) {
          const res = await fetch(url);
          if (res.ok) await cache.put(url, res);
        }
      })
    );
  } catch {
    // No Cache API — clips will stream from the network on demand
  }
  return true;
}

// ---- Admin (recorder page) ----

const extForMime = (mime) => {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4') || mime.includes('aac')) return 'mp4';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mpeg')) return 'mp3';
  return 'webm';
};

// Saves are serialized so two quick takes can't interleave meta-row writes.
let writeQueue = Promise.resolve();

export function uploadRecording(category, name, blob) {
  const run = writeQueue.then(() => doUpload(category, name, blob));
  writeQueue = run.catch(() => {});
  return run;
}

async function doUpload(category, name, blob) {
  const mime = blob.type || 'audio/webm';
  const key = recordingKey(category, name);
  const path = `${key}.${extForMime(mime)}`;
  const prev = manifest[key];

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true, contentType: mime, cacheControl: '31536000' });
  if (uploadError) throw new Error(uploadError.message);

  // A browser switch can change the extension; the old file would linger
  if (prev && prev.path !== path) {
    await supabase.storage.from(BUCKET).remove([prev.path]);
  }

  const now = new Date().toISOString();
  manifest = { ...manifest, [key]: { path, mime, updated_at: now } };
  version = now;
  persistLocal();

  const { error: metaError } = await supabase
    .from('recordings_meta')
    .upsert({ id: 1, version, manifest, updated_at: now });
  if (metaError) throw new Error(metaError.message);

  // Prime this device's cache so the clip it just made never refetches
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(
      cacheUrl(manifest[key]),
      new Response(blob, { headers: { 'Content-Type': mime } })
    );
  } catch {
    // No Cache API — playback will fetch from storage instead
  }
  return manifest[key];
}
