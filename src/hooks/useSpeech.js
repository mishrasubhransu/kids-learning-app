import { useCallback, useEffect, useRef, useState } from 'react';

const toAudioKey = (text) => text.toLowerCase().replace(/\s+/g, '-');

export const useSpeech = () => {
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const audioManifest = useRef(null);
  const currentAudio = useRef(null);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) setVoicesLoaded(true);
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // Load manifest of pre-generated ElevenLabs word clips
  useEffect(() => {
    fetch('/audio/words/manifest.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) audioManifest.current = new Set(data);
      })
      .catch(() => {});
  }, []);

  const stopCurrent = useCallback(() => {
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
      currentAudio.current = null;
    }
    window.speechSynthesis.cancel();
  }, []);

  const speakWithBrowserTTS = useCallback((text, options = {}) => {
    window.speechSynthesis.getVoices();

    // iOS/iPadOS speech synthesis says "capital A" for single uppercase letters
    const normalizedText = /^[A-Z]$/.test(text) ? text.toLowerCase() : text;

    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.rate = options.rate ?? 0.9;
    utterance.pitch = options.pitch ?? 1.1;
    utterance.volume = options.volume ?? 1;
    utterance.lang = options.lang ?? 'en-US';

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      (v) => v.lang.startsWith('en') && v.localService
    );
    if (englishVoice) utterance.voice = englishVoice;

    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback((text, options = {}) => {
    if (!text) return;
    stopCurrent();

    const key = toAudioKey(text);

    if (audioManifest.current?.has(key)) {
      const audio = new Audio(`/audio/words/${key}.mp3`);
      currentAudio.current = audio;
      audio.play().catch(() => speakWithBrowserTTS(text, options));
      return;
    }

    speakWithBrowserTTS(text, options);
  }, [stopCurrent, speakWithBrowserTTS]);

  const cancel = useCallback(() => {
    stopCurrent();
  }, [stopCurrent]);

  return { speak, cancel, voicesLoaded };
};

export default useSpeech;
