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

import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
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

// --seed: try to force a new take. NB: eleven_v3 appears to IGNORE seed and
// serve its request-cache (items/salad came back byte-identical across
// --force and seeded runs, 2026-08-18) — for v3 the reliable re-roll is a
// GENERATION_TEXT_OVERRIDES tweak in voice-catalog.mjs, which changes the
// request text itself. Kept for v2-model runs where seed is honored.
let SEED = null;

async function generateClip(text, voiceId, model, settings, apiKey) {
  // 429s (concurrent-request limit) are routine on long runs — back off
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(
      `${BASE_URL}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: settings,
          ...(SEED != null ? { seed: SEED } : {}),
        }),
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

const run = promisify(execFile);

// Spelling letters (spell/<letter>) are played back to back in any order
// ("B. A. T."), so they have to sound like one speaker in one breath.
// Generated one request per letter they don't: each take picks its own
// pitch and energy (measured 2026-11-26 — median pitch spread ±39Hz, some
// letters clipped to 0.15s). So all 26 come from ONE take, in a scrambled
// order (alphabet order drifts into the ABC-song lilt), sliced apart on the
// silences between them — pitch spread ±21Hz. Needs ffmpeg on PATH.
const SPELL_ORDER = 'mbkatdswcgrjelxpfhvnqiyuzo';
const SPELL_SR = 16000;
// The clips play end to end, so their length IS the spelling pace. The
// take comes out ~0.67s a letter whatever `speed` is sent (eleven_v3 seems
// to ignore it); a pitch-preserving nudge brings that to ~0.5s.
const SPELL_TEMPO = 1.25;

async function generateSpellTake(voiceId, model, settings, apiKey) {
  const text = SPELL_ORDER.split('').map((c) => `${c.toUpperCase()}.`).join('\n\n');
  const res = await fetch(
    `${BASE_URL}/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: model, voice_settings: settings }),
    }
  );
  if (!res.ok) throw new Error(`ElevenLabs API error ${res.status}: ${await res.text()}`);
  const { audio_base64: audio, alignment } = await res.json();
  // When the model says each letter began — the slicer's cross-check
  const starts = [];
  alignment.characters.forEach((ch, i) => {
    if (/[A-Z]/.test(ch)) starts.push(alignment.character_start_times_seconds[i]);
  });
  return { bytes: Buffer.from(audio, 'base64'), starts };
}

