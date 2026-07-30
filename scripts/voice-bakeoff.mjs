#!/usr/bin/env node
/**
 * Voice bake-off: generate a TTS audition matrix and a self-contained
 * comparison page. Columns are style prompts, rows are voices (same text)
 * or sample texts (same voice) — any {voice, text} per row works.
 *
 *   node scripts/voice-bakeoff.mjs <config.json> [--force] [--page-only] [--batch] [--concurrency 3]
 *
 * --batch sends every pending clip through the Gemini Batch API instead of
 * interactive calls — separate quota pool from the interactive
 * 100-requests/day-per-model cap (and half price). The job is saved to
 * <outDir>/.batch-job.json and polled in-process; if polling times out,
 * re-run with --batch to resume. NB: 2.5-flash-tts does NOT support batch;
 * 3.1-flash-tts-preview does.
 *
 * Config (paths relative to the config file):
 *   {
 *     "title":  "ଓଡ଼ିଆ Voice Bake-off — Round 2",
 *     "htmlLang": "or",                      // optional, default "en"
 *     "model":  "gemini-3.1-flash-tts-preview",  // optional (that's the default;
 *                                            // only Gemini TTS model that renders Odia)
 *     "meta":   "free-text intro HTML",      // optional, shown under the title
 *     "phrases": ["line 1", "line 2"],       // optional medley box
 *     "rowHeader": "Voice",                  // optional first-column header
 *     "text":   "shared text all rows speak",// optional default for rows
 *     "prompts": [{ "idx": 1, "name": "gentle-mother", "text": "Say this as…:" }],
 *     "rows":   [{ "label": "Autonoe", "voice": "Autonoe",
 *                  "tag": "used for Spanish",     // optional badge
 *                  "text": "row-specific text" }],// optional, falls back to "text"
 *     "outDir": "."                          // page → outDir/index.html, clips → outDir/clips/
 *   }
 *
 * Clip files are p<promptIdx>-<slug(label)>.mp3; existing files are skipped so
 * interrupted runs resume (--force regenerates, --page-only skips the API).
 * Needs GEMINI_API_KEY in the environment and ffmpeg on PATH.
 */

