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

  // Resolves when the utterance finishes (or errors/gets cancelled), so
  // callers can sequence audio without stacking clips.
  const speak = useCallback((text, options = {}) => {
    if (!text) return Promise.resolve();

    // Cancel any ongoing speech — unless the caller wants to queue behind it
    // (speechSynthesis plays queued utterances back to back natively)
    if (!options.enqueue) {
      window.speechSynthesis.cancel();
    }

    // Chrome bug workaround: speech synthesis can get "stuck"
    // This unsticks it by calling getVoices
    window.speechSynthesis.getVoices();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate ?? 0.9; // Slower for kids
    utterance.pitch = options.pitch ?? 1.1; // Cheerful pitch
    utterance.volume = options.volume ?? 1;
    const lang = options.lang ?? 'en-US';
    utterance.lang = lang;

    // The user-selected voice only applies when it can actually speak the
    // requested language (a stored English voice mangling Spanish is worse
    // than the browser's default); otherwise auto-pick by language prefix,
    // preferring on-device voices.
    const voices = window.speechSynthesis.getVoices();
    const storedURI = localStorage.getItem(VOICE_STORAGE_KEY);
    const langPrefix = lang.slice(0, 2);
    const stored = storedURI && voices.find((v) => v.voiceURI === storedURI);

    if (stored && stored.lang.startsWith(langPrefix)) {
      utterance.voice = stored;
    } else {
      const match =
        voices.find((v) => v.lang.startsWith(langPrefix) && v.localService) ||
        voices.find((v) => v.lang.startsWith(langPrefix));
      if (match) {
        utterance.voice = match;
      }
    }

    // Debug logging (can remove later)
    console.log('Speaking:', text);

    return new Promise((resolve) => {
      utterance.onend = resolve;
      utterance.onerror = resolve;
      window.speechSynthesis.speak(utterance);
    });
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
