import { useCallback, useEffect, useState } from 'react';

export const useSpeech = () => {
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  // Wait for voices to be loaded (required for some browsers)
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setVoicesLoaded(true);
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

    // Try to use a good English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(
      (v) => v.lang.startsWith('en') && v.localService
    );
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    // Debug logging (can remove later)
    console.log('Speaking:', text);

    window.speechSynthesis.speak(utterance);

    return utterance;
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  return { speak, cancel, voicesLoaded };
};

export default useSpeech;
