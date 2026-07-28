import { useCallback, useEffect, useRef } from 'react';
import { positiveTiers, encouragement, getTierForCount } from '../utils/feedback';
import useSpeech from './useSpeech';
import { useChildProfile } from '../context/ChildProfileContext';
import { isPraiseManifest, loadPraiseClips, playClipUrl } from '../lib/nameAudio';

const TIER_COUNT = positiveTiers.length;
const PHRASES_PER_TIER = positiveTiers[0].length;
const ENCOURAGEMENT_COUNT = encouragement.length;

/**
 * Plays pre-generated ElevenLabs audio clips for test feedback.
 * Positive clips are tiered by correct-answer count — excitement escalates.
 * Falls back to Web Speech API if clips aren't available.
 * When the active child has personalized praise clips ("Great job, Aarav!"),
 * the first praise of a game uses one, then ~1-in-3 — stock clips otherwise.
 * Encouragement stays name-free on purpose (a name there reads as scolding).
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
  const { activeChild } = useChildProfile();
  const soundsOff = activeChild?.settings?.soundEffects === false;
  const nameOff = activeChild?.settings?.useNameInPraise === false;
  const manifestPath =
    !nameOff && isPraiseManifest(activeChild?.name_audio_path)
      ? activeChild.name_audio_path
      : null;

  // Personalized praise: the manifest is tiny and cache-first (module-level
  // memo in nameAudio), the mp3s themselves are fetched on play. If loading
  // races the first praise, stock clips play — never a stall.
  const praiseClips = useRef(null);
  const firstPersonalPending = useRef(true);
  const lastPersonal = useRef(null);
  useEffect(() => {
    praiseClips.current = null;
    if (!manifestPath) return;
    let cancelled = false;
    loadPraiseClips(manifestPath).then((clips) => {
      if (!cancelled) praiseClips.current = clips;
    });
    return () => {
      cancelled = true;
    };
  }, [manifestPath]);

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
    if (soundsOff) return Promise.resolve();
    const tier = getTierForCount(correctCount);

    // First praise of this game is personalized (guaranteed, once clips are
    // loaded), then roughly 1-in-3 — enough to delight, not enough to wear
    // the name out.
    const tierClips = praiseClips.current?.tiers?.[tier];
    if (tierClips?.length && (firstPersonalPending.current || Math.random() < 1 / 3)) {
      firstPersonalPending.current = false;
      // Never the same personalized clip twice in a row (each tier has 2,
      // so consecutive picks within a tier alternate). Stock clips already
      // avoid their recent picks via pickAvoiding.
      let idx = Math.floor(Math.random() * tierClips.length);
      if (tierClips.length > 1 && tierClips[idx] === lastPersonal.current) {
        idx = (idx + 1) % tierClips.length;
      }
      lastPersonal.current = tierClips[idx];
      return playClipUrl(tierClips[idx]);
    }

    const idx = pickAvoiding(PHRASES_PER_TIER, recentPositive.current);
    if (audioAvailable.current && positiveAudio.current[tier]?.[idx]) {
      return playClip(positiveAudio.current[tier][idx]);
    }
    speak(positiveTiers[tier][idx]);
    return Promise.resolve();
  }, [playClip, speak, soundsOff]);

  const playEncouragement = useCallback(() => {
    if (soundsOff) return Promise.resolve();
    const idx = pickAvoiding(ENCOURAGEMENT_COUNT, recentEncouragement.current);
    if (audioAvailable.current && encouragementAudio.current[idx]) {
      return playClip(encouragementAudio.current[idx]);
    }
    speak(encouragement[idx]);
    return Promise.resolve();
  }, [playClip, speak, soundsOff]);

  return { playPositive, playEncouragement };
};

export default useAudioFeedback;
