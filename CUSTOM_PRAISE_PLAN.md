# Custom Praise — Handover Plan

Status: **BUILT (2026-07-28).** Everything below is implemented as
specified: two-phase generation in `api/generate-name-audio.js` (actions
`name`/`praise`/`delete`), manifest storage layout, cache-first client
playback in `src/lib/nameAudio.js`, personalized pick logic in
`src/hooks/useAudioFeedback.js` (first praise of a game, then ~1-in-3),
Parent Zone secondary "making praise clips…" state, legacy-path self-heal,
and storage cleanup on regeneration and profile delete (via the API delete
action — no client storage policy was added). The doc is kept for the
rationale and the env gotchas at the bottom.

## Why (history)

We first spliced a name clip onto praise clips with the Web Audio API
("Great job!" + "Veronica!"). It worked but sounded bad — the join is
audible and the intonation doesn't flow. Decision: generate **complete
personalized praise phrases** per child instead. That code was removed;
git history has it if ever needed (look for `playSpliced` in
`src/lib/nameAudio.js`).

## UX flow (agreed with parent-in-chief)

1. Parent renames/creates a child → the API **first** generates the quick
   neutral name clip (~2 s) exactly as today → status flips to ready with a
   play button. Parent gets fast confirmation.
2. **Then, non-blocking**, the API generates ~8 personalized praise phrases
   (~15–25 s total). Parent Zone may show a secondary "making praise
   clips…" state, but nothing waits on it. If a game starts before they're
   ready, plain praise plays — never a stall.

## Generation details

- Templates (2 per excitement tier, hand-written so the name sits
  naturally; keep eleven_v3 audio tags, mirror `scripts/generate-audio.mjs`
  voice settings per tier — stability 0.0, style 1.0, tier speeds
  1.0/1.05/1.1/1.1):
  - tier0: `Good job, {name}!` / `Well done, {name}!`
  - tier1: `Ooh, great work, {name}!` / `Awesome, {name}, way to go!`
  - tier2: `[laughs] Wow, amazing, {name}!` / `[gasps] Look at you go, {name}!`
  - tier3: `[gasps] {name}, you're a genius!` / `{name}, you are a superstar! [laughs]`
- Encouragement stays name-free on purpose ("Uh oh, not quite, Veronica!"
  reads as scolding).
- **ElevenLabs free tier limits**: 2 concurrent requests max → generate in
  batches of 2. ~240 chars per child per run (10k/month quota — trivial).
  `previous_text`/`next_text` are REJECTED by eleven_v3 (400) — don't.
- Voice: Laura `FGY2WhTYpPnrIDTdsKH5`, `eleven_v3`,
  `output_format=mp3_44100_128` (same as existing clips).
- Vercel: function needs `maxDuration` ≥ 60 (vercel.json `functions`
  config); Hobby default ~10 s is too short for 8 batched calls.

## Storage & data

- Bucket `name-audio` (public, unguessable uuid paths). Layout per version:
  `<user_id>/<child_id>/<timestamp>/` containing `name.mp3`,
  `praise-<tier>-<i>.mp3` (8), and `manifest.json`
  (`{ name, tiers: { "0": ["praise-0-0.mp3", ...], ... } }`).
- `child_profiles.name_audio_path` points at the **manifest** when praise
  clips exist; a path ending in `.mp3` is the legacy/neutral-only format.
  Client treats non-manifest paths as "praise not ready" and the
  session-once self-heal in `ChildProfileContext` re-requests generation.
- Cleanup: the API deletes older `<timestamp>` folders on regeneration
  (service role). Profile deletion must delete the child's whole folder —
  either extend the API with a delete action called before the row delete,
  or add a storage RLS delete policy scoped to
  `(storage.foldername(name))[1] = auth.uid()::text` and clean from the
  client (`deleteChild` in ChildProfileContext).

## Client playback (simpler than the splice ever was)

- On profile load (name feature on): fetch manifest, cache-first
  (Cache Storage, versioned URLs), warm nothing else — each personalized
  praise is ONE mp3, playable via a plain Audio element.
- `useAudioFeedback.playPositive`: first praise of a game uses a
  personalized clip for the current tier (guaranteed, if loaded), then
  ~1-in-3; otherwise stock clips. Respect `settings.useNameInPraise`
  (default on) and `settings.soundEffects` (already wired).
- Parent Zone play button: play a personalized tier-0 clip when the
  manifest exists, else the neutral name clip.

## Touch list

`api/generate-name-audio.js` (two-phase generation + cleanup),
`vercel.json` (maxDuration), `src/lib/nameAudio.js` (manifest fetch/cache/
play helpers), `src/hooks/useAudioFeedback.js` (personalized pick logic),
`src/components/parent/ParentZone.jsx` (NameAudioStatus secondary state),
`src/context/ChildProfileContext.jsx` (self-heal condition: legacy path ⇒
regenerate; delete cleanup), one storage-policy migration if client-side
delete is chosen.

## Env / local-dev gotchas (hard-won, do not rediscover)

- Local: `npm run dev` (:5173) proxies `/api` → `npx vercel dev` (:3000)
  (see `vite.config.js`). `vercel dev` can't read Sensitive dashboard env
  vars — local values live in gitignored `.env` (service key + URL +
  `ELEVENLABS_API_KEY`).
- The service key MUST be the `vcfzbpxnvixivzmjfpnd` project's
  (sha256 prefix `0811e872`). A wrong-project key surfaces as
  `Invalid API key` from auth; the function's 401 diagnostics print the
  key's ref.
