#!/usr/bin/env node
/**
 * Generates the app-wide ElevenLabs voice clips (voice Laura, eleven_v3) and
 * uploads them to the public Supabase "voice" bucket at <locale>/<key>.mp3.
 * The clip list comes from scripts/voice-catalog.mjs; bookkeeping lives in
 * src/data/voiceManifest.json — { clips: { "<locale>/<key>": { v, h } } } —
 * which the app bundles to know what exists (v busts caches, h is the text
 * hash used here to skip clips whose text hasn't changed).
 *
 * Reads ELEVENLABS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY from
 * .env. Needs the jsx loader for shapes.jsx:
 *
 *   node --import ./scripts/register-jsx.mjs scripts/generate-voice-clips.mjs
 *
 * Options:
 *   --dry              List counts/chars only, no API calls
 *   --only <prefix>    Restrict to keys starting with prefix (e.g. lines/)
 *   --limit <n>        Stop after n generated clips
 *   --force            Regenerate even when the text hash matches
 *   --prune            Delete bucket+manifest clips no longer in the catalog
 *   --concurrency <n>  Parallel generations (default 2 — the plan's
 *                      concurrent-request limit)
 *   --voice / --model  Override voice or model id
 */

import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { buildCatalog } from './voice-catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'src', 'data', 'voiceManifest.json');

const LOCALE = 'en';
const BUCKET = 'voice';
const BASE_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = 'FGY2WhTYpPnrIDTdsKH5'; // Laura
const DEFAULT_MODEL = 'eleven_v3';

// .env loader — the other generators take env inline, but this one runs for
// ~2k clips and three keys; less to get wrong this way. The project .env
// OVERRIDES inherited env: the shell profile exports SUPABASE/ELEVENLABS
// keys for other projects, which silently break uploads here.
async function loadEnv() {
  try {
    const raw = await readFile(path.join(ROOT, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=("?)(.*)\2\s*$/);
      if (m) process.env[m[1]] = m[3];
    }
  } catch {
    // no .env — rely on the environment
  }
}

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : fallback;
}

const hashText = (text) => createHash('sha1').update(text).digest('hex').slice(0, 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateClip(text, voiceId, model, settings, apiKey) {
  // 429s (concurrent-request limit) are routine on long runs — back off
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(
      `${BASE_URL}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_id: model, voice_settings: settings }),
      }
    );
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const err = await res.text();
    if (res.status === 429 && attempt < 5) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    throw new Error(`ElevenLabs API error ${res.status}: ${err}`);
  }
}

async function main() {
  await loadEnv();
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const dry = process.argv.includes('--dry');
  const force = process.argv.includes('--force');
  const prune = process.argv.includes('--prune');
  const only = getArg('only', null);
  const limit = Number(getArg('limit', Infinity));
  const concurrency = Number(getArg('concurrency', 2));
  const voiceId = getArg('voice', DEFAULT_VOICE_ID);
  const model = getArg('model', DEFAULT_MODEL);

  // Same profile as the letter-sound clips — one voice across the app
  const settings = {
    stability: model.includes('v3') ? 0.5 : 0.3,
    similarity_boost: 0.8,
    style: 0.6,
    speed: 0.95,
    use_speaker_boost: true,
  };

  const catalog = buildCatalog().filter((c) => !only || c.key.startsWith(only));
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  manifest.clips = manifest.clips || {};

  const pending = catalog.filter((c) => {
    const entry = manifest.clips[`${LOCALE}/${c.key}`];
    return force || !entry || entry.h !== hashText(c.text);
  });
  const totalChars = pending.reduce((n, c) => n + c.text.length, 0);

  console.log(
    `Catalog: ${catalog.length} clips | up to date: ${catalog.length - pending.length} | to generate: ${pending.length} (${totalChars} chars)`
  );
  if (dry) {
    const byGroup = {};
    for (const c of catalog) {
      const group = c.key.split('/').slice(0, -1).join('/');
      byGroup[group] = (byGroup[group] || 0) + 1;
    }
    for (const [group, n] of Object.entries(byGroup)) console.log(`  ${group}: ${n}`);
    return;
  }

  if (!apiKey || !supabaseUrl || !serviceKey) {
    console.error('Error: need ELEVENLABS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  let saveQueue = Promise.resolve();
  const saveManifest = () => {
    saveQueue = saveQueue.then(() =>
      writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
    );
    return saveQueue;
  };

  const work = pending.slice(0, limit);
  let done = 0;
  let failed = 0;

  const runOne = async (clip) => {
    const fullKey = `${LOCALE}/${clip.key}`;
    try {
      const bytes = await generateClip(clip.text, voiceId, model, settings, apiKey);
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`${fullKey}.mp3`, bytes, {
          upsert: true,
          contentType: 'audio/mpeg',
          cacheControl: '31536000',
        });
      if (error) throw new Error(`upload: ${error.message}`);
      manifest.clips[fullKey] = { v: Math.floor(Date.now() / 1000), h: hashText(clip.text) };
      manifest.version = new Date().toISOString();
      await saveManifest();
      done++;
      console.log(`  ✓ [${done}/${work.length}] ${clip.key}  "${clip.text}"`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${clip.key}: ${err.message}`);
    }
  };

  const queue = [...work];
  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, async () => {
      while (queue.length) {
        const clip = queue.shift();
        await runOne(clip);
      }
    })
  );

  if (prune) {
    const wanted = new Set(catalog.map((c) => `${LOCALE}/${c.key}`));
    const stale = Object.keys(manifest.clips).filter(
      (k) => k.startsWith(`${LOCALE}/`) && !wanted.has(k)
    );
    if (stale.length) {
      console.log(`Pruning ${stale.length} stale clips…`);
      const { error } = await supabase.storage
        .from(BUCKET)
        .remove(stale.map((k) => `${k}.mp3`));
      if (error) console.error(`  prune failed: ${error.message}`);
      else {
        stale.forEach((k) => delete manifest.clips[k]);
        await saveManifest();
      }
    }
  }

  await saveQueue;
  console.log(`\nDone: ${done} generated, ${failed} failed, ${work.length - done - failed} skipped.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
