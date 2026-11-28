#!/usr/bin/env node
// Narrated explainer videos for the Human Body lesson: a hand-directed shot
// list (one start frame + one motion prompt + one narration line per shot),
// rendered shot by shot and cut together here — not one long model take.
//
//   node scripts/generate_body_explainer.mjs <system> frames   [shot…]  # start (+end) frames (≈$0.15 each)
//   node scripts/generate_body_explainer.mjs <system> ends     [shot…]  # redo end frames only
//   node scripts/generate_body_explainer.mjs <system> tts      [shot…]  # narration (ElevenLabs Laura)
//   node scripts/generate_body_explainer.mjs <system> videos   [shot…]  # Kling 4 clips ($0.157/s at 720p)
//   node scripts/generate_body_explainer.mjs <system> cost               # what `videos` would cost
//   node scripts/generate_body_explainer.mjs <system> assemble           # cut → out/…/<system>-explainer-vN.mp4
//   node scripts/generate_body_explainer.mjs <system> publish            # newest cut → public/films/body (picture + narration)
//
// The films' tests (src/data/filmQuizzes.js) are made here too. `quiz` is a
// shot list of its own (the few test pictures no film still covers):
//   node scripts/generate_body_explainer.mjs quiz frames                 # draw those pictures
//   node scripts/generate_body_explainer.mjs quiz pictures  [id…]        # cut every test picture → public/science/body/quiz
//   node scripts/generate_body_explainer.mjs quiz questions [--redo]     # record the question clips → public/films/body/quiz
//
// <system> is digestive | circulatory | nervous | skeletal | respiratory (digestive when left out); each has its
// shot list in scripts/body-explainers/<system>.mjs. A shot is named by its
// id, or by its 1-based position in that list.
//
// `assemble` uses a shot's still frame when its clip doesn't exist yet, so
// running it before `videos` gives a narrated animatic (storyboard cut) for
// review at zero video cost. Shot numbers are 1-based. Frames, takes and
// cuts are versioned in fal-creations/out/toddlearn-body/<explainer> and
// never overwritten: a shot uses its newest frame and newest take unless
// PICKS below pins one.
//
// The app never ships a cut as one file. `publish` splits the newest cut
// into public/films/body/<slug>.mp4 (the picture, no sound) and
// <slug>.en.m4a (the narration); the lesson plays the two in sync, so
// another language is one more small audio file over the SAME picture.
// `assemble` writes <cut>.timeline.json — each shot's start, length and
// narration window — which is what a translated line has to fit into.
// The poster is by hand: a 1024² webp of a representative frame in
// public/science/body/<slug>.webp, listed on the item in src/data/science.js.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { STYLE, MOTION_BASE } from './body-explainers/shared.mjs';
import * as digestive from './body-explainers/digestive.mjs';
import * as circulatory from './body-explainers/circulatory.mjs';
import * as nervous from './body-explainers/nervous.mjs';
import * as skeletal from './body-explainers/skeletal.mjs';
import * as respiratory from './body-explainers/respiratory.mjs';
import * as quiz from './body-explainers/quiz.mjs';
import { filmQuizzes, quizPictureFile, quizClipFile } from '../src/data/filmQuizzes.js';

const SYSTEMS = { digestive, circulatory, nervous, skeletal, respiratory, quiz };
const argv = process.argv.slice(2);
const SYSTEM = SYSTEMS[argv[0]] ? argv.shift() : 'digestive';
const { name: NAME, shots: SHOTS, slug: SLUG } = SYSTEMS[SYSTEM];

const FAL_DIR = '/home/autel/projects/libraries/fal-creations';
const BODY_OUT = path.join(FAL_DIR, 'out/toddlearn-body');
const OUT = path.join(BODY_OUT, NAME);
const isFile = (r) => r.includes('/');
const env = (file, key) =>
  fs.existsSync(file) ? fs.readFileSync(file, 'utf8').match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.trim() : null;
const FAL_KEY = process.env.FAL_KEY || env(path.join(FAL_DIR, '.env'), 'FAL_KEY');
const EL_KEY = process.env.ELEVENLABS_API_KEY || env(path.resolve('.env'), 'ELEVENLABS_API_KEY');