// Returns { letter: mp3 bytes } — or throws when the take doesn't split
// into exactly one sound per letter, each where the model's own timestamps
// put it (a stray breath or a swallowed letter would shift every clip onto
// the wrong letter). Nothing is uploaded from a take that fails.
async function sliceSpellTake({ bytes: takeBytes, starts }) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'spell-'));
  try {
    const take = path.join(dir, 'take.mp3');
    await writeFile(take, takeBytes);
    const { stdout } = await run(
      'ffmpeg',
      ['-v', 'error', '-i', take, '-ac', '1', '-ar', String(SPELL_SR), '-f', 's16le', '-'],
      { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }
    );
    const pcm = new Int16Array(stdout.buffer, stdout.byteOffset, stdout.length >> 1);
    // 10ms loudness frames; a letter is a run above -40dB, and gaps under
    // 250ms inside it (the stop in "X", "H") belong to the same letter
    const hop = SPELL_SR / 100;
    const threshold = 10 ** (-40 / 20);
    const loud = [];
    for (let i = 0; i + hop <= pcm.length; i += hop) {
      let sum = 0;
      for (let k = i; k < i + hop; k++) sum += (pcm[k] / 32768) ** 2;
      loud.push(Math.sqrt(sum / hop) > threshold);
    }
    const segs = [];
    for (let i = 0; i < loud.length; ) {
      if (!loud[i]) { i++; continue; }
      let j = i;
      while (j < loud.length && loud[j]) j++;
      const last = segs[segs.length - 1];
      if (last && i - last[1] < 25) last[1] = j;
      else segs.push([i, j]);
      i = j;
    }
    const sounds = segs.filter(([a, b]) => b - a >= 5);
    if (sounds.length !== SPELL_ORDER.length) {
      throw new Error(`spelling take split into ${sounds.length} sounds, expected ${SPELL_ORDER.length}`);
    }
    if (starts.length !== sounds.length) {
      throw new Error(`spelling take has timestamps for ${starts.length} letters`);
    }
    sounds.forEach(([a, b], n) => {
      const long = (b - a) / 100;
      if (starts[n] < a / 100 - 0.4 || starts[n] > b / 100 || long < 0.2 || long > 1.2) {
        throw new Error(
          `spelling take: "${SPELL_ORDER[n]}" sound at ${(a / 100).toFixed(2)}–${(b / 100).toFixed(2)}s doesn't match its timestamp ${starts[n].toFixed(2)}s`
        );
      }
    });
    const clips = {};
    for (let n = 0; n < sounds.length; n++) {
      // a little air either side keeps soft edges ("S", "F") whole
      const start = Math.max(0, sounds[n][0] / 100 - 0.02);
      const end = sounds[n][1] / 100 + 0.05;
      const dur = (end - start) / SPELL_TEMPO;
      const out = path.join(dir, `${n}.mp3`);
      await run('ffmpeg', [
        // seek on the INPUT so the fades' clock starts at the cut, not the take
        '-v', 'error', '-y', '-ss', start.toFixed(3), '-t', (end - start).toFixed(3), '-i', take,
        '-af', `atempo=${SPELL_TEMPO},afade=t=in:d=0.01,afade=t=out:st=${(dur - 0.03).toFixed(3)}:d=0.03`,
        '-ar', '44100', '-b:a', '128k', out,
      ]);
      clips[SPELL_ORDER[n]] = await readFile(out);
      if (clips[SPELL_ORDER[n]].length < 3000) {
        throw new Error(`spelling take: "${SPELL_ORDER[n]}" cut came out empty`);
      }
    }
    return clips;
  } finally {
    await rm(dir, { recursive: true, force: true });
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
  const seedArg = getArg('seed', null);
  if (seedArg != null) SEED = Number(seedArg);

  // Same profile as the letter-sound clips — one voice across the app
  const settings = {
    stability: model.includes('v3') ? 0.5 : 0.3,
    similarity_boost: 0.8,
    style: 0.6,
    speed: 0.95,
    use_speaker_boost: true,
  };

  // Spelling letters: flat and repeatable rather than expressive (one
  // shared take — see generateSpellTake)
  const spellSettings = { ...settings, stability: 1, style: 0, speed: 1 };
  const isSpell = (key) => key.startsWith('spell/');
  // Whole spelled words (spelled/<word>): plain delivery, no added style
  const isSpelled = (key) => key.startsWith('spelled/');
  const spelledSettings = { ...settings, style: 0, speed: 1 };

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

  // Any stale spelling letter regenerates the whole set from a fresh take —
  // a lone re-cut letter wouldn't match the other 25
  let work = pending.filter((c) => !isSpell(c.key)).slice(0, limit);
  if (pending.some((c) => isSpell(c.key))) {
    try {
      // Takes vary; one that doesn't slice cleanly is simply retaken
      let slices;
      for (let attempt = 1; !slices; attempt++) {
        try {
          slices = await sliceSpellTake(
            await generateSpellTake(voiceId, model, spellSettings, apiKey)
          );
        } catch (err) {
          if (attempt >= 3) throw err;
          console.warn(`  … ${err.message} — retaking`);
        }
      }
      const letters = catalog
        .filter((c) => isSpell(c.key))
        .map((c) => ({ ...c, bytes: slices[c.key.slice('spell/'.length)] }));
      if (letters.some((c) => !c.bytes)) throw new Error('take is missing a catalog letter');
      work = [...letters, ...work];
    } catch (err) {
      console.error(`  ✗ spell/*: ${err.message}`);
    }
  }
  let done = 0;
  let failed = 0;

  const runOne = async (clip) => {
    const fullKey = `${LOCALE}/${clip.key}`;
    try {
      const bytes =
        clip.bytes ||
        (await generateClip(
          clip.text,
          voiceId,
          model,
          isSpelled(clip.key) ? spelledSettings : settings,
          apiKey
        ));
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
