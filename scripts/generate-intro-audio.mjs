#!/usr/bin/env node
/**
 * Generates the category intro clips ("Let's learn about animals!") spoken
 * over the intro collage page. Same voice/model as the praise clips so the
 * whole app is one voice. Output: public/audio/intros/<categoryKey>/<i>.mp3
 * — the index matches the line's position in src/data/intros.js, which is
 * how CategoryIntro finds the right file. Regenerate after editing copy.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=sk_... node scripts/generate-intro-audio.mjs
 *
 * Options:
 *   --voice <id>   Voice ID (default: Laura — FGY2WhTYpPnrIDTdsKH5)
 *   --model <id>   Model ID (default: eleven_v3)
 *   --only <key>   Only one category (e.g. concepts-animals)
 */

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { intros } from '../src/data/intros.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'audio', 'intros');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io/v1';

const DEFAULT_VOICE_ID = 'FGY2WhTYpPnrIDTdsKH5'; // Laura
const DEFAULT_MODEL = 'eleven_v3';

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : fallback;
}

async function generateClip(text, voiceId, model, settings, outputPath) {
  const res = await fetch(
    `${BASE_URL}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: model, voice_settings: settings }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs API error ${res.status}: ${err}`);
  }

  await writeFile(outputPath, Buffer.from(await res.arrayBuffer()));
  console.log(`  ✓ ${path.relative(OUT_DIR, outputPath)}  "${text}"`);
}

async function main() {
  if (!API_KEY) {
    console.error('Error: Set ELEVENLABS_API_KEY environment variable.');
    process.exit(1);
  }

  const voiceId = getArg('voice', DEFAULT_VOICE_ID);
  const model = getArg('model', DEFAULT_MODEL);
  const only = getArg('only', null);

  // v3 uses discrete stability: 0.0 = Creative — matches the praise clips,
  // and the intros carry the same excited energy
  const isV3 = model.includes('v3');
  const settings = {
    stability: isV3 ? 0.0 : 0.15,
    similarity_boost: 0.8,
    style: 1.0,
    speed: 1.05,
    use_speaker_boost: true,
  };

  console.log(`\nVoice: ${voiceId} | Model: ${model}\n`);

  for (const [key, lines] of Object.entries(intros)) {
    if (only && key !== only) continue;
    const dir = path.join(OUT_DIR, key);
    await mkdir(dir, { recursive: true });
    console.log(`${key}:`);
    // Free tier allows 2 concurrent requests; sequential keeps us well under
    for (let i = 0; i < lines.length; i++) {
      await generateClip(lines[i], voiceId, model, settings, path.join(dir, `${i}.mp3`));
    }
    console.log('');
  }

  console.log('Done! Clips saved to public/audio/intros/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
