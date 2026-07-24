import { useCallback, useEffect, useRef } from 'react';
import useSpeech from './useSpeech';
import { useAuth } from '../context/AuthContext';
import { ADMIN_EMAIL, hasRecording, getRecordingObjectUrl } from '../lib/recordings';

// Speaks an item with the parent-recorded clip when one exists, browser TTS
// otherwise. Once a recording is chosen, TTS never stacks on top of it — a
// rejected play() stays silent (same rule as LetterSoundsView.jsx). TTS only
// runs as a late fallback when the clip's bytes turn out to be unreachable
// (no cache and no network), i.e. when no audio ever started.
//
// speakItem returns { kind: 'audio', audio } or { kind: 'tts', utterance } so
// callers that need an "ended" signal (autoplay) can attach to either.
const useRecordedAudio = (rawCategory) => {
  const { speak, cancel } = useSpeech();
  const { user } = useAuth();
  // Recorded clips are the admin's own voice and accent. Other families hear
  // TTS in their device's locale instead — syllable pronunciation differs by
  // region, and a stranger's accent would be wrong for many of them.
  const category = user?.email === ADMIN_EMAIL ? rawCategory : null;
  const audioRef = useRef(null);
  const tokenRef = useRef(0);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      tokenRef.current += 1;
    };
  }, []);

  const speakItem = useCallback(
    (name) => {
      audioRef.current?.pause();
      const token = ++tokenRef.current;
      if (category && hasRecording(category, name)) {
        cancel();
        const audio = new Audio();
        audioRef.current = audio;
        getRecordingObjectUrl(category, name).then((url) => {
          if (tokenRef.current !== token) return; // superseded by a newer item
          if (!url) {
            speak(name);
            return;
          }
          audio.src = url;
          audio.play().catch(() => {});
        });
        return { kind: 'audio', audio };
      }
      return { kind: 'tts', utterance: speak(name) };
    },
    [category, speak, cancel]
  );

  return { speakItem };
};

export default useRecordedAudio;
