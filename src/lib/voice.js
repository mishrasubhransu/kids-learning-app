import { supabase } from './supabase';
import manifest from '../data/voiceManifest.json';
import { getActiveLocale } from './locale';

// Pre-generated voice clips (ElevenLabs for en, Gemini TTS for the other
// locales), stored in the public "voice" bucket at <locale>/<key>.mp3 (keys
// built in lib/voiceKeys.js). The manifest ships with the app bundle — the
// clip set is derived from the same source data, so it versions with the
// code and needs no per-load meta fetch.
//
// Playback is cache-first (Cache Storage API), same pattern as
// lib/recordings.js: the fetch URL carries the clip's generation stamp, so
// a regenerated clip is a brand-new URL.

const BUCKET = 'voice';
const CACHE_NAME = 'voice-v1';

const clips = manifest.clips || {};
const objectUrls = new Map();

const entryFor = (key) => clips[`${getActiveLocale()}/${key}`];

export const hasVoiceClip = (key) => Boolean(entryFor(key));

const publicUrl = (path) =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

const cacheUrl = (fullKey, entry) => `${publicUrl(`${fullKey}.mp3`)}?v=${entry.v}`;

// Object URL for a clip: cache-first, network on miss, null when the key
// isn't in the manifest or the bytes are unreachable (caller falls back).
export async function getVoiceClipUrl(key) {
  const entry = entryFor(key);
  if (!entry) return null;
  const fullKey = `${getActiveLocale()}/${key}`;
  const urlKey = `${fullKey}@${entry.v}`;
  if (objectUrls.has(urlKey)) return objectUrls.get(urlKey);
  try {
    const url = cacheUrl(fullKey, entry);
    let cache = null;
    let blob = null;
    try {
      cache = await caches.open(CACHE_NAME);
      const hit = await cache.match(url);
      if (hit) blob = await hit.blob();
    } catch {
      // Cache API unavailable (insecure context) — network only
    }
    if (!blob) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Voice clip fetch failed (${res.status})`);
      if (cache) await cache.put(url, res.clone());
      blob = await res.blob();
    }
    const objUrl = URL.createObjectURL(blob);
    objectUrls.set(urlKey, objUrl);
    return objUrl;
  } catch (err) {
    console.warn(`Voice clip "${key}" unavailable:`, err.message);
    return null;
  }
}

// Warm the cache for a set of parts/keys (fire-and-forget from pages).
export async function preloadVoiceClips(keys) {
  await Promise.allSettled(
    keys
      .map((k) => (typeof k === 'string' ? k : k.key))
      .filter(hasVoiceClip)
      .map(getVoiceClipUrl)
  );
}

// Drop cached bytes whose URL no longer matches the manifest (regenerated
// clips get a new ?v=). Fire-and-forget once per app load.
export async function pruneVoiceCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const wanted = new Set(
      Object.entries(clips).map(([fullKey, entry]) => cacheUrl(fullKey, entry))
    );
    const keys = await cache.keys();
    await Promise.all(
      keys.filter((req) => !wanted.has(req.url)).map((req) => cache.delete(req))
    );
  } catch {
    // No Cache API — nothing cached to prune
  }
}
