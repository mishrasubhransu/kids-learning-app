import { useCallback, useEffect, useRef, useState } from 'react';
import useSpeech from '../../hooks/useSpeech';
import { pickIntro, stripAudioTags } from '../../data/intros';
import { getSpeechLocale, getTtsLang } from '../../lib/locale';
import { getVoiceClipUrl } from '../../lib/voice';

// Full-screen intro shown when a lesson opens: a collage of the lesson's own
// assets while a pre-generated clip says the intro line ("Let's learn about
// animals!"). The lesson content sits on top clipped to a zero-size circle;
// onReveal tells the parent to grow it (the window-reveal transition). Auto
// advances ~0.5 s after the line ends; any tap / right arrow skips. Never
// blocks: missing clip falls back to TTS, and a hard timer reveals anyway.

const TILE_TILTS = [-6, 4, -3, 7, -8, 5, -4, 6];

const CategoryIntro = ({ categoryKey, title, emoji, tiles, onReveal }) => {
  const { speak, cancel } = useSpeech();
  const [line] = useState(() => pickIntro(categoryKey, title));
  const doneRef = useRef(false);
  const spokeFallback = useRef(false);
  const audioRef = useRef(null);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    audioRef.current?.pause();
    cancel();
    onReveal();
  }, [cancel, onReveal]);

  // No StrictMode guard here on purpose: the cleanup fully undoes the run
  // (pause + clear timers), so dev's double-invoke just restarts the clip
  // before it audibly plays. Handlers check audioRef so the torn-down run's
  // late play() rejection can't trigger the TTS fallback over the new clip.
  useEffect(() => {
    const timers = [];
    const after = (ms, fn) => timers.push(setTimeout(fn, ms));
    const lineEnded = () => after(500, finish);
    // English intro clips ship as static files; other locales keep theirs in
    // the voice bucket (intros/<key>/<i>, cache-first) — the URL resolves
    // async, so the clip starts silent-src and gets its source when known.
    // Speech locale = app locale everywhere except a fixed-language lesson
    // (Indian Food), whose intro clip plays in its pinned language while the
    // screen text (and the TTS fallback) stay in the app language.
    const locale = getSpeechLocale();
    const clip = new Audio();
    let cancelled = false;
    // Clip missing (not generated yet) or blocked: same line via TTS. Both
    // the element's error event and a rejected play() can report the same
    // failure — speak only once.
    const speakFallback = () => {
      if (audioRef.current !== clip || spokeFallback.current || doneRef.current) {
        return;
      }
      spokeFallback.current = true;
      speak(stripAudioTags(line.text), { lang: getTtsLang() }).then(lineEnded);
    };
    audioRef.current = clip;
    clip.onended = lineEnded;
    clip.onerror = speakFallback;
    if (locale === 'en') {
      clip.src = `/audio/intros/${categoryKey}/${line.index}.mp3`;
      clip.play().catch(speakFallback);
    } else {
      getVoiceClipUrl(`intros/${categoryKey}/${line.index}`).then((url) => {
        if (cancelled) return;
        if (!url) {
          speakFallback();
          return;
        }
        clip.src = url;
        clip.play().catch(speakFallback);
      });
    }
    after(8000, finish); // whatever happens, never hold the lesson hostage
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      clip.pause();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Right arrow drives everything in this app — here it skips the intro
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  return (
    <button
      type="button"
      onClick={finish}
      aria-label={`${stripAudioTags(line.text)} Tap to start`}
      className="absolute inset-0 w-full h-full bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col items-center justify-center gap-6 md:gap-10 p-6 overflow-hidden cursor-pointer"
    >
      {/* Scattered polaroid collage of the lesson's own assets. Videos show
          their first frame (#t=0.1 forces browsers to paint one); pair tiles
          (opposites) put both sides in one frame; emoji tiles (addition)
          have no image assets at all. */}
      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 max-w-3xl">
        {tiles.map((tile, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-lg p-1.5 md:p-2"
            style={{ transform: `rotate(${TILE_TILTS[i % TILE_TILTS.length]}deg)` }}
          >
            {tile.emoji ? (
              <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center text-4xl md:text-5xl font-black text-gray-700 leading-none">
                {tile.emoji}
              </div>
            ) : tile.video ? (
              <video
                src={`${tile.video}#t=0.1`}
                preload="metadata"
                muted
                playsInline
                className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-xl pointer-events-none"
              />
            ) : (
              <div className="flex gap-1">
                {tile.images.map((src, j) => (
                  <img
                    key={j}
                    src={src}
                    alt=""
                    className={`h-24 md:h-32 object-cover rounded-xl ${
                      tile.images.length > 1 ? 'w-12 md:w-16' : 'w-24 md:w-32'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <span className="flex flex-col items-center gap-2">
        {emoji && (
          <span className="text-5xl md:text-6xl" aria-hidden="true">
            {emoji}
          </span>
        )}
        <span className="text-2xl md:text-4xl font-bold text-gray-800 text-center max-w-2xl leading-snug">
          {stripAudioTags(line.text)}
        </span>
      </span>
    </button>
  );
};

export default CategoryIntro;
