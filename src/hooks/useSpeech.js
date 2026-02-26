import { useCallback, useEffect, useRef, useState } from 'react';

const toAudioKey = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const useSpeech = () => {
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const audioManifest = useRef(null);
  const currentAudio = useRef(null);
  const sequenceAbort = useRef(null);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) setVoicesLoaded(true);
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    fetch('/audio/words/manifest.json')
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
    window.speechSynthesis.cancel();
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

  const speakBrowserTTS = useCallback((text) => {
    return new Promise((resolve) => {
      window.speechSynthesis.getVoices();
      const normalizedText = /^[A-Z]$/.test(text) ? text.toLowerCase() : text;
      const utterance = new SpeechSynthesisUtterance(normalizedText);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.lang = 'en-US';
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = voices.find((v) => v.lang.startsWith('en') && v.localService);
      if (englishVoice) utterance.voice = englishVoice;
      utterance.onend = resolve;
      utterance.onerror = resolve;
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const playOne = useCallback((text) => {
    const key = toAudioKey(text);
    if (audioManifest.current?.has(key)) return playClip(key);
    return speakBrowserTTS(text);
  }, [playClip, speakBrowserTTS]);

  const speak = useCallback((text) => {
    if (!text) return;
    stopCurrent();
    playOne(text);
  }, [stopCurrent, playOne]);

  // Play an array of text parts back-to-back, e.g. ['Which one is', 'Lion']
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

  return { speak, speakSequence, cancel, voicesLoaded };
};

export default useSpeech;
