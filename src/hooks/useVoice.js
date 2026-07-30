import { useCallback, useEffect, useRef } from 'react';
import useSpeech from './useSpeech';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAIL, hasRecording, getRecordingObjectUrl } from '../lib/recordings';
import { hasVoiceClip, getVoiceClipUrl } from '../lib/voice';
import { itemPart } from '../lib/voiceKeys';
import { getTtsLang } from '../lib/locale';
import { track } from '../lib/analytics';

// Speaks pre-generated voice clips with browser TTS as the fallback.
// speak() takes a part ({ key, text } from lib/voiceKeys.js), an array of
// parts (played back to back — how compound sentences avoid a clip per
// pairing), or a plain string (TTS only — dynamic text like family names
// has no pre-generated clip). Priority: parent recording (admin account
// only) → ElevenLabs clip → TTS, with an analytics event when a clip we
// expected to have doesn't play. Resolves when playback ends; never
// rejects, so feedback chains can't stall a game.
//
// Once clip audio starts being set up, TTS never stacks on top of it — a
// rejected play() stays silent (same rule as LetterSoundsView.jsx). TTS
// only runs when no clip bytes were reachable, i.e. when no audio ever
// started.
const useVoice = (recordingCategory = null) => {
  const { speak: tts, cancel: cancelTts } = useSpeech();
  const { user } = useAuth();
  // Recorded clips are the admin's own voice and accent — wrong for other
  // families (same gate as the old useRecordedAudio).
  const category = user?.email === ADMIN_EMAIL ? recordingCategory : null;
  const audioRef = useRef(null);
  const tokenRef = useRef(0);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      tokenRef.current += 1;
    };
  }, []);

  const playUrl = useCallback((url) => {
    return new Promise((resolve) => {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = resolve;
      audio.onerror = resolve;
      // Blocked autoplay stays silent rather than resolving into the TTS
      // path — resolve() here just keeps sequences moving.
      audio.play().catch(() => resolve());
    });
  }, []);

  const speak = useCallback(
    (partsIn, options = {}) => {
      const parts = (Array.isArray(partsIn) ? partsIn : [partsIn])
        .filter(Boolean)
        .map((p) => (typeof p === 'string' ? { text: p } : p));
      if (parts.length === 0) return Promise.resolve();

      audioRef.current?.pause();
      const token = ++tokenRef.current;
      // enqueue (ScrollView's mount announcement) queues TTS behind an
      // in-flight utterance instead of cutting it off
      if (!options.enqueue) cancelTts();

      const ttsRemaining = (fromIndex) => {
        if (tokenRef.current !== token) return Promise.resolve();
        const text = parts.slice(fromIndex).map((p) => p.text).join(' ');
        return tts(text, { lang: getTtsLang(), ...options });
      };

      return (async () => {
        // Parent recording wins for its category (phonics syllables)
        const recName = options.recordingName;
        if (recName && category && hasRecording(category, recName)) {
          const url = await getRecordingObjectUrl(category, recName);
          if (tokenRef.current !== token) return;
          if (url) await playUrl(url);
          else await ttsRemaining(0);
          return;
        }

        const missing = parts.find((p) => !p.key || !hasVoiceClip(p.key));
        if (missing) {
          if (missing.key) {
            track('voice_fallback', { item: missing.key, meta: { reason: 'missing' } });
          }
          await ttsRemaining(0);
          return;
        }

        for (let i = 0; i < parts.length; i++) {
          const url = await getVoiceClipUrl(parts[i].key);
          if (tokenRef.current !== token) return;
          if (!url) {
            track('voice_fallback', { item: parts[i].key, meta: { reason: 'unreachable' } });
            await ttsRemaining(i);
            return;
          }
          await playUrl(url);
          if (tokenRef.current !== token) return;
        }
      })();
    },
    [category, tts, cancelTts, playUrl]
  );

  // Item names: recording → items/<slug> clip → TTS. Takes a localized item
  // or a canonical-English string. Recordings are keyed by the raw ENGLISH
  // name (the admin recorded against English data), clips by its slug.
  const speakItem = useCallback(
    (item, options) => {
      const recName =
        typeof item === 'string' ? item : (item.enName ?? item.name);
      return speak(itemPart(item), { ...options, recordingName: recName });
    },
    [speak]
  );

  const cancel = useCallback(() => {
    tokenRef.current += 1;
    audioRef.current?.pause();
    cancelTts();
  }, [cancelTts]);

  return { speak, speakItem, cancel };
};

export default useVoice;
