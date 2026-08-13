/* global process, Buffer */
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { alertTelegram } from './_lib/telegram-alert.js';

// Per-child voice clips (same ElevenLabs voice as the prerecorded praise
// clips), stored in the name-audio bucket. Three actions, all keyed by a
// childId only — the text sent to ElevenLabs comes from the child_profiles
// row, never from the request, so this can't be abused as a general TTS
// proxy for our API key:
//
//   name (default) — quick neutral read of the name (~2 s). Fast
//     confirmation for the parent; uploads <uid>/<cid>/<ts>/name.mp3 and
//     points name_audio_path at it.
//   praise — 8 personalized praise phrases (2 per excitement tier) plus a
//     manifest.json; points name_audio_path at the manifest. The client
//     fires this AFTER the name action returns, so nothing waits on it.
//   delete — removes the child's whole storage folder (called before the
//     profile row is deleted; only the service role can write this bucket).
//
// A name_audio_path ending in .mp3 = neutral-only (praise not ready);
// ending in manifest.json = personalized praise exists.
//
// The same endpoint also voices FAMILY MEMBERS (the My Family lesson):
// pass memberId instead of childId. Members get the neutral name clip and
// delete only (no praise tiers), under <uid>/family/<member_id>/<ts>/ —
// the 'family' literal can never collide with a child uuid prefix.

const BUCKET = 'name-audio';
const VOICE_ID = 'FGY2WhTYpPnrIDTdsKH5'; // Laura — matches public/audio praise clips
const MODEL_ID = 'eleven_v3';

// Non-English children get the same Gemini voice as the rest of their app
// audio (scripts/generate-voice-clips-gemini.mjs) — a praise clip in the
// English voice mid-Spanish-game would be jarring. Family members carry
// their own name_lang column instead (they're shared across siblings, so
// there's no per-child locale to follow): "Jeje Bapa" reads badly in an
// English voice, null means English.
const GEMINI_MODEL = 'gemini-2.5-flash-preview-tts';
// Odia only renders on the 3.1 generation (2.5-flash/pro return no audio)
const GEMINI_MODEL_BY_LOCALE = { or: 'gemini-3.1-flash-tts-preview' };
// User-auditioned voice per locale (bake-off winners)
const GEMINI_VOICE = { es: 'Autonoe', zh: 'Kore', or: 'Autonoe' };
const GEMINI_STYLE = {
  es: 'Di esto como una madre dulce y cariñosa hablándole a su hijo de dos años, en español latinoamericano neutro — suave, cálida, pausada y tranquilizadora:',
  zh: 'Say this as a gentle, loving mother speaking to her two-year-old, in standard Mandarin Chinese — soft, warm, unhurried, and reassuring:',
  or: 'Say this as a gentle, loving mother speaking to her two-year-old, in standard Odia — soft, warm, unhurried, and reassuring:',
};
// Name reads use the same warm style as praise. They briefly used a
// neutral-precise "demonstration" prompt (2026-08-07) because the warm tone
// seemed to blur names — but the real blur was Latin-script transliteration
// guessing, now pinned by name_phonetic, and the crisp read sounded
// unnatural (user call 2026-08-10). Vocabulary clips
// (scripts/generate-voice-clips-gemini.mjs WORD_STYLE_PROMPT) still use the
// crisp style — that choice stands separately.

// Hand-written so the name sits naturally; audio tags + per-tier speeds
// mirror scripts/generate-audio.mjs (v3 stability 0.0 = Creative). Gemini
// has no speed knob — the style prompt carries the energy instead.
const PRAISE_TIERS_BY_LOCALE = {
  en: [
    { speed: 1.0, texts: ['Good job, {name}!', 'Well done, {name}!'] },
    { speed: 1.05, texts: ['Ooh, great work, {name}!', 'Awesome, {name}, way to go!'] },
    { speed: 1.1, texts: ['[laughs] Wow, amazing, {name}!', '[gasps] Look at you go, {name}!'] },
    { speed: 1.1, texts: ["[gasps] {name}, you're a genius!", '{name}, you are a superstar! [laughs]'] },
  ],
  es: [
    { speed: 1.0, texts: ['¡Muy bien, {name}!', '¡Bien hecho, {name}!'] },
    { speed: 1.05, texts: ['¡Uy, qué buen trabajo, {name}!', '¡Genial, {name}, así se hace!'] },
    { speed: 1.1, texts: ['[laughs] ¡Guau, increíble, {name}!', '[gasps] ¡Mírate, {name}, qué bien vas!'] },
    { speed: 1.1, texts: ['[gasps] ¡{name}, eres un genio!', '¡{name}, eres una superestrella! [laughs]'] },
  ],
  zh: [
    { speed: 1.0, texts: ['真棒，{name}！', '做得好，{name}！'] },
    { speed: 1.05, texts: ['哇，{name}，做得真好！', '太棒了，{name}！'] },
    { speed: 1.1, texts: ['[laughs] 哇，{name}，太厉害了！', '[gasps] 看看你，{name}，真能干！'] },
    { speed: 1.1, texts: ['[gasps] {name}，你是小天才！', '{name}，你是超级明星！[laughs]'] },
  ],
  or: [
    { speed: 1.0, texts: ['ସାବାସ୍, {name}!', 'ଭଲ କଲ, {name}!'] },
    { speed: 1.05, texts: ['ବାଃ, {name}, କେତେ ଭଲ କଲ!', 'ବହୁତ ବଢ଼ିଆ, {name}!'] },
    { speed: 1.1, texts: ['[laughs] ବାଃ, {name}, କି କମାଲ!', '[gasps] ଦେଖ ତ {name}, କେତେ ପାରୁଛ!'] },
    { speed: 1.1, texts: ['[gasps] {name}, ତୁମେ ତ ଛୋଟ ପଣ୍ଡିତ!', '{name}, ତୁମେ ସୁପରଷ୍ଟାର! [laughs]'] },
  ],
};

