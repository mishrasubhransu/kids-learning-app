---
name: voice-bakeoff
description: Build a TTS audition matrix — style prompts (columns) × voices or sample texts (rows) — with Gemini TTS, rendered as a self-contained grid page with one-clip-at-a-time playback. Use when auditioning voices, style prompts, or both for a locale before committing to a full clip-generation run.
---

# Voice bake-off

Generates an audition matrix of TTS clips plus a static comparison page. One
command, one JSON config:

```bash
node scripts/voice-bakeoff.mjs <dir>/bakeoff.json [--force] [--page-only] [--batch] [--concurrency 3]
```

Needs `GEMINI_API_KEY` in the environment (it's exported by the shell profile
here, NOT in `.env`) and `ffmpeg` on PATH.

## How to set one up

1. Create a directory for the audition (e.g. `es-style-audition/`) with a
   `bakeoff.json` in it. Existing examples to copy from:
   - `odia-voice-comparison/bakeoff.json` — many voices × several prompts, one shared text
   - `es-style-audition/bakeoff.json` — one voice × several prompts, real per-row catalog texts
2. Run the tool. Clips land in `<outDir>/clips/p<promptIdx>-<slug(label)>.mp3`,
   the page in `<outDir>/index.html`. Existing clips are skipped (resume);
   `--force` regenerates; `--page-only` rewrites the page without API calls
   (after editing titles/meta/legend text).
3. Tell the user to open the page. Playback is exclusive: starting any clip
   stops and rewinds the previous one; a red ✕ marks a missing/failed clip.

## Config shape

```jsonc
{
  "title": "...",              // page <h1>/<title>
  "htmlLang": "es",            // optional, default "en"
  "model": "gemini-3.1-flash-tts-preview",  // optional; that's the default and
                               // the ONLY Gemini TTS model that renders Odia
  "meta": "intro HTML",        // optional blurb under the title
  "phrases": ["…", "…"],       // optional medley box (when all rows share text)
  "rowHeader": "Voice",        // first-column header ("Sample" for text rows)
  "text": "shared text",       // default text every row speaks
  "prompts": [{ "idx": 1, "name": "gentle-mother", "text": "Say this as …:" }],
  "rows": [{ "label": "Autonoe", "voice": "Autonoe",
             "tag": "badge",   // optional highlight badge
             "text": "…" }],   // optional per-row override of "text"
  "outDir": "."                // relative to the config file
}
```

Rows are `{voice, text}` pairs, so the same matrix covers "compare voices",
"compare style prompts", and "hear one style across real catalog lines".

## Conventions & gotchas

- Rename or renumber a prompt → its old `p<idx>-*.mp3` files go stale; delete
  them or `--force` the run. The tool never prunes.
- Preview TTS models throw 429/500/503 and empty-audio responses routinely;
  the tool retries with backoff. Keep concurrency ≤3.
- Interactive Gemini TTS is capped at **100 requests/day/model** on this key —
  one big matrix can burn the whole day. On persistent 429 "quota" errors,
  re-run with `--batch`: same clips through the Batch API (separate quota
  pool, half price). The job is saved to `<outDir>/.batch-job.json` and polled
  in-process; if polling times out, re-run `--batch` to resume. Batch is NOT
  supported by 2.5-flash-tts (3.1-flash-tts-preview is fine).
- When auditioning a style for a real locale, pull row texts from the actual
  catalog (`buildCatalog('<loc>')` in `scripts/voice-catalog.mjs`, run via
  `node --import ./scripts/register-jsx.mjs`) rather than inventing lines, and
  include the locale's current live prompt from
  `scripts/generate-voice-clips-gemini.mjs` `STYLE_PROMPT` as P1 for A/B.
- These audition dirs are throwaway galleries — they don't touch the Supabase
  `voice` bucket or `voiceManifest.json`. The real regeneration happens in
  `scripts/generate-voice-clips-gemini.mjs` / `scripts/voice-batch-gemini.mjs`
  once a winner is picked (update their `STYLE_PROMPT` first).
