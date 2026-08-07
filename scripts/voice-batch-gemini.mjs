#!/usr/bin/env node
/**
 * Batch-mode companion to generate-voice-clips-gemini.mjs: same catalog,
 * same manifest bookkeeping, but through the Gemini Batch API — separate
 * quota pool from the interactive 100-requests/day-per-model cap, and half
 * the price. One job carries every pending clip; results land within 24 h
 * (usually much sooner).
 *
 *   node --import ./scripts/register-jsx.mjs scripts/voice-batch-gemini.mjs <cmd> --locale es
 *
 *   submit   Build JSONL of pending clips (text-hash filter, same as the
 *            interactive script), upload via the Files API, create the
 *            batch job. Job name + per-key hashes go to .voice-batch-<loc>.json.
 *   status   Print the job's current state.
 *   collect  When SUCCEEDED: download results, PCM→ffmpeg→mp3, upload to
 *            the voice bucket, update src/data/voiceManifest.json. Prints
 *            per-key failures (rerun `submit` afterwards to re-batch them).
 *            Do NOT run while an interactive generation is writing the
 *            manifest — both hold in-memory copies and would clobber.
 *
 * Options: --locale <loc> (required), --model, --voice, --limit <n>,
 *          --force (submit ALL catalog keys, not just hash-stale ones — use
 *          when switching models so every clip comes from one voice/model),
 *          --match <regex> (restrict to matching keys),
 *          --before <epoch> (with --force: only clips whose manifest stamp
 *          predates <epoch> — resume a style/voice change without redoing
 *          clips already regenerated)
 * Env: GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (.env
 * overrides inherited env, same as the sibling scripts).
 *
 * NB: gemini-2.5-flash-preview-tts does NOT support batchGenerateContent;
 * gemini-3.1-flash-tts-preview and gemini-2.5-pro-preview-tts do.
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
const API = 'https://generativelanguage.googleapis.com';
const DEFAULT_VOICE = 'Autonoe';
const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts';

const STYLE_PROMPT = {
  es: 'Di esto como una madre dulce y cariñosa hablándole a su hijo de dos años, en español latinoamericano neutro — suave, cálida, pausada y tranquilizadora:',
  zh: 'Say this as a gentle, loving mother speaking to her two-year-old, in standard Mandarin Chinese — soft, warm, unhurried, and reassuring:',
  or: 'Say this as a gentle, loving mother speaking to her two-year-old, in standard Odia — soft, warm, unhurried, and reassuring:',
};

// Bare word clips (items/*) need precise pronunciation, not warmth — the
// soft mother tone blurs single words (user call 2026-08-07, or first).
// Sentences, intros and praise keep STYLE_PROMPT. Keep in sync with
// generate-voice-clips-gemini.mjs.
const WORD_STYLE_PROMPT = {
  es: 'Di esto en español latinoamericano neutro como una demostración de pronunciación clara y precisa — neutra y articulada, cada sílaba nítida y completamente enunciada, a un ritmo constante y uniforme, sin carga emocional:',
  zh: 'Say this in standard Mandarin Chinese as a clear, precise pronunciation demonstration — neutral and articulate, every syllable crisp and fully enunciated, at a steady, even pace, without emotional coloring:',
  or: 'Say this in standard Odia as a clear, precise pronunciation demonstration — neutral and articulate, every syllable crisp and fully enunciated, at a steady, even pace, without emotional coloring:',
};

const styleFor = (locale, key) =>
  (key?.startsWith('items/') && WORD_STYLE_PROMPT[locale]) ||
  STYLE_PROMPT[locale] ||
  STYLE_PROMPT.es;

// User-auditioned voice per locale (bake-off winners); --voice overrides.
// NB: or MUST run on gemini-3.1-flash-tts-preview — no other Gemini TTS
// renders Odia (2.5-pro returns empty audio, 2.5-flash can't batch).
const VOICE_BY_LOCALE = { es: 'Autonoe', zh: 'Kore', or: 'Autonoe' };

async function loadEnv() {
  try {
    const raw = await readFile(path.join(ROOT, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=("?)(.*)\2\s*$/);
      if (m) process.env[m[1]] = m[3];
    }
  } catch {
    /* no .env — rely on the environment */
  }
}

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : fallback;
}

