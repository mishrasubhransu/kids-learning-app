#!/usr/bin/env node
/**
 * Generates non-English voice clips with Gemini TTS (voice Autonoe) and
 * uploads them to the public Supabase "voice" bucket at <locale>/<key>.mp3.
 * The clip list comes from scripts/voice-catalog.mjs (which flips the locale
 * pack); bookkeeping lives in src/data/voiceManifest.json — same { v, h }
 * text-hash resume as the English/ElevenLabs script, so an interrupted run
 * just continues (preview models throw transient errors — expected).
 *
 * Output is raw 24 kHz PCM; ffmpeg (must be on PATH) turns it into mp3.
 * Reads GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY from .env.
 *
 *   node --import ./scripts/register-jsx.mjs scripts/generate-voice-clips-gemini.mjs --locale es
 *
 * Options:
 *   --locale <loc>     REQUIRED, e.g. es (en stays on the ElevenLabs script)
 *   --dry              List counts/chars only, no API calls
 *   --only <prefix>    Restrict to keys starting with prefix (e.g. intros/)
 *   --limit <n>        Stop after n generated clips
 *   --force            Regenerate even when the text hash matches
 *   --prune            Delete bucket+manifest clips no longer in the catalog
 *   --concurrency <n>  Parallel generations (default 2 — preview-model RPM
 *                      limits are tight)
 *   --voice / --model  Override voice or model id (fallback model:
 *                      gemini-3.1-flash-tts-preview)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { buildCatalog } from './voice-catalog.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, 'src', 'data', 'voiceManifest.json');

const BUCKET = 'voice';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_VOICE = 'Autonoe';
const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts';

// Style prompt channeling the app's English voice (ElevenLabs Laura): the
// same performer across languages. Inline [gasps]-style tags in the catalog
// text shape individual lines.
const STYLE_PROMPT = {
  es: 'Di esto como una madre dulce y cariñosa hablándole a su hijo de dos años, en español latinoamericano neutro — suave, cálida, pausada y tranquilizadora:',
  zh: 'Say this as a gentle, loving mother speaking to her two-year-old, in standard Mandarin Chinese — soft, warm, unhurried, and reassuring:',
};

// User-auditioned voice per locale (bake-off winners); --voice overrides.
const VOICE_BY_LOCALE = { es: 'Autonoe', zh: 'Kore' };

// .env loader — same as the ElevenLabs script: the project .env OVERRIDES
// inherited env (the shell profile exports SUPABASE keys for other projects).
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

// PCM (s16le mono 24 kHz unless the response says otherwise) → mp3 bytes
function pcmToMp3(pcm, sampleRate) {
  return new Promise((resolvePromise, reject) => {
    const ff = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error',
      '-f', 's16le', '-ar', String(sampleRate), '-ac', '1', '-i', 'pipe:0',
      '-codec:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3', 'pipe:1',
    ]);
    const out = [];
    const err = [];
    ff.stdout.on('data', (d) => out.push(d));
    ff.stderr.on('data', (d) => err.push(d));
    ff.on('error', reject);
    ff.on('close', (code) => {
      if (code === 0) resolvePromise(Buffer.concat(out));
      else reject(new Error(`ffmpeg exited ${code}: ${Buffer.concat(err)}`));
    });
    ff.stdin.write(pcm);
    ff.stdin.end();
  });
}

async function generateClip(text, { locale, voice, model, apiKey }) {
  const style = STYLE_PROMPT[locale] || STYLE_PROMPT.es;
  const body = {
    contents: [{ parts: [{ text: `${style}\n\n${text}` }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
      },
    },
  };

  // Preview models 429/500/503 routinely, and long runs hit plain network
  // hiccups ("fetch failed") — both back off and retry
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(`${BASE_URL}/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (attempt >= 5) throw new Error(`network: ${err.message}`);
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (res.ok) {
      const data = await res.json();
      const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (part) {
        const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1] || 24000);
        const pcm = Buffer.from(part.inlineData.data, 'base64');
        return pcmToMp3(pcm, rate);
      }
      // 200 with no audio (safety trip / empty candidate) — retry like a 500
      if (attempt >= 5) {
        throw new Error(`no audio in response: ${JSON.stringify(data).slice(0, 300)}`);
      }
    } else {
      const errText = await res.text();
      if (![429, 500, 503].includes(res.status) || attempt >= 5) {
        throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
      }
    }
    await sleep(3000 * (attempt + 1));
  }
}

async function main() {
  await loadEnv();
  const apiKey = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const locale = getArg('locale', null);
  const dry = process.argv.includes('--dry');
  const force = process.argv.includes('--force');
  const prune = process.argv.includes('--prune');
  const only = getArg('only', null);
  const limit = Number(getArg('limit', Infinity));
  const concurrency = Number(getArg('concurrency', 2));
  const voice = getArg('voice', VOICE_BY_LOCALE[locale] || DEFAULT_VOICE);
  const model = getArg('model', DEFAULT_MODEL);

  if (!locale || locale === 'en') {
    console.error('Error: pass --locale <loc> (en is generated by generate-voice-clips.mjs).');
    process.exit(1);
  }

  const catalog = buildCatalog(locale).filter((c) => !only || c.key.startsWith(only));
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  manifest.clips = manifest.clips || {};

  const pending = catalog.filter((c) => {
    const entry = manifest.clips[`${locale}/${c.key}`];
    return force || !entry || entry.h !== hashText(c.text);
  });
  const totalChars = pending.reduce((n, c) => n + c.text.length, 0);

  console.log(
    `[${locale}] Catalog: ${catalog.length} clips | up to date: ${catalog.length - pending.length} | to generate: ${pending.length} (${totalChars} chars)`
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
    console.error('Error: need GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.');
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
    const fullKey = `${locale}/${clip.key}`;
    try {
      const bytes = await generateClip(clip.text, { locale, voice, model, apiKey });
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
    const wanted = new Set(catalog.map((c) => `${locale}/${c.key}`));
    const stale = Object.keys(manifest.clips).filter(
      (k) => k.startsWith(`${locale}/`) && !wanted.has(k)
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