const ttsEleven = async (apiKey, text, voiceSettings) => {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: MODEL_ID,
        voice_settings: voiceSettings,
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  }
  return Buffer.from(await res.arrayBuffer());
};

// Gemini TTS returns raw PCM and serverless has no ffmpeg — a 44-byte WAV
// header makes it browser-playable as-is (16-bit mono).
const pcmToWav = (pcm, rate) => {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
};

const ttsGemini = async (apiKey, locale, text) => {
  const body = {
    contents: [
      { parts: [{ text: `${GEMINI_STYLE[locale]}\n\n${text}` }] },
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_VOICE[locale] || 'Autonoe' } },
      },
    },
  };
  // Preview models throw transient errors (HTTP and plain network) — a few
  // retries, not a loop that could outlive the serverless timeout
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_BY_LOCALE[locale] || GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
    } catch (err) {
      if (attempt >= 2) throw new Error(`Gemini network: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    if (res.ok) {
      const data = await res.json();
      const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (part) {
        const rate = Number(
          /rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1] || 24000
        );
        return pcmToWav(Buffer.from(part.inlineData.data, 'base64'), rate);
      }
      if (attempt >= 2) throw new Error('Gemini: no audio in response');
    } else {
      const errText = await res.text();
      if (![429, 500, 503].includes(res.status) || attempt >= 2) {
        throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
      }
    }
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
};

const upload = async (admin, path, body, contentType) => {
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, body, { contentType, upsert: true });
  if (error) throw new Error(`Upload ${path}: ${error.message}`);
};

// Supabase storage has no recursive delete: list entries (id = file,
// no id = folder), recurse into folders, remove files by full path.
const listFilesDeep = async (admin, prefix) => {
  const { data, error } = await admin.storage
    .from(BUCKET)
    .list(prefix, { limit: 100 });
  if (error || !data) return [];
  const files = [];
  for (const entry of data) {
    if (entry.id) files.push(`${prefix}/${entry.name}`);
    else files.push(...(await listFilesDeep(admin, `${prefix}/${entry.name}`)));
  }
  return files;
};

// Remove every older <timestamp> folder (and legacy loose <ts>.mp3 files)
// for a child. Runs AFTER name_audio_path points at the new version, so a
// failure here never strands the profile — worst case is orphaned files.
const cleanupOldVersions = async (admin, childPrefix, keepTs) => {
  try {
    const { data } = await admin.storage
      .from(BUCKET)
      .list(childPrefix, { limit: 100 });
    if (!data) return;
    const stale = [];
    for (const entry of data) {
      if (entry.id) stale.push(`${childPrefix}/${entry.name}`); // legacy loose mp3
      else if (entry.name !== keepTs) {
        stale.push(...(await listFilesDeep(admin, `${childPrefix}/${entry.name}`)));
      }
    }
    if (stale.length) await admin.storage.from(BUCKET).remove(stale);
  } catch (error) {
    console.warn('name-audio cleanup failed:', error.message);
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ELEVENLABS_API_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!ELEVENLABS_API_KEY || !SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
    return res.status(500).json({ error: 'Name audio not configured' });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Not signed in' });
  }

  const { childId, memberId, action = 'name' } = req.body || {};
  const subjectId = childId ?? memberId;
  if (!subjectId || typeof subjectId !== 'string') {
    return res.status(400).json({ error: 'childId or memberId is required' });
  }
  const allowed = memberId ? ['name', 'delete'] : ['name', 'praise', 'delete'];
  if (!allowed.includes(action)) {
    return res.status(400).json({ error: 'Unknown action' });
  }

  try {
    const admin = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      // Safe diagnostics (formats/hosts/timestamps, never secret values):
      // which key kind the runtime loaded, which Supabase host it's talking
      // to, whether the caller's token is expired, and the real auth error.
      const k = SUPABASE_SERVICE_ROLE_KEY;
      const kind = k.startsWith('eyJ')
        ? 'jwt'
        : k.startsWith('sb_secret')
          ? 'secret-key'
          : 'unrecognized';
      let urlHost = 'invalid-url';
      try {
        urlHost = new URL(supabaseUrl).host;
      } catch { /* leave as invalid-url */ }
      let tokenInfo = 'unreadable';
      try {
        const p = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64url').toString()
        );
        const mins = Math.round((p.exp * 1000 - Date.now()) / 60000);
        const issHost = p.iss ? new URL(p.iss).host : 'no-iss';
        tokenInfo = `iss ${issHost}, ${
          mins >= 0 ? `expires in ${mins}m` : `EXPIRED ${-mins}m ago`
        }`;
      } catch { /* leave as unreadable */ }
      const keyHash = createHash('sha256').update(k).digest('hex').slice(0, 8);
      let keyClaims = '';
      try {
        const kp = JSON.parse(Buffer.from(k.split('.')[1], 'base64url').toString());
        keyClaims = `, key role: ${kp.role || '?'}, key ref: ${kp.ref || '?'}`;
      } catch { /* not a decodable JWT */ }
      return res.status(401).json({
        error:
          `Invalid session — auth said: "${userError?.message || 'no user'}" ` +
          `(server key: ${kind}/${k.length}/#${keyHash}${keyClaims}, url: ${urlHost}, token: ${tokenInfo})`,
      });
    }

    if (memberId) {
      const { data: member } = await admin
        .from('family_members')
        .select('id, user_id, name, name_lang, name_phonetic')
        .eq('id', memberId)
        .maybeSingle();
      if (!member || member.user_id !== userData.user.id) {
        return res.status(404).json({ error: 'Member not found' });
      }
      const prefix = `${member.user_id}/family/${member.id}`;

      if (action === 'delete') {
        const files = await listFilesDeep(admin, prefix);
        if (files.length) {
          const { error } = await admin.storage.from(BUCKET).remove(files);
          if (error) {
            console.error('name-audio member delete failed:', error.message);
            await alertTelegram(error.message, 'name-audio member delete failed');
            return res.status(502).json({ error: 'Storage delete failed' });
          }
        }
        return res.status(200).json({ deleted: files.length });
      }

      // The phonetic spelling (when set) is what the voice READS — display
      // stays on `name`. Native-script spellings pin pronunciations that
      // Latin transliteration re-rolls on every generation (ନାନା vs Naana).
      const memberName = (member.name_phonetic || member.name)
        .trim()
        .slice(0, 30);
      if (!memberName) {
        return res.status(400).json({ error: 'Member has no name' });
      }
      // Same en=ElevenLabs / non-en=Gemini split as the child branch below,
      // but driven by the member's own name_lang
      const memberLocale = PRAISE_TIERS_BY_LOCALE[member.name_lang]
        ? member.name_lang
        : 'en';
      const memberGeminiKey = process.env.GEMINI_API_KEY;
      if (memberLocale !== 'en' && !memberGeminiKey) {
        return res.status(500).json({
          error: `GEMINI_API_KEY missing — needed for ${memberLocale} voice`,
        });
      }
      const memberExt = memberLocale === 'en' ? 'mp3' : 'wav';
      const audio =
        memberLocale === 'en'
          ? await ttsEleven(ELEVENLABS_API_KEY, memberName, {
              stability: 0.5,
              similarity_boost: 0.8,
              style: 0.3,
              speed: 1.0,
              use_speaker_boost: true,
            })
          : await ttsGemini(memberGeminiKey, memberLocale, memberName);
      const ts = `${Date.now()}`;
      const path = `${prefix}/${ts}/name.${memberExt}`;
      await upload(
        admin,
        path,
        audio,
        memberLocale === 'en' ? 'audio/mpeg' : 'audio/wav'
      );
      const { error: memberUpdateError } = await admin
        .from('family_members')
        .update({ name_audio_path: path, updated_at: new Date().toISOString() })
        .eq('id', member.id);
      if (memberUpdateError) {
        throw new Error(`Member update: ${memberUpdateError.message}`);
      }
      await cleanupOldVersions(admin, prefix, ts);
      return res.status(200).json({ path });
    }

    const { data: child } = await admin
      .from('child_profiles')
      .select('id, user_id, name, name_audio_path, settings')
      .eq('id', childId)
      .maybeSingle();
    if (!child || child.user_id !== userData.user.id) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const childPrefix = `${child.user_id}/${child.id}`;

    // The child's clips follow their app language; unknown locales fall
    // back to English rather than failing the whole request.
    const locale = PRAISE_TIERS_BY_LOCALE[child.settings?.language]
      ? child.settings.language
      : 'en';
    const geminiKey = process.env.GEMINI_API_KEY;
    if (locale !== 'en' && !geminiKey) {
      return res
        .status(500)
        .json({ error: `GEMINI_API_KEY missing — needed for ${locale} voice` });
    }
    // en keeps mp3 via ElevenLabs; other locales get WAV via Gemini
    const ext = locale === 'en' ? 'mp3' : 'wav';
    const contentType = locale === 'en' ? 'audio/mpeg' : 'audio/wav';
    const speakName = (text) =>
      locale === 'en'
        ? ttsEleven(ELEVENLABS_API_KEY, text, {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.3,
            speed: 1.0,
            use_speaker_boost: true,
          })
        : ttsGemini(geminiKey, locale, text);

    if (action === 'delete') {
      const files = await listFilesDeep(admin, childPrefix);
      if (files.length) {
        const { error } = await admin.storage.from(BUCKET).remove(files);
        if (error) {
          console.error('name-audio delete failed:', error.message);
          await alertTelegram(error.message, 'name-audio delete failed');
          return res.status(502).json({ error: 'Storage delete failed' });
        }
      }
      return res.status(200).json({ deleted: files.length });
    }

    const name = child.name.trim().slice(0, 30);
    if (!name) {
      return res.status(400).json({ error: 'Child has no name' });
    }

    const setPath = async (path) => {
      const { error } = await admin
        .from('child_profiles')
        .update({ name_audio_path: path, updated_at: new Date().toISOString() })
        .eq('id', child.id);
      if (error) throw new Error(`Profile update: ${error.message}`);
    };

    if (action === 'name') {
      // Neutral read of just the name — fast confirmation for the parent,
      // deliberately NOT a praise clip. NB: previous_text/next_text are
      // rejected by eleven_v3 (400 unsupported_model).
      const audio = await speakName(name);
      // Timestamped folder = every regeneration is a new URL (cache busting)
      const ts = `${Date.now()}`;
      const path = `${childPrefix}/${ts}/name.${ext}`;
      await upload(admin, path, audio, contentType);
      await setPath(path);
      await cleanupOldVersions(admin, childPrefix, ts);
      return res.status(200).json({ path });
    }

    // action === 'praise' — reuse the folder the name action just made so
    // the name clip and the praise clips version together; if the profile
    // is still on the legacy loose-mp3 format (self-heal without a
    // preceding name action), start a fresh folder and regenerate the name
    // clip too.
    let ts = child.name_audio_path?.match(
      new RegExp(`^${childPrefix}/(\\d+)/name\\.${ext}$`)
    )?.[1];
    if (!ts) {
      ts = `${Date.now()}`;
      const audio = await speakName(name);
      await upload(admin, `${childPrefix}/${ts}/name.${ext}`, audio, contentType);
    }
    const folder = `${childPrefix}/${ts}`;

    // Both providers cap concurrency around 2 — generate tier by tier
    // (each tier is exactly a batch of 2). `locale` and `neutral` let the
    // client skip wrong-language praise and find the neutral clip without
    // assuming its extension.
    const manifest = { name, locale, neutral: `name.${ext}`, tiers: {} };
    const praiseTiers = PRAISE_TIERS_BY_LOCALE[locale];
    for (let tier = 0; tier < praiseTiers.length; tier++) {
      const { speed, texts } = praiseTiers[tier];
      const files = texts.map((_, i) => `praise-${tier}-${i}.${ext}`);
      await Promise.all(
        texts.map(async (template, i) => {
          const text = template.replace('{name}', name);
          const audio =
            locale === 'en'
              ? await ttsEleven(ELEVENLABS_API_KEY, text, {
                  stability: 0.0,
                  similarity_boost: 0.8,
                  style: 1.0,
                  speed,
                  use_speaker_boost: true,
                })
              : await ttsGemini(geminiKey, locale, text);
          await upload(admin, `${folder}/${files[i]}`, audio, contentType);
        })
      );
      manifest.tiers[tier] = files;
    }

    const manifestPath = `${folder}/manifest.json`;
    await upload(
      admin,
      manifestPath,
      Buffer.from(JSON.stringify(manifest)),
      'application/json'
    );
    await setPath(manifestPath);
    await cleanupOldVersions(admin, childPrefix, ts);
    return res.status(200).json({ path: manifestPath });
  } catch (error) {
    console.error(`generate-name-audio ${action} error:`, error);
    // One budget per issue type (fingerprinted in telegram-alert.js), so a
    // quota storm collapses to 4 messages a day even across actions.
    // Awaited: Vercel may freeze the instance right after the response
    // goes out, killing a fire-and-forget send.
    await alertTelegram(error.message, `generate-name-audio ${action} error`);
    return res.status(502).json({ error: 'Voice generation failed' });
  }
}
