import { useCallback, useEffect, useRef } from 'react';
import { positiveTiers, encouragement, getTierForCount } from '../utils/feedback';
import useSpeech from './useSpeech';

const TIER_COUNT = positiveTiers.length;
const PHRASES_PER_TIER = positiveTiers[0].length;
const ENCOURAGEMENT_COUNT = encouragement.length;

/**
 * Plays pre-generated ElevenLabs audio clips for test feedback.
 * Positive clips are tiered by correct-answer count — excitement escalates.
 * Falls back to Web Speech API if clips aren't available.
 */
const pickAvoiding = (count, recent) => {
  let idx;
  let attempts = 0;
  do {
    idx = Math.floor(Math.random() * count);
    attempts++;
  } while (recent.includes(idx) && attempts < 10);
  recent.push(idx);
  if (recent.length > 2) recent.shift();
  return idx;
};

const useAudioFeedback = () => {
  const positiveAudio = useRef([]);
  const encouragementAudio = useRef([]);
  const audioAvailable = useRef(false);
  const recentPositive = useRef([]);
  const recentEncouragement = useRef([]);
  const { speak } = useSpeech();

  useEffect(() => {
    let cancelled = false;

    const preload = async () => {
      try {
        const testRes = await fetch('/audio/positive/tier0/0.mp3', { method: 'HEAD' });
        if (!testRes.ok) return;

        for (let tier = 0; tier < TIER_COUNT; tier++) {
          positiveAudio.current[tier] = [];
          for (let i = 0; i < PHRASES_PER_TIER; i++) {
            if (cancelled) return;
            const audio = new Audio(`/audio/positive/tier${tier}/${i}.mp3`);
            audio.preload = 'auto';
            positiveAudio.current[tier][i] = audio;
          }
        }
        for (let i = 0; i < ENCOURAGEMENT_COUNT; i++) {
          if (cancelled) return;
          const audio = new Audio(`/audio/encouragement/${i}.mp3`);
          audio.preload = 'auto';
          encouragementAudio.current[i] = audio;
        }
        audioAvailable.current = true;
      } catch {
        audioAvailable.current = false;
      }
    };

    preload();
    return () => { cancelled = true; };
  }, []);

  const playClip = useCallback((clip) => {
    return new Promise((resolve) => {
      clip.currentTime = 0;
      clip.onended = resolve;
      clip.onerror = resolve;
      clip.play().catch(resolve);
    });
  }, []);

  const playPositive = useCallback((correctCount = 1) => {
    const tier = getTierForCount(correctCount);
    const idx = pickAvoiding(PHRASES_PER_TIER, recentPositive.current);

    if (audioAvailable.current && positiveAudio.current[tier]?.[idx]) {
      return playClip(positiveAudio.current[tier][idx]);
    }
    speak(positiveTiers[tier][idx]);
    return Promise.resolve();
  }, [playClip, speak]);

  const playEncouragement = useCallback(() => {
    const idx = pickAvoiding(ENCOURAGEMENT_COUNT, recentEncouragement.current);
    if (audioAvailable.current && encouragementAudio.current[idx]) {
      return playClip(encouragementAudio.current[idx]);
    }
    speak(encouragement[idx]);
    return Promise.resolve();
  }, [playClip, speak]);

  return { playPositive, playEncouragement };
};

export default useAudioFeedback;
