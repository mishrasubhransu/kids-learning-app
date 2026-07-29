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

## 5. [ ] Recap sticker (end-of-session payoff)
When a quiz/category session finishes, show a recap moment — reuse the `CategoryIntro.jsx` collage/circle-reveal machinery in reverse (collage of what the child just saw) — and award a sticker that persists per child (sticker shelf, toddler-appropriate progress).
