/* global process, Buffer */
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// Generates a short ElevenLabs clip of a child's name (same voice as the
// prerecorded praise clips) and stores it in the name-audio bucket. The
// client sends ONLY a childId — the text sent to ElevenLabs comes from the
// child_profiles row, never from the request, so this can't be abused as a
// general TTS proxy for our API key.

const VOICE_ID = 'FGY2WhTYpPnrIDTdsKH5'; // Laura — matches public/audio praise clips
const MODEL_ID = 'eleven_v3';

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

  const { childId } = req.body || {};
  if (!childId || typeof childId !== 'string') {
    return res.status(400).json({ error: 'childId is required' });
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
      .select('id, user_id, name')
      .eq('id', childId)
      .maybeSingle();
    if (!child || child.user_id !== userData.user.id) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const name = child.name.trim().slice(0, 30);
    if (!name) {
      return res.status(400).json({ error: 'Child has no name' });
    }

    // Neutral read of just the name — confirmation for the parent that the
    // name is recorded, not a praise clip. Personalized praise phrases are
    // a planned follow-up (see CUSTOM_PRAISE_PLAN.md). NB: previous_text/
    // next_text are rejected by eleven_v3 (400 unsupported_model).
    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: name,
          model_id: MODEL_ID,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.3,
            speed: 1.0,
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!ttsRes.ok) {
      console.error('ElevenLabs error:', ttsRes.status, await ttsRes.text());
      return res.status(502).json({ error: 'Voice generation failed' });
    }
    const audio = Buffer.from(await ttsRes.arrayBuffer());

    // Timestamped path = every regeneration is a new URL (cache busting)
    const path = `${child.user_id}/${child.id}/${Date.now()}.mp3`;
    const { error: uploadError } = await admin.storage
      .from('name-audio')
      .upload(path, audio, { contentType: 'audio/mpeg', upsert: true });
    if (uploadError) {
      console.error('Upload error:', uploadError.message);
      return res.status(502).json({ error: 'Upload failed' });
    }

    const { error: updateError } = await admin
      .from('child_profiles')
      .update({ name_audio_path: path, updated_at: new Date().toISOString() })
      .eq('id', child.id);
    if (updateError) {
      console.error('Profile update error:', updateError.message);
      return res.status(502).json({ error: 'Profile update failed' });
    }

    return res.status(200).json({ path });
  } catch (error) {
    console.error('generate-name-audio error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
