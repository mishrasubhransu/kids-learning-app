import { useCallback, useEffect, useRef } from 'react';
import useSpeech from './useSpeech';
import { hasRecording, getRecordingObjectUrl } from '../lib/recordings';

// Speaks an item with the parent-recorded clip when one exists, browser TTS
// otherwise. Once a recording is chosen, TTS never stacks on top of it — a
// rejected play() stays silent (same rule as LetterSoundsView.jsx). TTS only
// runs as a late fallback when the clip's bytes turn out to be unreachable
// (no cache and no network), i.e. when no audio ever started.
//
// speakItem returns { kind: 'audio', audio } or { kind: 'tts', utterance } so
// callers that need an "ended" signal (autoplay) can attach to either.
const useRecordedAudio = (category) => {
  const { speak, cancel } = useSpeech();
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