import { mkdir, writeFile, readFile, access, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-3.1-flash-tts-preview';

const args = process.argv.slice(2);
const configPath = args.find((a) => !a.startsWith('--'));
const force = args.includes('--force');
const pageOnly = args.includes('--page-only');
const batchMode = args.includes('--batch');
const cIdx = args.indexOf('--concurrency');
const concurrency = cIdx !== -1 ? Number(args[cIdx + 1]) : 3;

if (!configPath) {
  console.error('Usage: node scripts/voice-bakeoff.mjs <config.json> [--force] [--page-only] [--concurrency N]');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

async function generateClip({ styleText, text, voice, model, apiKey }) {
  const body = {
    contents: [{ parts: [{ text: `${styleText}\n\n${text}` }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
      },
    },
  };

  // Preview models 429/500/503 routinely and sometimes return 200 with no
  // audio — both back off and retry, as do plain network hiccups.
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(`${BASE_URL}/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (attempt >= 6) throw new Error(`network: ${err.message}`);
      await sleep(3000 * (attempt + 1));
      continue;
    }
    if (res.ok) {
      const data = await res.json();
      const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (part) {
        const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1] || 24000);
        return pcmToMp3(Buffer.from(part.inlineData.data, 'base64'), rate);
      }
      if (attempt >= 6) {
        throw new Error(`no audio in response: ${JSON.stringify(data).slice(0, 300)}`);
      }
    } else {
      const errText = await res.text();
      if (![429, 500, 503].includes(res.status) || attempt >= 6) {
        throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
      }
    }
    await sleep(3000 * (attempt + 1));
  }
}

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

// Batch path: one job for all pending clips (separate quota from interactive).
// Mechanics mirror scripts/voice-batch-gemini.mjs.
async function runBatch({ pending, model, apiKey, outDir, clipsDir }) {
  const stateFile = path.join(outDir, '.batch-job.json');
  let st = null;
  try {
    st = JSON.parse(await readFile(stateFile, 'utf8'));
  } catch {
    /* no saved job */
  }

  if (!st) {
    if (!pending.length) return;
    const lines = pending.map((job) =>
      JSON.stringify({
        key: job.label,
        request: {
          contents: [{ parts: [{ text: `${job.prompt.text}\n\n${job.text}` }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: job.row.voice } },
            },
          },
        },
      })
    );
    const jsonl = Buffer.from(lines.join('\n') + '\n');

    // Files API resumable upload (start → upload+finalize)
    const start = await apiFetch(apiKey, `${BASE_URL.replace('/v1beta', '')}/upload/v1beta/files`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(jsonl.length),
        'X-Goog-Upload-Header-Content-Type': 'application/jsonl',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ file: { display_name: 'voice-bakeoff' } }),
    });
    const uploadUrl = start.headers.get('x-goog-upload-url');
    if (!uploadUrl) throw new Error('Files API gave no upload URL');
    const uploaded = await (
      await apiFetch(apiKey, uploadUrl, {
        method: 'POST',
        headers: { 'X-Goog-Upload-Command': 'upload, finalize', 'X-Goog-Upload-Offset': '0' },
        body: jsonl,
      })
    ).json();
    const fileName = uploaded.file?.name;
    if (!fileName) throw new Error(`No file name in upload response: ${JSON.stringify(uploaded).slice(0, 200)}`);

    const job = await (
      await apiFetch(apiKey, `${BASE_URL}/models/${model}:batchGenerateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: {
            display_name: `bakeoff-${pending.length}`,
            input_config: { file_name: fileName },
          },
        }),
      })
    ).json();
    if (!job.name) throw new Error(`No job name: ${JSON.stringify(job).slice(0, 300)}`);
    st = {
      jobName: job.name,
      files: Object.fromEntries(pending.map((j) => [j.label, path.basename(j.file)])),
    };
    await writeFile(stateFile, JSON.stringify(st, null, 2) + '\n');
    console.log(`Batch job created: ${job.name} (${pending.length} clips)`);
  } else {
    console.log(`Resuming saved batch job: ${st.jobName}`);
  }

  const deadline = Date.now() + 20 * 60 * 1000;
  let job;
  for (;;) {
    job = await (await apiFetch(apiKey, `${BASE_URL}/${st.jobName}`)).json();
    const state = job.metadata?.state || job.state || 'UNKNOWN';
    if (state.endsWith('SUCCEEDED')) break;
    if (state.endsWith('FAILED') || state.endsWith('CANCELLED') || state.endsWith('EXPIRED')) {
      throw new Error(`batch ${state}: ${JSON.stringify(job.error || {}).slice(0, 300)}`);
    }
    if (Date.now() > deadline) {
      console.log(`Still ${state} after 20 min — re-run with --batch to resume polling (job saved in ${stateFile}).`);
      process.exit(2);
    }
    console.log(`  batch state: ${state} — waiting…`);
    await sleep(15000);
  }

  const responsesFile = job.response?.responsesFile || job.metadata?.output?.responsesFile;
  let linesText;
  if (responsesFile) {
    linesText = await (
      await apiFetch(apiKey, `${BASE_URL.replace('/v1beta', '')}/download/v1beta/${responsesFile}:download?alt=media`)
    ).text();
  } else if (job.response?.inlinedResponses) {
    linesText = job.response.inlinedResponses.inlinedResponses
      .map((r) => JSON.stringify({ key: r.metadata?.key, response: r.response, error: r.error }))
      .join('\n');
  } else {
    throw new Error(`No responses in job: ${JSON.stringify(job).slice(0, 400)}`);
  }

  let done = 0;
  let failed = 0;
  for (const row of linesText.split('\n').filter(Boolean)) {
    let key = null;
    try {
      const parsed = JSON.parse(row);
      key = parsed.key ?? parsed.metadata?.key;
      const part = parsed.response?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!part) {
        throw new Error(
          JSON.stringify(parsed.error || parsed.response?.promptFeedback || 'no audio').slice(0, 160)
        );
      }
      const fname = st.files[key];
      if (!fname) throw new Error('key not in saved job state');
      const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1] || 24000);
      const mp3 = await pcmToMp3(Buffer.from(part.inlineData.data, 'base64'), rate);
      await writeFile(path.join(clipsDir, fname), mp3);
      done++;
      console.log(`  ✓ ${key}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${key}: ${err.message}`);
    }
  }
  await unlink(stateFile).catch(() => {});
  console.log(`Batch collected: ${done} ok, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

function renderPage(config) {
  const model = config.model || DEFAULT_MODEL;
  const showRowText = config.rows.some((r) => r.text);
  const meta =
    config.meta ||
    `Model: <b>${esc(model)}</b> — each cell speaks its row's text with the column's style prompt. Playing a clip stops (and rewinds) whichever was playing.`;

  const phrasesBox = config.phrases?.length
    ? `<div class="phrases">\n  <ol>\n${config.phrases.map((p) => `    <li>${esc(p)}</li>`).join('\n')}\n  </ol>\n</div>\n`
    : '';

  const legend = config.prompts
    .map(
      (p) =>
        `  <li><span class="pidx">P${p.idx}</span><span class="pname">${esc(p.name)}</span> <span class="ptext">${esc(p.text)}</span></li>`
    )
    .join('\n');

  const thead =
    `<tr><th>${esc(config.rowHeader || 'Voice')}</th>` +
    config.prompts.map((p) => `<th title="${esc(p.name)}">P${p.idx}</th>`).join('') +
    '</tr>';

  const tbody = config.rows
    .map((row) => {
      const tag = row.tag ? `<span class="tag">${esc(row.tag)}</span>` : '';
      const rowText = showRowText && row.text ? `<div class="rowtext">${esc(row.text)}</div>` : '';
      const cells = config.prompts
        .map(
          (p) =>
            `<td><button class="play" data-src="clips/p${p.idx}-${slug(row.label)}.mp3" title="P${p.idx} · ${esc(row.label)}">▶</button></td>`
        )
        .join('');
      return `  <tr${row.tag ? ' class="fav"' : ''}><td><span class="vname">${esc(row.label)}</span>${tag}${rowText}</td>${cells}</tr>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="${esc(config.htmlLang || 'en')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(config.title)}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    font-family: system-ui, -apple-system, "Noto Sans Oriya", sans-serif;
    max-width: 900px; margin: 0 auto; padding: 24px 16px 64px;
    line-height: 1.5;
  }
  h1 { font-size: 1.5rem; margin-bottom: 4px; }
  .meta { color: #888; font-size: 0.85rem; margin-bottom: 20px; }
  .phrases {
    background: rgba(125,125,125,0.08); border-radius: 12px;
    padding: 14px 18px; margin-bottom: 20px; font-size: 1.15rem;
  }
  .phrases li { margin: 4px 0; }
  h2 { font-size: 1.1rem; margin: 28px 0 10px; border-bottom: 1px solid rgba(125,125,125,0.3); padding-bottom: 6px; }
  .legend { font-size: 0.9rem; margin: 0 0 20px; padding-left: 0; list-style: none; }
  .legend li { margin: 6px 0; }
  .pidx {
    display: inline-block; min-width: 2.2em; text-align: center;
    font-weight: 700; background: #7c5cff22; color: #7c5cff;
    border-radius: 6px; padding: 0 6px; margin-right: 8px;
  }
  .pname { font-weight: 600; margin-right: 6px; }
  .ptext { color: #888; }
  .tablewrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 6px 8px; text-align: center; border-bottom: 1px solid rgba(125,125,125,0.2); }
  th:first-child, td:first-child { text-align: left; }
  td:first-child { max-width: 340px; }
  tr.fav td:first-child .vname { color: #7c5cff; }
  .vname { font-weight: 700; }
  .rowtext { font-size: 0.85rem; color: #888; }
  .tag { font-size: 0.7rem; background: #7c5cff22; color: #7c5cff; border-radius: 999px; padding: 1px 8px; margin-left: 6px; vertical-align: middle; white-space: nowrap; }
  button.play {
    font-size: 1rem; width: 3.2em; height: 2.2em;
    border: 1px solid rgba(125,125,125,0.35); border-radius: 8px;
    background: transparent; cursor: pointer;
  }
  button.play:hover { border-color: #7c5cff; }
  button.play.playing { background: #7c5cff; border-color: #7c5cff; color: #fff; }
  button.play.err { border-color: #e5484d; color: #e5484d; cursor: not-allowed; }
  .note { font-size: 0.85rem; color: #888; margin-top: 10px; }
</style>
</head>
<body>
<h1>${esc(config.title)}</h1>
<div class="meta">${meta}</div>

${phrasesBox}<h2>Style prompts</h2>
<ul class="legend">
${legend}
</ul>

<h2>Grid</h2>
<div class="tablewrap">
  <table>
    <thead>${thead}</thead>
    <tbody>
${tbody}
    </tbody>
  </table>
</div>
<div class="note">
  Clip files: <code>clips/p&lt;idx&gt;-&lt;slug&gt;.mp3</code>, generated by <code>scripts/voice-bakeoff.mjs</code>
  from the sibling config. A red ✕ means that clip is missing or failed to generate.
</div>

<script>
// One clip at a time: starting any clip stops the current one and rewinds it.
let current = null; // { audio, btn }
function stopCurrent() {
  if (!current) return;
  current.audio.pause();
  current.audio.currentTime = 0;
  current.btn.classList.remove('playing');
  current.btn.textContent = '▶';
  current = null;
}
document.querySelectorAll('button.play').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('err')) return;
    if (current && current.btn === btn) { stopCurrent(); return; }
    stopCurrent();
    const audio = new Audio(btn.dataset.src);
    current = { audio, btn };
    btn.classList.add('playing');
    btn.textContent = '◼';
    audio.addEventListener('ended', stopCurrent);
    audio.play().catch(() => {
      stopCurrent();
      btn.classList.add('err');
      btn.textContent = '✕';
      btn.title += ' — clip missing/failed';
    });
  });
});
</script>
</body>
</html>
`;
}

async function main() {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const baseDir = path.dirname(path.resolve(configPath));
  const outDir = path.resolve(baseDir, config.outDir || '.');
  const clipsDir = path.join(outDir, 'clips');
  const model = config.model || DEFAULT_MODEL;

  for (const row of config.rows) {
    if (!row.voice) throw new Error(`row "${row.label}" has no voice`);
    if (!(row.text || config.text)) throw new Error(`row "${row.label}" has no text (and no shared "text")`);
  }

  await mkdir(clipsDir, { recursive: true });

  if (!pageOnly) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('Error: GEMINI_API_KEY not set.');
      process.exit(1);
    }

    const jobs = [];
    for (const prompt of config.prompts) {
      for (const row of config.rows) {
        jobs.push({
          prompt,
          row,
          text: row.text || config.text,
          label: `p${prompt.idx}-${slug(row.label)}`,
          file: path.join(clipsDir, `p${prompt.idx}-${slug(row.label)}.mp3`),
        });
      }
    }
    const pending = [];
    for (const job of jobs) {
      const exists = await access(job.file).then(() => true, () => false);
      if (force || !exists) pending.push(job);
    }
    console.log(
      `${jobs.length} combos (${config.prompts.length} prompts × ${config.rows.length} rows) | already done: ${jobs.length - pending.length} | to generate: ${pending.length}`
    );

    if (batchMode) {
      await runBatch({ pending, model, apiKey, outDir, clipsDir });
    } else {
      let done = 0;
      let failed = 0;
      const queue = [...pending];
      await Promise.all(
        Array.from({ length: Math.max(1, concurrency) }, async () => {
          while (queue.length) {
            const job = queue.shift();
            try {
              const bytes = await generateClip({
                styleText: job.prompt.text,
                text: job.text,
                voice: job.row.voice,
                model,
                apiKey,
              });
              await writeFile(job.file, bytes);
              done++;
              console.log(`  ✓ [${done}/${pending.length}] ${job.label}`);
            } catch (err) {
              failed++;
              console.error(`  ✗ ${job.label}: ${err.message}`);
            }
          }
        })
      );
      console.log(`Clips: ${done} generated, ${failed} failed.`);
      if (failed > 0) process.exitCode = 1;
    }
  }

  const pagePath = path.join(outDir, 'index.html');
  await writeFile(pagePath, renderPage(config));
  console.log(`Page written: ${pagePath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
