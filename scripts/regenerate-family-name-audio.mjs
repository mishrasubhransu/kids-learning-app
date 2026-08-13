#!/usr/bin/env node
/**
 * Repairs family-member name clips that /api/generate-name-audio failed to
 * (re)generate — e.g. a Gemini quota outage killing the wave after a
 * name_lang change. A member needs repair when name_audio_path is missing
 * or its extension contradicts name_lang (en speaks mp3 via ElevenLabs,
 * every other locale wav via Gemini), which is exactly what a stale
 * wrong-voice clip looks like.
 *
 * Mirrors the member branch of api/generate-name-audio.js: same voices,
 * same warm style, same <uid>/family/<mid>/<ts>/name.<ext> layout in the
 * name-audio bucket, same old-version cleanup.
 *
 * Reads GEMINI_API_KEY, ELEVENLABS_API_KEY, SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY. NB the login shell exports a STALE
 * service-role key, so run it as:
 *
 *   env -u SUPABASE_SERVICE_ROLE_KEY node --env-file=.env \
 *     scripts/regenerate-family-name-audio.mjs
 *
 * Options:
 *   --dry         List who would be repaired, no API calls
 *   --force       Regenerate even when not missing/stale
 *   --only <str>  Only members whose name contains <str> (case-insensitive);
 *                 combine with --force to redo one healthy member's clip
 *   --lang <loc>  Only members with that name_lang (e.g. or); with --force,
 *                 redoes a whole locale after a style change
 */

import { createClient } from '@supabase/supabase-js';

const BUCKET = 'name-audio';
const ELEVEN_VOICE_ID = 'FGY2WhTYpPnrIDTdsKH5'; // Laura — same as the API
const ELEVEN_MODEL_ID = 'eleven_v3';
const GEMINI_MODEL = 'gemini-2.5-flash-preview-tts';
// Odia only renders on the 3.1 generation (2.5-flash/pro return no audio)
const GEMINI_MODEL_BY_LOCALE = { or: 'gemini-3.1-flash-tts-preview' };
const GEMINI_VOICE = { es: 'Autonoe', zh: 'Kore', or: 'Autonoe' };
// Keep in sync with GEMINI_STYLE in api/generate-name-audio.js (names use
// the warm style — the crisp "demonstration" prompt sounded unnatural once
// name_phonetic pinned the pronunciations; user call 2026-08-10)
const GEMINI_STYLE = {
  es: 'Di esto como una madre dulce y cariñosa hablándole a su hijo de dos años, en español latinoamericano neutro — suave, cálida, pausada y tranquilizadora:',
  zh: 'Say this as a gentle, loving mother speaking to her two-year-old, in standard Mandarin Chinese — soft, warm, unhurried, and reassuring:',
  or: 'Say this as a gentle, loving mother speaking to her two-year-old, in standard Odia — soft, warm, unhurried, and reassuring:',
};

const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');
const onlyIdx = process.argv.indexOf('--only');
const ONLY = onlyIdx !== -1 ? process.argv[onlyIdx + 1]?.toLowerCase() : null;
const langIdx = process.argv.indexOf('--lang');
const LANG = langIdx !== -1 ? process.argv[langIdx + 1] : null;

const {
  GEMINI_API_KEY,
  ELEVENLABS_API_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Gemini TTS returns raw PCM; a 44-byte WAV header makes it browser-playable
const pcmToWav = (pcm, rate) => {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ttsGemini = async (locale, text) => {
  const body = {
    contents: [
      { parts: [{ text: `${GEMINI_STYLE[locale]}\n\n${text}` }] },
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: GEMINI_VOICE[locale] || 'Autonoe' },
        },
      },
    },
  };
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_BY_LOCALE[locale] || GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': GEMINI_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );
    } catch (err) {
      if (attempt >= 4) throw new Error(`Gemini network: ${err.message}`);
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (res.ok) {
      const data = await res.json();
      const part = data.candidates?.[0]?.content?.parts?.find(
        (p) => p.inlineData
      );
      if (part) {
        const rate = Number(
          /rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1] || 24000
        );
        return pcmToWav(Buffer.from(part.inlineData.data, 'base64'), rate);
      }
      if (attempt >= 4) throw new Error('Gemini: no audio in response');
    } else {
      const errText = await res.text();
      if (![429, 500, 503].includes(res.status) || attempt >= 4) {
        throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
      }
    }
    await sleep(2000 * (attempt + 1));
  }
};

