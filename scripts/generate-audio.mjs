#!/usr/bin/env node
/**
 * Generates ElevenLabs TTS audio clips for the app:
 *   - Tiered positive/encouragement feedback
 *   - Individual word pronunciations for all learning items
 *
 * Usage:
 *   ELEVENLABS_API_KEY=sk_... node scripts/generate-audio.mjs
 *
 * Options:
 *   --voice <id>      Voice ID (default: Laura — FGY2WhTYpPnrIDTdsKH5)
 *   --model <id>      Model ID (default: eleven_v3)
 *   --words-only      Only generate learning-item word clips
 *   --feedback-only   Only generate positive/encouragement clips
 */

import { writeFile, mkdir, access } from 'fs/promises';
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

// Individual item names — used for pronunciation clips and to build questions.
const itemWords = [
  // Alphabets A-Z
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  // Numbers 1-10
  ...[...Array(10)].map((_, i) => String(i + 1)),
  // Colors
  'Red', 'Green', 'Blue', 'Yellow', 'Pink', 'Purple', 'Black', 'White',
  // Shapes
  'Circle', 'Triangle', 'Square', 'Star', 'Plus',
  // Animals
  'Lion', 'Tiger', 'Dog', 'Cat', 'Pig', 'Rhino', 'Hippo', 'Horse',
  'Donkey', 'Zebra', 'Sheep', 'Goat', 'Llama', 'Camel', 'Elephant',
  'Alligator', 'Gorilla', 'Chimpanzee', 'Orangutan', 'Monkey', 'Deer',
  // Birds
  'Peacock', 'Crow', 'Pigeon', 'Hen', 'Rooster', 'Turkey', 'Parrot',
  'Sparrow', 'Duck', 'Swan', 'Ostrich', 'Eagle', 'Vulture',
  // Food
  'Pizza', 'Burger', 'Dosa', 'Vada', 'Rice', 'Ice Cream', 'French Fries',
  'Fish', 'Pasta', 'Yogurt', 'Soup', 'Kebab',
  // Transportation
  'Bicycle', 'Electric Scooter', 'Moped', 'Motorcycle', 'Car', 'Truck',
  'Bus', 'Train', 'Aeroplane', 'Rocket',
  // Professions
  'Doctor', 'Surgeon', 'Software Engineer', 'Scientist', 'Mechanic',
  'Teacher', 'Pilot', 'Air Hostess', 'Athlete', 'Chauffeur',
];

const learningWords = [
  ...itemWords,
  // Phrase fragments for wrong-answer feedback sequences
  'That was', 'Try to find',
  // Full test-mode questions (natural question intonation)
  ...itemWords.map((w) => `Which one is ${w}?`),
];

function toAudioKey(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

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

async function generateFeedbackClips(voiceId, model, baseStability) {
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
}

async function generateWordClips(voiceId, model, baseStability) {
  const wordsDir = path.join(PUBLIC_DIR, 'words');
  await mkdir(wordsDir, { recursive: true });
  console.log('Learning-item word clips:');

  const manifest = [];

  let skipped = 0;
  for (const word of learningWords) {
    const key = toAudioKey(word);
    manifest.push(key);
    const outPath = path.join(wordsDir, `${key}.mp3`);

    try {
      await access(outPath);
      skipped++;
      continue;
    } catch {}

    const settings = {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.6,
      speed: 0.95,
      use_speaker_boost: true,
    };
    await generateClip(word, voiceId, model, settings, outPath);
  }
  if (skipped) console.log(`  ⏭ ${skipped} existing clips skipped`);

  await writeFile(
    path.join(wordsDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log(`  ✓ manifest.json  (${manifest.length} words)\n`);
}

async function main() {
  if (!API_KEY) {
    console.error('Error: Set ELEVENLABS_API_KEY environment variable.');
    process.exit(1);
  }

  const voiceId = getArg('voice', DEFAULT_VOICE_ID);
  const model = getArg('model', DEFAULT_MODEL);
  const wordsOnly = process.argv.includes('--words-only');
  const feedbackOnly = process.argv.includes('--feedback-only');

  const isV3 = model.includes('v3');
  const baseStability = isV3 ? 0.0 : 0.15;

  console.log(`\nVoice: ${voiceId} | Model: ${model} | Stability: ${baseStability}`);
  console.log(`Mode: ${wordsOnly ? 'words only' : feedbackOnly ? 'feedback only' : 'all'}\n`);

  if (!wordsOnly) {
    await generateFeedbackClips(voiceId, model, baseStability);
  }
  if (!feedbackOnly) {
    await generateWordClips(voiceId, model, baseStability);
  }

  console.log('\nDone! Audio files saved to public/audio/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
