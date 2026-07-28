/* global process, Buffer */
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

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

const BUCKET = 'name-audio';
const VOICE_ID = 'FGY2WhTYpPnrIDTdsKH5'; // Laura — matches public/audio praise clips
const MODEL_ID = 'eleven_v3';

// Hand-written so the name sits naturally; audio tags + per-tier speeds
// mirror scripts/generate-audio.mjs (v3 stability 0.0 = Creative).
const PRAISE_TIERS = [
  { speed: 1.0, texts: ['Good job, {name}!', 'Well done, {name}!'] },
  { speed: 1.05, texts: ['Ooh, great work, {name}!', 'Awesome, {name}, way to go!'] },
  { speed: 1.1, texts: ['[laughs] Wow, amazing, {name}!', '[gasps] Look at you go, {name}!'] },
  { speed: 1.1, texts: ["[gasps] {name}, you're a genius!", '{name}, you are a superstar! [laughs]'] },
];

const tts = async (apiKey, text, voiceSettings) => {
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

  const { childId, action = 'name' } = req.body || {};
  if (!childId || typeof childId !== 'string') {
    return res.status(400).json({ error: 'childId is required' });
  }
  if (!['name', 'praise', 'delete'].includes(action)) {
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

    const { data: child } = await admin
      .from('child_profiles')
      .select('id, user_id, name, name_audio_path')
      .eq('id', childId)
      .maybeSingle();
    if (!child || child.user_id !== userData.user.id) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const childPrefix = `${child.user_id}/${child.id}`;

    if (action === 'delete') {
      const files = await listFilesDeep(admin, childPrefix);
      if (files.length) {
        const { error } = await admin.storage.from(BUCKET).remove(files);
        if (error) {
          console.error('name-audio delete failed:', error.message);
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
      const audio = await tts(ELEVENLABS_API_KEY, name, {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.3,
        speed: 1.0,
        use_speaker_boost: true,
      });
      // Timestamped folder = every regeneration is a new URL (cache busting)
      const ts = `${Date.now()}`;
      const path = `${childPrefix}/${ts}/name.mp3`;
      await upload(admin, path, audio, 'audio/mpeg');
      await setPath(path);
      await cleanupOldVersions(admin, childPrefix, ts);
      return res.status(200).json({ path });
    }

    // action === 'praise' — reuse the folder the name action just made so
    // name.mp3 and the praise clips version together; if the profile is
    // still on the legacy loose-mp3 format (self-heal without a preceding
    // name action), start a fresh folder and regenerate the name clip too.
    let ts = child.name_audio_path?.match(
      new RegExp(`^${childPrefix}/(\\d+)/name\\.mp3$`)
    )?.[1];
    if (!ts) {
      ts = `${Date.now()}`;
      const audio = await tts(ELEVENLABS_API_KEY, name, {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.3,
        speed: 1.0,
        use_speaker_boost: true,
      });
      await upload(admin, `${childPrefix}/${ts}/name.mp3`, audio, 'audio/mpeg');
    }
    const folder = `${childPrefix}/${ts}`;

    // Free tier allows 2 concurrent requests — generate tier by tier
    // (each tier is exactly a batch of 2).
    const manifest = { name, tiers: {} };
    for (let tier = 0; tier < PRAISE_TIERS.length; tier++) {
      const { speed, texts } = PRAISE_TIERS[tier];
      const files = texts.map((_, i) => `praise-${tier}-${i}.mp3`);
      await Promise.all(
        texts.map(async (template, i) => {
          const audio = await tts(
            ELEVENLABS_API_KEY,
            template.replace('{name}', name),
            {
              stability: 0.0,
              similarity_boost: 0.8,
              style: 1.0,
              speed,
              use_speaker_boost: true,
            }
          );
          await upload(admin, `${folder}/${files[i]}`, audio, 'audio/mpeg');
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
    return res.status(502).json({ error: 'Voice generation failed' });
  }
}
