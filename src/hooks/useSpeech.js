import { useCallback, useEffect, useState } from 'react';

const VOICE_STORAGE_KEY = 'preferred-voice-uri';

export const useSpeech = () => {
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURIState] = useState(
    () => localStorage.getItem(VOICE_STORAGE_KEY) || ''
  );

  // Wait for voices to be loaded (required for some browsers)
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
        setAvailableVoices(englishVoices);
        setVoicesLoaded(true);

        // Validate stored preference still exists
        const stored = localStorage.getItem(VOICE_STORAGE_KEY);
        if (stored && !voices.find((v) => v.voiceURI === stored)) {
          localStorage.removeItem(VOICE_STORAGE_KEY);
          setSelectedVoiceURIState('');
        }
      }
    };

    // Try to load immediately
    loadVoices();

    // Also listen for the voiceschanged event (Chrome needs this)
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  const setSelectedVoiceURI = useCallback((uri) => {
    if (uri) {
      localStorage.setItem(VOICE_STORAGE_KEY, uri);
    } else {
      localStorage.removeItem(VOICE_STORAGE_KEY);
    }
    setSelectedVoiceURIState(uri);
  }, []);

  const speak = useCallback((text, options = {}) => {
    if (!text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Chrome bug workaround: speech synthesis can get "stuck"
    // This unsticks it by calling getVoices
    window.speechSynthesis.getVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 0.9; // Slower for kids
    utterance.pitch = options.pitch ?? 1.1; // Cheerful pitch
    utterance.volume = options.volume ?? 1;
    utterance.lang = options.lang ?? 'en-US';

    // Try to use the user-selected voice, or fall back to auto-select
    const voices = window.speechSynthesis.getVoices();
    const storedURI = localStorage.getItem(VOICE_STORAGE_KEY);

    if (storedURI) {
      const preferred = voices.find((v) => v.voiceURI === storedURI);
      if (preferred) {
        utterance.voice = preferred;
      }
    } else {
      const englishVoice = voices.find(
        (v) => v.lang.startsWith('en') && v.localService
      );
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
    }

    // Debug logging (can remove later)
    console.log('Speaking:', text);

    window.speechSynthesis.speak(utterance);

    return utterance;
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  return {
    speak,
    cancel,
    voicesLoaded,
    availableVoices,
    selectedVoiceURI,
    setSelectedVoiceURI,
  };
};

export default useSpeech;
