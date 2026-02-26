import { useCallback, useEffect, useRef } from 'react';

const toAudioKey = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const useSpeech = () => {
  const audioManifest = useRef(null);
  const currentAudio = useRef(null);
  const sequenceAbort = useRef(null);
  const manifestReady = useRef(null);

  useEffect(() => {
    manifestReady.current = fetch('/audio/words/manifest.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) audioManifest.current = new Set(data);
      })
      .catch(() => {});
  }, []);

  const stopCurrent = useCallback(() => {
    if (sequenceAbort.current) {
      sequenceAbort.current.abort();
      sequenceAbort.current = null;
    }
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
      currentAudio.current = null;
    }
  }, []);

  const playClip = useCallback((key) => {
    return new Promise((resolve) => {
      const audio = new Audio(`/audio/words/${key}.mp3`);
      currentAudio.current = audio;
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play().catch(resolve);
    });
  }, []);

  const playOne = useCallback(async (text) => {
    if (manifestReady.current) await manifestReady.current;
    const key = toAudioKey(text);
    if (audioManifest.current?.has(key)) return playClip(key);
  }, [playClip]);

  const speak = useCallback((text) => {
    if (!text) return;
    stopCurrent();
    playOne(text);
  }, [stopCurrent, playOne]);

  const speakSequence = useCallback((parts) => {
    if (!parts?.length) return;
    stopCurrent();

    const controller = new AbortController();
    sequenceAbort.current = controller;

    (async () => {
      for (const part of parts) {
        if (controller.signal.aborted) return;
        await playOne(part);
      }
    })();
  }, [stopCurrent, playOne]);

  const cancel = useCallback(() => {
    stopCurrent();
  }, [stopCurrent]);

  return { speak, speakSequence, cancel };
};

export default useSpeech;