const hashText = (text) => createHash('sha1').update(text).digest('hex').slice(0, 10);

const stateFile = (locale) => path.join(ROOT, `.voice-batch-${locale}.json`);

const apiFetch = async (apiKey, url, init = {}) => {
  const res = await fetch(url, {
    ...init,
    headers: { 'x-goog-api-key': apiKey, ...(init.headers || {}) },
  });
  if (!res.ok) {
    throw new Error(`${init.method || 'GET'} ${url} → ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  return res;
};

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

async function submit({ apiKey, locale, model, voice, limit, force, match, before }) {
  const matchRe = match ? new RegExp(match) : null;
  const catalog = buildCatalog(locale);
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  manifest.clips = manifest.clips || {};
  const pending = catalog
    .filter((c) => !matchRe || matchRe.test(c.key))
    .filter((c) => {
      const entry = manifest.clips[`${locale}/${c.key}`];
      if (!entry || entry.h !== hashText(c.text)) return true;
      if (force) return before ? entry.v < before : true;
      return false;
    })
    .slice(0, limit);
  if (!pending.length) {
    console.log(`[${locale}] Nothing pending — manifest is complete.`);
    return;
  }
  console.log(`[${locale}] Submitting ${pending.length} clips as one batch job (${model})…`);

  const lines = pending.map((c) =>
    JSON.stringify({
      key: c.key,
      request: {
        contents: [{ parts: [{ text: `${styleFor(locale, c.key)}\n\n${c.text}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
        },
      },
    })
  );
  const jsonl = Buffer.from(lines.join('\n') + '\n');

  // Files API resumable upload (start → upload+finalize)
  const start = await apiFetch(apiKey, `${API}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(jsonl.length),
      'X-Goog-Upload-Header-Content-Type': 'application/jsonl',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: `voice-batch-${locale}` } }),
  });
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Files API gave no upload URL');
  const uploaded = await (
    await apiFetch(apiKey, uploadUrl, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Command': 'upload, finalize',
        'X-Goog-Upload-Offset': '0',
      },
      body: jsonl,
    })
  ).json();
  const fileName = uploaded.file?.name;
  if (!fileName) throw new Error(`No file name in upload response: ${JSON.stringify(uploaded).slice(0, 200)}`);

  const job = await (
    await apiFetch(apiKey, `${API}/v1beta/models/${model}:batchGenerateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch: {
          display_name: `voice-${locale}-${pending.length}`,
          input_config: { file_name: fileName },
        },
      }),
    })
  ).json();
  if (!job.name) throw new Error(`No job name: ${JSON.stringify(job).slice(0, 300)}`);

  await writeFile(
    stateFile(locale),
    JSON.stringify(
      {
        jobName: job.name,
        model,
        locale,
        submitted: pending.length,
        // text hash per key — collect stamps these into the manifest
        hashes: Object.fromEntries(pending.map((c) => [c.key, hashText(c.text)])),
      },
      null,
      2
    ) + '\n'
  );
  console.log(`Job created: ${job.name} (${pending.length} clips). State saved to ${stateFile(locale)}`);
}

const jobState = (job) => job.metadata?.state || job.state || 'UNKNOWN';

async function status({ apiKey, locale }) {
  const st = JSON.parse(await readFile(stateFile(locale), 'utf8'));
  const job = await (await apiFetch(apiKey, `${API}/v1beta/${st.jobName}`)).json();
  console.log(`${st.jobName}: ${jobState(job)} (${st.submitted} clips submitted)`);
  if (job.error) console.log('error:', JSON.stringify(job.error).slice(0, 400));
  return jobState(job);
}

