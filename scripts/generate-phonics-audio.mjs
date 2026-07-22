#!/usr/bin/env node
/**
 * Generates "A is for Apple" letter-sound clips using ElevenLabs TTS API.
 * One clip per (letter, word) pair from src/data/letterSounds.js, saved to
 * public/audio/phonics/letters/<letter>-<slug>.mp3
 *
 * Usage:
 *   ELEVENLABS_API_KEY=sk_... node scripts/generate-phonics-audio.mjs
 *
 * Options:
 *   --voice <id>   Voice ID (default: Laura — FGY2WhTYpPnrIDTdsKH5)
 *   --model <id>   Model ID (default: eleven_v3)
 *   --force        Regenerate clips that already exist
 */

import { writeFile, mkdir, access } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { letterSounds, letterPhrase } from '../src/data/letterSounds.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'audio', 'phonics', 'letters');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io/v1';

const DEFAULT_VOICE_ID = 'FGY2WhTYpPnrIDTdsKH5'; // Laura
const DEFAULT_MODEL = 'eleven_v3';

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : fallback;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
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
  console.log(`  ✓ ${path.basename(outputPath)}  "${text}"`);
}

async function main() {
  if (!API_KEY) {
    console.error('Error: Set ELEVENLABS_API_KEY environment variable.');
    process.exit(1);
  }

  const voiceId = getArg('voice', DEFAULT_VOICE_ID);
  const model = getArg('model', DEFAULT_MODEL);
  const force = process.argv.includes('--force');

  // v3 uses discrete stability: 0.0 = Creative, 0.5 = Natural, 1.0 = Robust.
  // Natural keeps the teacher voice warm but consistent across 78 clips.
  const settings = {
    stability: model.includes('v3') ? 0.5 : 0.3,
    similarity_boost: 0.8,
    style: 0.6,
    speed: 0.95,
    use_speaker_boost: true,
  };

  await mkdir(OUT_DIR, { recursive: true });
  console.log(`\nVoice: ${voiceId} | Model: ${model}\n`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const { letter, words } of letterSounds) {
    for (const word of words) {
      const outputPath = path.join(OUT_DIR, `${letter}-${word.slug}.mp3`);
      if (!force && (await exists(outputPath))) {
        skipped++;
        continue;
      }
      try {
        await generateClip(letterPhrase(letter, word), voiceId, model, settings, outputPath);
        generated++;
      } catch (err) {
        failed++;
        console.error(`  ✗ ${letter}-${word.slug}: ${err.message}`);
      }
    }
  }

  console.log(`\nDone: ${generated} generated, ${skipped} skipped, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