const VIDEO_MODEL = 'kling/v4/image-to-video';
const VOICE_ID = 'FGY2WhTYpPnrIDTdsKH5'; // Laura — the app's voice
const SIZE = 720;

// Pin a frame version or take per shot id, e.g. { stomach: { frame: 2, take: 1 } }
const PICKS = {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
const probe = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim());

// fetch with retries: a network blip must not lose a paid, queued render
async function fetchJson(url, opts, tries = 6) {
  for (let n = 1; ; n++) {
    try {
      return await fetch(url, opts).then((r) => r.json());
    } catch (err) {
      if (n >= tries) throw err;
      await sleep(3000 * n);
    }
  }
}

// `resumeFile` remembers a submitted request, so a crashed run picks the
// same request up again instead of paying for a second one.
async function falRun(model, input, resumeFile) {
  const headers = { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' };
  let sub = resumeFile && fs.existsSync(resumeFile) ? JSON.parse(fs.readFileSync(resumeFile, 'utf8')) : null;
  if (!sub) {
    sub = await fetchJson(`https://queue.fal.run/${model}`, { method: 'POST', headers, body: JSON.stringify(input) }, 1);
    if (!sub.request_id) throw new Error(`${model} submit failed: ${JSON.stringify(sub)}`);
    if (resumeFile) fs.writeFileSync(resumeFile, JSON.stringify(sub));
  }
  const started = Date.now();
  for (;;) {
    await sleep(5000);
    const st = await fetchJson(sub.status_url, { headers });
    if (st.status === 'COMPLETED') break;
    if (st.status !== 'IN_QUEUE' && st.status !== 'IN_PROGRESS') {
      if (resumeFile) fs.rmSync(resumeFile, { force: true });
      throw new Error(`${model} failed: ${JSON.stringify(st)}`);
    }
    if (Date.now() - started > 30 * 60_000) throw new Error(`${model} timed out`);
  }
  const res = await fetchJson(sub.response_url, { headers });
  return { requestId: sub.request_id, res, done: () => resumeFile && fs.rmSync(resumeFile, { force: true }) };
}
const download = async (url, file) => {
  for (let n = 1; ; n++) {
    try {
      return fs.writeFileSync(file, Buffer.from(await (await fetch(url)).arrayBuffer()));
    } catch (err) {
      if (n >= 6) throw err;
      await sleep(3000 * n);
    }
  }
};

// File prefix. Fixed per shot (not its position), so a shot added in the
// middle of the film doesn't renumber the files of the others.
const tag = (i) => SHOTS[i].tag;
const versions = (prefix, ext) =>
  fs.readdirSync(OUT)
    .map((f) => f.match(new RegExp(`^${prefix}(\\d+)\\${ext}$`))?.[1])
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => a - b);
const latest = (prefix, ext, pinned) => pinned ?? versions(prefix, ext).at(-1) ?? null;
const framePath = (i) => {
  const v = latest(`${tag(i)}-frame-v`, '.png', PICKS[SHOTS[i].id]?.frame);
  return v ? path.join(OUT, `${tag(i)}-frame-v${v}.png`) : null;
};
// A shot's `clip: { of, from, to }` shows part of a take instead of a whole
// one: `of` borrows another shot's take (one long clip can carry two
// lines), `from`/`to` are seconds into it.
const takePath = (i) => {
  const of = SHOTS[i].clip?.of;
  const k = of ? SHOTS.findIndex((x) => x.id === of) : i;
  if (k < 0) throw new Error(`${SHOTS[i].id}: clip.of "${of}" is not a shot`);
  const t = latest(`${tag(k)}-take-`, '.mp4', PICKS[SHOTS[k].id]?.take);
  return t ? path.join(OUT, `${tag(k)}-take-${t}.mp4`) : null;
};
// A shot's end frame is an edit of one start-frame version, and carries
// that version's number
const endPath = (i) => (SHOTS[i].endFrame && framePath(i) ? framePath(i).replace('-frame-v', '-end-v') : null);
const voicePath = (i) => path.join(OUT, `${tag(i)}-voice.mp3`);

