import { useCallback, useEffect, useRef } from 'react';
import { positiveTiers, encouragement, getTierForCount } from '../utils/feedback';
import useSpeech from './useSpeech';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLocale } from '../context/LocaleContext';
import { getPack, getTtsLang } from '../lib/locale';
import {
  isPraiseManifest,
  loadPraiseClips,
  playClipUrl,
  resolveNameAudioPath,
} from '../lib/nameAudio';
import { hasVoiceClip, getVoiceClipUrl } from '../lib/voice';

/**
 * Plays pre-generated audio clips for test feedback. Positive clips are
 * tiered by correct-answer count — excitement escalates. Falls back to Web
 * Speech API if clips aren't available.
 *
 * English clips are static files under public/audio; other locales keep
 * theirs in the voice bucket (feedback/positive/tier<t>/<i>,
 * feedback/encouragement/<i>) with the phrase lists coming from the locale
 * pack — counts may differ per language.
 *
 * When the active child has personalized praise clips ("Great job, Aarav!"),
 * the first praise of a game uses one, then ~1-in-3 — stock clips otherwise.
 * Personalized clips only play when they were generated in the active
 * language (manifest.locale, absent = en). Encouragement stays name-free on
 * purpose (a name there reads as scolding).
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
  const { locale } = useLocale();
  const soundsOff = activeChild?.settings?.soundEffects === false;
  const nameOff = activeChild?.settings?.useNameInPraise === false;
  // Clips are cached per locale; the app locale IS the child's language
  // (LocaleContext), so this picks the set that matches what's on screen.
  const clipPath = resolveNameAudioPath(activeChild, locale);
  const manifestPath = !nameOff && isPraiseManifest(clipPath) ? clipPath : null;

  const packFeedback = getPack()?.feedback;
  const tiers = packFeedback?.positiveTiers ?? positiveTiers;
  const encouragements = packFeedback?.encouragement ?? encouragement;

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
      // Wrong-language praise ("¡Muy bien!" game, "Great job, Aarav!" clip)
      // is worse than none — keep stock clips until regeneration catches up
      if (!cancelled && clips && (clips.locale ?? 'en') === locale) {
        praiseClips.current = clips;
      }
    });
    return () => {
      cancelled = true;
    };
  }, [manifestPath, locale]);

  // English static files, preloaded once (locale switches don't need them
  // re-probed; non-en locales stream from the voice bucket cache instead)
  useEffect(() => {
    let cancelled = false;

    const preload = async () => {
      try {
        const testRes = await fetch('/audio/positive/tier0/0.mp3', { method: 'HEAD' });
        if (!testRes.ok) return;

        for (let tier = 0; tier < positiveTiers.length; tier++) {
          positiveAudio.current[tier] = [];
          for (let i = 0; i < positiveTiers[tier].length; i++) {
            if (cancelled) return;
            const audio = new Audio(`/audio/positive/tier${tier}/${i}.mp3`);
            audio.preload = 'auto';
            positiveAudio.current[tier][i] = audio;
          }
        }
        for (let i = 0; i < encouragement.length; i++) {
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

  // Non-en stock feedback lives in the voice bucket; resolves false when the
  // clip isn't there so the caller falls through to TTS.
  const playBucketClip = useCallback(async (key) => {
    if (!hasVoiceClip(key)) return false;
    const url = await getVoiceClipUrl(key);
    if (!url) return false;
    await new Promise((resolve) => {
      const audio = new Audio(url);
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play().catch(resolve);
    });
    return true;
  }, []);

  const playPositive = useCallback(async (correctCount = 1) => {
    if (soundsOff) return;
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

    const idx = pickAvoiding(tiers[tier].length, recentPositive.current);
    if (locale === 'en') {
      if (audioAvailable.current && positiveAudio.current[tier]?.[idx]) {
        return playClip(positiveAudio.current[tier][idx]);
      }
    } else if (await playBucketClip(`feedback/positive/tier${tier}/${idx}`)) {
      return;
    }
    return speak(tiers[tier][idx], { lang: getTtsLang() });
  }, [playClip, playBucketClip, speak, soundsOff, locale, tiers]);

  const playEncouragement = useCallback(async () => {
    if (soundsOff) return;
    const idx = pickAvoiding(encouragements.length, recentEncouragement.current);
    if (locale === 'en') {
      if (audioAvailable.current && encouragementAudio.current[idx]) {
        return playClip(encouragementAudio.current[idx]);
      }
    } else if (await playBucketClip(`feedback/encouragement/${idx}`)) {
      return;
    }
    return speak(encouragements[idx], { lang: getTtsLang() });
  }, [playClip, playBucketClip, speak, soundsOff, locale, encouragements]);

  return { playPositive, playEncouragement };
};

export default useAudioFeedback;
