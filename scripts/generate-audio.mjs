#!/usr/bin/env node
/**
 * Generates tiered audio clips for test feedback using ElevenLabs TTS API.
 *
 * Usage:
 *   ELEVENLABS_API_KEY=sk_... node scripts/generate-audio.mjs
 *
 * Options:
 *   --voice <id>   Voice ID (default: Laura — FGY2WhTYpPnrIDTdsKH5)
 *   --model <id>   Model ID (default: eleven_v3)
 */

import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public', 'audio');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io/v1';

const DEFAULT_VOICE_ID = 'FGY2WhTYpPnrIDTdsKH5'; // Laura
const DEFAULT_MODEL = 'eleven_v3';

// Tiered positive feedback with v3 audio tags for expressiveness.
// Tier 0 is calm, tier 3 is peak excitement.
const positiveTiers = [
  // Tier 0 — warm, gentle (no audio tags)
  [
    { text: 'Good job!', speed: 1.0 },
    { text: 'Very good!', speed: 1.0 },
    { text: "That's right!", speed: 1.0 },
    { text: 'Well done!', speed: 1.0 },
    { text: 'Nice!', speed: 1.0 },
  ],
  // Tier 1 — upbeat (light tags)
  [
    { text: 'Ooh, great work!', speed: 1.05 },
    { text: '[laughs] Fantastic!', speed: 1.05 },
    { text: 'Brilliant!', speed: 1.05 },
    { text: 'Awesome, way to go!', speed: 1.05 },
    { text: 'Wonderful, keep it up!', speed: 1.05 },
  ],
  // Tier 2 — excited (gasps, laughs)
  [
    { text: '[laughs] Wow, amazing!', speed: 1.1 },
    { text: "You're doing so well! [laughs]", speed: 1.1 },
    { text: '[gasps] Look at you go!', speed: 1.1 },
    { text: 'So impressive! [laughs]', speed: 1.1 },
    { text: "Woohoo! You really know your stuff!", speed: 1.1 },
  ],
  // Tier 3 — over the moon (full expression)
  [
    { text: "[gasps] Oh my god, you're a genius!", speed: 1.1 },
    { text: '[laughs] Absolutely incredible!', speed: 1.15 },
    { text: 'You are a superstar! [laughs]', speed: 1.15 },
    { text: "[gasps] There's no stopping you!", speed: 1.1 },
    { text: "I can't believe how amazing you are! [laughs]", speed: 1.1 },
  ],
];

const encouragement = [
  { text: 'Uh oh! Not quite.', speed: 0.9 },
  { text: "Oopsie! Let's try again!", speed: 0.95 },
  { text: 'Hmm, not that one.', speed: 0.85 },
  { text: 'Oh no! Give it another shot!', speed: 0.95 },
  { text: 'Whoops! Try again!', speed: 0.95 },
  { text: 'Nope! Almost though!', speed: 0.95 },
];

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
  console.log(`  ✓ ${path.relative(PUBLIC_DIR, outputPath)}  "${text}"`);
}

async function main() {
  if (!API_KEY) {
    console.error('Error: Set ELEVENLABS_API_KEY environment variable.');
    process.exit(1);
  }

  const voiceId = getArg('voice', DEFAULT_VOICE_ID);
  const model = getArg('model', DEFAULT_MODEL);

  // v3 uses discrete stability: 0.0 = Creative, 0.5 = Natural, 1.0 = Robust
  const isV3 = model.includes('v3');
  const baseStability = isV3 ? 0.0 : 0.15;

  console.log(`\nVoice: ${voiceId} | Model: ${model} | Stability: ${baseStability}\n`);

  // Generate tiered positive clips
  for (let tier = 0; tier < positiveTiers.length; tier++) {
    const tierDir = path.join(PUBLIC_DIR, 'positive', `tier${tier}`);
    await mkdir(tierDir, { recursive: true });
    console.log(`Tier ${tier} positive clips:`);

    for (let i = 0; i < positiveTiers[tier].length; i++) {
      const { text, speed } = positiveTiers[tier][i];
      const settings = {
        stability: baseStability,
        similarity_boost: 0.8,
        style: 1.0,
        speed,
        use_speaker_boost: true,
      };
      await generateClip(text, voiceId, model, settings, path.join(tierDir, `${i}.mp3`));
    }
    console.log('');
  }

  // Generate encouragement clips
  const encDir = path.join(PUBLIC_DIR, 'encouragement');
  await mkdir(encDir, { recursive: true });
  console.log('Encouragement clips:');

  for (let i = 0; i < encouragement.length; i++) {
    const { text, speed } = encouragement[i];
    const settings = {
      stability: baseStability,
      similarity_boost: 0.8,
      style: 1.0,
      speed,
      use_speaker_boost: true,
    };
    await generateClip(text, voiceId, model, settings, path.join(encDir, `${i}.mp3`));
  }

  console.log('\nDone! Audio files saved to public/audio/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