async function makeFrame(i) {
  const shot = SHOTS[i];
  const prompt = STYLE + 'Scene: ' + shot.frame;
  let model = 'fal-ai/nano-banana-pro';
  const input = { prompt, aspect_ratio: '1:1', num_images: 1, output_format: 'png', resolution: '2K' };
  // References, in order: local pictures (`refImage`, or a `ref` that is a
  // file path — sent inline as a data URI) and other shots of this film
  // ('id' = its newest frame, 'id@N' = a pinned version).
  const refs = [].concat(shot.refImage ?? [], shot.ref ?? []);
  if (refs.length) {
    model = 'fal-ai/nano-banana-pro/edit';
    input.image_urls = refs.map((r, n) => {
      if (isFile(r)) {
        const file = path.isAbsolute(r) ? r : fs.existsSync(path.resolve(r)) ? path.resolve(r) : path.join(BODY_OUT, r);
        if (!fs.existsSync(file)) throw new Error(`${shot.id}: reference picture "${r}" not found`);
        const jpg = path.join(OUT, `ref-${shot.id}-${n}.jpg`);
        ff(['-i', file, '-vf', 'scale=1536:-2', '-q:v', '2', jpg]);
        return `data:image/jpeg;base64,${fs.readFileSync(jpg).toString('base64')}`;
      }
      const [id, ver] = r.split('@');
      const k = SHOTS.findIndex((x) => x.id === id);
      const refFile = ver ? path.join(OUT, `${tag(k)}-frame-v${ver}.png`) : framePath(k);
      if (!refFile || !fs.existsSync(refFile)) throw new Error(`${shot.id}: reference frame "${r}" not generated yet`);
      return JSON.parse(fs.readFileSync(`${refFile}.json`, 'utf8')).url;
    });
  }
  const { res } = await falRun(model, input);
  const url = res.images?.[0]?.url;
  if (!url) throw new Error(`${shot.id}: frame came back empty: ${JSON.stringify(res).slice(0, 300)}`);
  const v = (versions(`${tag(i)}-frame-v`, '.png').at(-1) ?? 0) + 1;
  const file = path.join(OUT, `${tag(i)}-frame-v${v}.png`);
  await download(url, file);
  const logged = input.image_urls ? { ...input, image_urls: refs.map((r, n) => (isFile(r) ? r : input.image_urls[n])) } : input;
  fs.writeFileSync(`${file}.json`, JSON.stringify({ model, ...logged, url }, null, 2));
  ff(['-i', file, '-vf', 'scale=640:-1', file.replace('.png', '-preview.jpg')]);
  console.log(`${tag(i)}: frame v${v}`);
  // NO_END=1 redraws a start frame alone (when its end frame is already right)
  if (shot.endFrame && !process.env.NO_END) await makeEnd(i);
}

// Where a shot must land: its current start frame, edited. Also its own
// step (`ends`), to redo an end frame without redrawing the start.
async function makeEnd(i) {
  const shot = SHOTS[i];
  const file = framePath(i);
  if (!shot.endFrame || !file) throw new Error(`${shot.id}: no end frame defined, or no start frame yet`);
  const input = {
    prompt: shot.endFrame + ' No text, no labels.',
    image_urls: [JSON.parse(fs.readFileSync(`${file}.json`, 'utf8')).url],
    aspect_ratio: '1:1', num_images: 1, output_format: 'png', resolution: '2K',
  };
  const { res } = await falRun('fal-ai/nano-banana-pro/edit', input);
  const url = res.images?.[0]?.url;
  if (!url) throw new Error(`${shot.id}: end frame came back empty: ${JSON.stringify(res).slice(0, 200)}`);
  const endFile = file.replace('-frame-v', '-end-v');
  await download(url, endFile);
  fs.writeFileSync(`${endFile}.json`, JSON.stringify({ model: 'fal-ai/nano-banana-pro/edit', ...input, url }, null, 2));
  ff(['-i', endFile, '-vf', 'scale=640:-1', endFile.replace('.png', '-preview.jpg')]);
  console.log(`${tag(i)}: end frame for ${path.basename(file)}`);
}

// The narrator's voice — the films' lines and their tests' questions
async function narrate(text, file) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': EL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_v3',
      // 0.5 = "Natural": a warm, steady explainer read (the app's one-word
      // clips use 0.0 Creative, which is too bouncy across eight sentences)
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.6, speed: 0.95, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