async function collect({ apiKey, locale }) {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  const st = JSON.parse(await readFile(stateFile(locale), 'utf8'));
  const job = await (await apiFetch(apiKey, `${API}/v1beta/${st.jobName}`)).json();
  const state = jobState(job);
  if (state !== 'JOB_STATE_SUCCEEDED' && state !== 'BATCH_STATE_SUCCEEDED') {
    console.log(`Job not finished: ${state}`);
    if (job.error) console.log('error:', JSON.stringify(job.error).slice(0, 400));
    process.exit(2);
  }

  const responsesFile =
    job.response?.responsesFile || job.metadata?.output?.responsesFile;
  let linesText;
  if (responsesFile) {
    linesText = await (
      await apiFetch(apiKey, `${API}/download/v1beta/${responsesFile}:download?alt=media`)
    ).text();
  } else if (job.response?.inlinedResponses) {
    linesText = job.response.inlinedResponses.inlinedResponses
      .map((r) => JSON.stringify({ key: r.metadata?.key, response: r.response, error: r.error }))
      .join('\n');
  } else {
    throw new Error(`No responses in job: ${JSON.stringify(job).slice(0, 400)}`);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
  manifest.clips = manifest.clips || {};

  let done = 0;
  let failed = 0;
  const failures = [];
  const rows = linesText.split('\n').filter(Boolean);
  console.log(`Collecting ${rows.length} responses…`);

  // Bounded concurrency for ffmpeg+upload
  const queue = [...rows];
  const worker = async () => {
    while (queue.length) {
      const row = queue.shift();
      let key = null;
      try {
        const parsed = JSON.parse(row);
        key = parsed.key ?? parsed.metadata?.key;
        const response = parsed.response;
        const part = response?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
        if (!part) {
          throw new Error(
            JSON.stringify(parsed.error || parsed.status || response?.promptFeedback || 'no audio').slice(0, 160)
          );
        }
        const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1] || 24000);
        const mp3 = await pcmToMp3(Buffer.from(part.inlineData.data, 'base64'), rate);
        const fullKey = `${locale}/${key}`;
        const { error } = await supabase.storage.from(BUCKET).upload(`${fullKey}.mp3`, mp3, {
          upsert: true,
          contentType: 'audio/mpeg',
          cacheControl: '31536000',
        });
        if (error) throw new Error(`upload: ${error.message}`);
        const h = st.hashes[key];
        if (!h) throw new Error('key not in submitted state file');
        manifest.clips[fullKey] = { v: Math.floor(Date.now() / 1000), h };
        done++;
        if (done % 100 === 0) console.log(`  …${done} collected`);
      } catch (err) {
        failed++;
        failures.push(`${key}: ${err.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));

  manifest.version = new Date().toISOString();
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nCollected: ${done} ok, ${failed} failed of ${rows.length}.`);
  if (failures.length) {
    console.log('Failures (re-run `submit` to batch them again):');
    failures.slice(0, 30).forEach((f) => console.log(`  ✗ ${f}`));
  }
}

async function main() {
  await loadEnv();
  const cmd = process.argv[2];
  const locale = getArg('locale', null);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY missing');
  if (!locale || locale === 'en') throw new Error('pass --locale <loc> (non-en)');
  const opts = {
    apiKey,
    locale,
    model: getArg('model', DEFAULT_MODEL),
    voice: getArg('voice', VOICE_BY_LOCALE[locale] || DEFAULT_VOICE),
    limit: Number(getArg('limit', Infinity)),
    force: process.argv.includes('--force'),
    match: getArg('match', null),
    before: Number(getArg('before', 0)),
  };
  if (cmd === 'submit') return submit(opts);
  if (cmd === 'status') return status(opts);
  if (cmd === 'collect') return collect(opts);
  throw new Error('usage: voice-batch-gemini.mjs submit|status|collect --locale <loc>');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