const ttsEleven = async (text) => {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.3,
          speed: 1.0,
          use_speaker_boost: true,
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
};

const listFilesDeep = async (prefix) => {
  const { data, error } = await admin.storage
    .from(BUCKET)
    .list(prefix, { limit: 100 });
  if (error || !data) return [];
  const files = [];
  for (const entry of data) {
    if (entry.id) files.push(`${prefix}/${entry.name}`);
    else files.push(...(await listFilesDeep(`${prefix}/${entry.name}`)));
  }
  return files;
};

const cleanupOldVersions = async (prefix, keepTs) => {
  const { data } = await admin.storage.from(BUCKET).list(prefix, { limit: 100 });
  if (!data) return;
  const stale = [];
  for (const entry of data) {
    if (entry.id) stale.push(`${prefix}/${entry.name}`);
    else if (entry.name !== keepTs) {
      stale.push(...(await listFilesDeep(`${prefix}/${entry.name}`)));
    }
  }
  if (stale.length) await admin.storage.from(BUCKET).remove(stale);
};

const { data: members, error } = await admin
  .from('family_members')
  .select('id, user_id, name, name_lang, name_phonetic, name_audio_path')
  .order('created_at');
if (error) {
  console.error('family_members query failed:', error.message);
  process.exit(1);
}

const jobs = members.filter((m) => {
  if (ONLY && !m.name.toLowerCase().includes(ONLY)) return false;
  if (LANG && (m.name_lang || 'en') !== LANG) return false;
  const wantExt = (m.name_lang || 'en') === 'en' ? 'mp3' : 'wav';
  return (
    FORCE || !m.name_audio_path || !m.name_audio_path.endsWith(`.${wantExt}`)
  );
});
console.log(`${members.length} members, ${jobs.length} to repair`);

let failed = 0;
for (const m of jobs) {
  const locale = m.name_lang || 'en';
  // Same rule as the API: the phonetic spelling, when set, is what the
  // voice reads — display stays on `name`
  const name = (m.name_phonetic || m.name).trim().slice(0, 30);
  const ext = locale === 'en' ? 'mp3' : 'wav';
  console.log(
    `- ${m.name}${m.name_phonetic ? ` → read as ${m.name_phonetic}` : ''} ` +
      `(${locale} → .${ext})${DRY ? ' [dry]' : ''}`
  );
  if (DRY || !name) continue;
  try {
    if (locale !== 'en' && !GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
    if (locale === 'en' && !ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing');
    const audio =
      locale === 'en' ? await ttsEleven(name) : await ttsGemini(locale, name);
    const prefix = `${m.user_id}/family/${m.id}`;
    const ts = `${Date.now()}`;
    const path = `${prefix}/${ts}/name.${ext}`;
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, audio, {
        contentType: locale === 'en' ? 'audio/mpeg' : 'audio/wav',
        upsert: true,
      });
    if (upErr) throw new Error(`upload: ${upErr.message}`);
    const { error: rowErr } = await admin
      .from('family_members')
      .update({ name_audio_path: path, updated_at: new Date().toISOString() })
      .eq('id', m.id);
    if (rowErr) throw new Error(`row update: ${rowErr.message}`);
    await cleanupOldVersions(prefix, ts);
    console.log(`  ok: ${path}`);
  } catch (err) {
    failed++;
    console.error(`  FAILED: ${err.message}`);
  }
}
if (!DRY) console.log(`done — ${jobs.length - failed}/${jobs.length} repaired`);
process.exit(failed ? 1 : 0);