async function makeVoice(i) {
  await narrate(SHOTS[i].narration, voicePath(i));
  fs.writeFileSync(`${voicePath(i)}.txt`, SHOTS[i].narration);
  console.log(`${tag(i)}: voice ${probe(voicePath(i)).toFixed(1)}s`);
}

// Clip length follows the narration: the line plus a breath, 5 s minimum
const clipSeconds = (i) => Math.max(5, SHOTS[i].seconds ?? 0, Math.ceil(probe(voicePath(i)) + 1.2));

async function makeVideo(i) {
  const frame = framePath(i);
  const duration = clipSeconds(i);
  const input = {
    start_image_url: JSON.parse(fs.readFileSync(`${frame}.json`, 'utf8')).url,
    prompt: MOTION_BASE + SHOTS[i].motion,
    duration,
    resolution: '720p',
  };
  const end = endPath(i);
  if (end) {
    if (!fs.existsSync(end)) throw new Error(`${tag(i)}: end frame missing for ${path.basename(frame)}`);
    input.end_image_url = JSON.parse(fs.readFileSync(`${end}.json`, 'utf8')).url;
  }
  const { requestId, res, done } = await falRun(VIDEO_MODEL, input, path.join(OUT, `${tag(i)}-pending.json`));
  const url = res.video?.url;
  if (!url) throw new Error(`${tag(i)}: no video in response ${JSON.stringify(res).slice(0, 300)}`);
  const t = (versions(`${tag(i)}-take-`, '.mp4').at(-1) ?? 0) + 1;
  const file = path.join(OUT, `${tag(i)}-take-${t}.mp4`);
  await download(url, file);
  fs.writeFileSync(`${file}.json`, JSON.stringify({ model: VIDEO_MODEL, requestId, frame: path.basename(frame), ...input, url }, null, 2));
  done();
  ff(['-i', file, '-vf', `fps=6/${duration},scale=320:-1,tile=6x1`, '-frames:v', '1', file.replace('.mp4', '-sheet.jpg')]);
  console.log(`${tag(i)}: take ${t} (${duration}s)`);
}

// One segment per shot: picture held to cover the narration, voice delayed a
// beat after the cut, short fades between shots; then concat + loudnorm.
// Narration starts LEAD into its shot and the shot holds TAIL after it
const LEAD = 0.45;
const TAIL = 0.6;
const FADE = 0.25;

// Where each shot sits in a cut. A translated narration track is laid over
// the same picture, so every line must fit its shot's `window` seconds.
const writeTimeline = (cut, lens) => {
  let start = 0;
  const shots = FILM.map((i, k) => {
    const shot = {
      id: SHOTS[i].id,
      start: Number(start.toFixed(2)),
      length: Number(lens[k].toFixed(2)),
      narrationAt: Number((start + LEAD).toFixed(2)),
      window: Number((lens[k] - LEAD - FADE).toFixed(2)),
      narration: SHOTS[i].narration,
    };
    start += lens[k];
    return shot;
  });
  const file = cut.replace(/\.mp4$/, '.timeline.json');
  fs.writeFileSync(file, JSON.stringify({ cut: path.basename(cut), seconds: Number(start.toFixed(2)), shots }, null, 2) + '\n');
  return file;
};

