/* global process */
import { createClient } from '@supabase/supabase-js';
import { alertTelegram } from './_lib/telegram-alert.js';

// Suggests a phonetic spelling for a family member's name in the script of
// their voice language ("Gudlu Kaka" + or → ଗୁଡ଼ଲୁ କାକା) — the member editor
// auto-fills "Spelling for the voice" with it when the parent picks a
// non-Latin language. A SUGGESTION only: the parent edits or overrides it
// before saving, and only the saved value ever reaches TTS.
//
// Unlike generate-name-audio this must accept raw text (the member may not
// be saved yet), so it's gated hard: signed-in users only, 40-char cap,
// allowlisted target languages, text out only.

const MODEL = 'gemini-2.5-flash';

const PROMPTS = {
  or: (text, relation) =>
    'You transliterate family nicknames from Latin script into Odia script ' +
    'for a text-to-speech system. Write the name phonetically in Odia, the ' +
    'way an Odia-speaking parent would spell how it is SAID — for example ' +
    '"Naana" becomes ନାନା, "Jeje Bapa" becomes ଜେଜେ ବାପା. Spell out every ' +
    // Nicknames voice their final vowel — without this the model applies
    // schwa deletion and "Piyusa" comes back as ପିଉସ ("Piyus")
    'vowel exactly as the Latin spelling says it, including a final a — ' +
    '"Piyusa" becomes ପିଉସା, never ପିଉସ. Keep the same number of words. ' +
    (relation
      ? `The person is the child's ${relation}. If part of the name is a ` +
        "nickname form of the Odia kinship word for that relation, prefer " +
        'that word\'s standard Odia spelling; if the name has no close ' +
        'match to the kinship word, ignore the relation entirely. '
      : '') +
    'Reply with ONLY the Odia spelling, nothing else.' +
    `\n\nName: ${text}`,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!GEMINI_API_KEY || !SUPABASE_SERVICE_ROLE_KEY || !supabaseUrl) {
    return res.status(500).json({ error: 'Transliteration not configured' });
  }

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Not signed in' });
  }

  const { text, lang, relation } = req.body || {};
  const name = typeof text === 'string' ? text.trim().slice(0, 40) : '';
  // Relation is optional disambiguation context ("Grandma (Mum's side)")
  const relationCtx =
    typeof relation === 'string' ? relation.trim().slice(0, 60) : '';
  if (!name || !PROMPTS[lang]) {
    return res.status(400).json({ error: 'text and a supported lang required' });
  }

  try {
    const admin = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': GEMINI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPTS[lang](name, relationCtx) }] }],
          generationConfig: { temperature: 0 },
        }),
      }
    );
    if (!resp.ok) {
      throw new Error(`Gemini ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    }
    const data = await resp.json();
    // First line only, hard length cap — a chatty model response is a
    // failure, not a suggestion
    const phonetic = data.candidates?.[0]?.content?.parts?.[0]?.text
      ?.trim()
      .split('\n')[0]
      .trim();
    if (!phonetic || phonetic.length > 60) {
      throw new Error('Gemini: no usable transliteration in response');
    }
    return res.status(200).json({ phonetic });
  } catch (error) {
    console.error('transliterate-name error:', error);
    await alertTelegram(error.message, 'transliterate-name error');
    return res.status(502).json({ error: 'Transliteration failed' });
  }
}
