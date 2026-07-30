# Immediate TODO

Work these one by one, mark completed as we go.

## 1. [x] Lock buttons while audio is playing (all tests)
Until the current audio clip finishes, disable/ignore answer button presses so audios never overlap. Applies to **all test modes**: `TestingMode.jsx`, `MatchGame.jsx`, `SceneQuiz.jsx` (and any other quiz-like interaction). Learning views are not the target — this is specifically about tests where a tap triggers speech/praise and a fast second tap starts another clip on top.

## 2. [x] Cap entries per lesson & per test, with unseen-first rotation
- Restrict the number of items shown in each lesson, and separately in each test.
- Both caps configurable in Parent Zone settings (per-child settings jsonb already exists via `useChildSetting`).
- Rotation rule: next session must show the items that were NOT shown last time first (persist per-child "last shown" set, e.g. in child settings or usage data), so the child cycles through the whole category across sessions instead of seeing the same first N.

## 3. [x] "My Family" lesson (main page)
- New lesson on the main page: parents add family members (name + relation) and upload photos.
- Reuse the custom-praise infra: per-child storage manifest + two-phase upload API + Parent Zone management UI.
- Category entry page shows a **family tree** layout (instead of the standard collage intro).
- Name audio: recorded/TTS per member name, same pattern as child name audio.

## 4. [x] New content: things kids see outside + household/gadgets
Add to existing lessons where they fit, or create new lessons:
- **Roads/outside**: roads, fence, tunnel, street lamp, drain, playground
- **Weather** (likely its own lesson): cloudy, sunny, rainy, foggy, windy, snowy, stormy
- **Construction vehicles**: digger, crane, steam roller, concrete mixer, ... (extend as sensible)
- **Household**: clock
- **Gadgets** (likely its own lesson): phone, headphone, earphone, camera, remote, drone, laptop, keyboard, mouse, ...
Use the established image pipeline (Gemini per billing constraint, genlab.record() on every generation, style folders per CATEGORY_IMAGE_STYLES).

## 5. [x] Recap sticker (end-of-session payoff)
When a quiz/category session finishes, show a recap moment — reuse the `CategoryIntro.jsx` collage/circle-reveal machinery in reverse (collage of what the child just saw) — and award a sticker that persists per child (sticker shelf, toddler-appropriate progress).

## 6. [ ] Multi-language: Spanish, then Mandarin Chinese
Per-child `language` setting (Parent Zone → Personalization, via `useChildSetting`; siblings can differ). English stays on the shipped ElevenLabs clips; new locales use **Gemini TTS, voice Autonoe** (`gemini-2.5-flash-preview-tts`, Laura-style prompt, inline [gasps] tags work; ~$1/language, PCM→ffmpeg→mp3, needs retry + text-hash resume like the EL script).
Build order — each step shippable, locale stays dark until clips are complete:
- [x] Locale plumbing: `language` setting + LocaleContext/`t()` + Parent Zone picker (only lists complete locales; incomplete ones show as "(beta)" in dev builds)
- [x] Slug/name split: rotation (`lessonShown-*`/`testShown-*`) and analytics key on English-derived slugs/enName; voice-part builders take localized items; recordings stay keyed by raw English names (images keep English filenames — assets are language-neutral)
- [x] `src/locales/es/` pack: items (~430 incl. articles/say-forms), UI strings, voice-part sentence templates, intros, praise/encouragement, scene questions — AI-first, **pending native review** (regional picks flagged in `src/locales/es/items.js` header: fish/jacket/ladybug/peas/speaker/tope/café)
- [x] Per-locale lesson availability in the registry: es hides phonics (incl. letter-sounds); zh will also hide alphabets + typing
- [x] Generate `es/` clips: DONE via **Gemini Batch API** (`scripts/voice-batch-gemini.mjs submit|status|collect`) on `gemini-3.1-flash-tts-preview` (interactive API caps at 100 req/day/model; 2.5-flash-tts doesn't support batch). All 1,844 clips in the voice bucket + manifest; `es` flipped `complete: true` — the Parent Zone language picker is live. Native review is now in-app: flag words, fix the pack, re-run `submit` (only changed hashes regenerate, ~cents).
- [x] Per-locale praise templates in `api/generate-name-audio.js` — es children get Gemini Autonoe (PCM→WAV, no ffmpeg in serverless), manifest stamps `locale`, language switch regenerates. **Deploy note: Vercel needs `GEMINI_API_KEY`.**
- [ ] Repeat pack + batch generation for zh (Autonoe Mandarin ear-check first)
Full context & open decisions: session memory `toddlearn-i18n-plan`.