function assemble() {
  const segs = FILM.map((i) => {
    const voice = probe(voicePath(i));
    const clip = takePath(i);
    const from = SHOTS[i].clip?.from ?? 0;
    const to = clip ? SHOTS[i].clip?.to ?? probe(clip) : 0;
    const clipLen = to - from;
    const len = Math.max(clipLen, LEAD + voice + TAIL);
    const seg = path.join(OUT, `seg-${tag(i)}.mp4`);
    const fit = `scale=${SIZE}:${SIZE}:force_original_aspect_ratio=increase,crop=${SIZE}:${SIZE},fps=30,format=yuv420p`;
    const fades = `fade=t=in:st=0:d=${FADE},fade=t=out:st=${(len - FADE).toFixed(2)}:d=${FADE}`;
    const picture = clip
      ? ['-ss', from.toFixed(3), '-to', to.toFixed(3), '-i', clip]
      : ['-loop', '1', '-framerate', '30', '-i', framePath(i)];
    // A clip a little shorter than its narration is slowed down to fit (up
    // to 25%, invisible on slow organ motion) rather than frozen on its last
    // frame; anything beyond that is held.
    const slow = clip ? Math.min(1.25, Math.max(1, len / clipLen)) : 1;
    const hold = Math.max(0, len - clipLen * slow + 0.1).toFixed(2);
    const vf = clip
      ? `setpts=${slow.toFixed(4)}*PTS,${fit},tpad=stop_mode=clone:stop_duration=${hold},${fades}`
      : // animatic: a slow push-in on the still so it reads as a moving storyboard
        `scale=${SIZE * 2}:-1,zoompan=z='1+0.06*on/(${len.toFixed(2)}*30)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${SIZE}x${SIZE}:fps=30,format=yuv420p,${fades}`;
    ff([
      ...picture, '-i', voicePath(i),
      '-filter_complex', `[0:v]${vf}[v];[1:a]adelay=${LEAD * 1000}:all=1,apad[a]`,
      '-map', '[v]', '-map', '[a]', '-t', len.toFixed(2),
      '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', seg,
    ]);
    return { seg, len, clip: Boolean(clip) };
  });
  const list = path.join(OUT, 'concat.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${s.seg}'`).join('\n'));
  const n = (versions(`${NAME}-v`, '.mp4').at(-1) ?? 0) + 1;
  const out = path.join(OUT, `${NAME}-v${n}.mp4`);
  ff([
    '-f', 'concat', '-safe', '0', '-i', list,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:v', 'libx264', '-crf', '23', '-preset', 'slow',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out,
  ]);
  writeTimeline(out, segs.map((s) => s.len));
  const total = segs.reduce((a, s) => a + s.len, 0);
  console.log(`cut v${n}: ${total.toFixed(1)}s, ${segs.filter((s) => s.clip).length}/${segs.length} shots animated → ${out}`);
}

// Newest cut → the two files the app plays. Stream copies, so the picture
// and the narration are bit-for-bit what was approved, just separated.
function publish() {
  const n = versions(`${NAME}-v`, '.mp4').at(-1);
  if (!n) throw new Error('no cut yet — run assemble first');
  const cut = path.join(OUT, `${NAME}-v${n}.mp4`);
  const dir = path.resolve('public/films/body');
  fs.mkdirSync(dir, { recursive: true });
  const picture = path.join(dir, `${SLUG}.mp4`);
  const narration = path.join(dir, `${SLUG}.en.m4a`);
  ff(['-i', cut, '-an', '-c:v', 'copy', '-movflags', '+faststart', picture]);
  ff(['-i', cut, '-vn', '-c:a', 'copy', '-movflags', '+faststart', narration]);
  // Cuts made before timelines existed: the per-shot segments of the
  // newest assemble are still on disk, so rebuild it from their lengths
  const timeline = cut.replace(/\.mp4$/, '.timeline.json');
  if (!fs.existsSync(timeline)) {
    writeTimeline(cut, FILM.map((i) => probe(path.join(OUT, `seg-${tag(i)}.mp4`))));
  }
  const mb = (f) => (fs.statSync(f).size / 1e6).toFixed(1);
  console.log(`published cut v${n}: ${picture} (${mb(picture)} MB) + ${narration} (${mb(narration)} MB)`);
}

// Test pictures: each is one film still (or one drawing of the quiz shot
// list), cut square and saved small. Named ids only, or all of them.
function cutQuizPictures(ids) {
  const dir = path.resolve('public', path.dirname(quizPictureFile('x')).slice(1));
  fs.mkdirSync(dir, { recursive: true });
  for (const [id, pic] of Object.entries(quiz.pictures)) {
    if (ids.length && !ids.includes(id)) continue;
    let from = pic.from && path.join(BODY_OUT, pic.from);
    if (pic.shot) {
      const dirOf = path.join(BODY_OUT, quiz.name);
      const v = fs.existsSync(dirOf)
        ? fs.readdirSync(dirOf).map((f) => f.match(new RegExp(`^${pic.shot}-frame-v(\\d+)\\.png$`))?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b).at(-1)
        : null;
      from = v ? path.join(dirOf, `${pic.shot}-frame-v${v}.png`) : null;
    }
    if (!from || !fs.existsSync(from)) throw new Error(`${id}: source picture missing (${pic.from ?? `quiz frames ${pic.shot}`})`);
    const [x, y, size] = pic.crop ?? [0, 0, 1];
    const out = path.join(dir, `${id}.webp`);
    ff(['-i', from, '-vf', `crop=iw*${size}:ih*${size}:iw*${x}:ih*${y},scale=640:640`, '-c:v', 'libwebp', '-quality', '82', out]);
    console.log(`${id}: ${(fs.statSync(out).size / 1024).toFixed(0)} KB ← ${path.basename(from)}`);
  }
}

// Question clips, in the narrator's voice. Existing clips are kept (a clip
// costs money and a re-read sounds different) unless --redo is passed.
async function recordQuizQuestions(args) {
  const redo = args.includes('--redo');
  const only = args.filter((a) => !a.startsWith('--'));
  for (const [film, questions] of Object.entries(filmQuizzes)) {
    for (const q of questions) {
      const key = `${film}-${q.id}`;
      if (only.length && !only.includes(key) && !only.includes(film)) continue;
      const file = path.resolve('public', quizClipFile(film, q.id, 'en').slice(1));
      fs.mkdirSync(path.dirname(file), { recursive: true });
      if (fs.existsSync(file) && !redo) { console.log(`${key}: kept`); continue; }
      await narrate(q.question, file);
      console.log(`${key}: ${probe(file).toFixed(1)}s  "${q.question}"`);
    }
  }
}

const [step, ...rest] = argv;
fs.mkdirSync(OUT, { recursive: true });
// shots by position (1-based) or by id
const picked = rest
  .map((a) => (/^\d+$/.test(a) ? Number(a) - 1 : SHOTS.findIndex((x) => x.id === a)))
  .filter((n) => n >= 0 && n < SHOTS.length);
const FILM = SHOTS.map((_, i) => i).filter((i) => !SHOTS[i].asset);
const targets = picked.length ? picked : step === 'frames' ? SHOTS.map((_, i) => i) : FILM;

if (step === 'pictures') {
  cutQuizPictures(rest);
} else if (step === 'questions') {
  await recordQuizQuestions(rest);
} else if (step === 'assemble') {
  assemble();
} else if (step === 'publish') {
  publish();
} else if (step === 'cost') {
  const secs = targets.map(clipSeconds);
  console.log(secs.map((s, k) => `${tag(targets[k])}: ${s}s`).join('\n'));
  console.log(`total ${secs.reduce((a, b) => a + b, 0)}s ≈ $${(secs.reduce((a, b) => a + b, 0) * 0.157).toFixed(2)} at 720p`);
} else {
  const run = { frames: makeFrame, ends: makeEnd, tts: makeVoice, videos: makeVideo }[step];
  if (!run) throw new Error('step must be frames | ends | tts | videos | assemble | publish | cost | pictures | questions');
  let failed = false;
  if (step === 'frames') {
    // shots that only need text (or an existing reference) first, then the
    // edits that hang off them — in waves, so references exist in time
    const pending = new Set(targets);
    while (pending.size) {
      // a pinned ('id@N') reference already exists; a plain one must wait
      // for its shot if that is being redrawn in this run
      const ready = [...pending].filter((i) =>
        [].concat(SHOTS[i].ref ?? [])
          .filter((r) => !r.includes('@') && !isFile(r))
          .every((r) => !pending.has(SHOTS.findIndex((x) => x.id === r)))
      );
      const results = await Promise.allSettled(ready.map(run));
      results.forEach((r, k) => {
        pending.delete(ready[k]);
        if (r.status === 'rejected') { failed = true; console.error(`${tag(ready[k])}: ${r.reason.message}`); }
      });
    }
  } else if (step === 'tts') {
    for (const i of targets) await run(i); // sequential: the plan's concurrency limit
  } else {
    const results = await Promise.allSettled(targets.map(run));
    results.forEach((r, k) => r.status === 'rejected' && ((failed = true), console.error(`${tag(targets[k])}: ${r.reason.message}`)));
  }
  process.exitCode = failed ? 1 : 0;
}
