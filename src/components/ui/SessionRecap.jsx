import { useEffect, useMemo, useRef, useState } from 'react';
import useVoice from '../../hooks/useVoice';
import useChildSetting from '../../hooks/useChildSetting';
import { appendSticker, pickSticker, pickRecapLine } from '../../lib/stickers';
import { fixedLinePart } from '../../data/voiceLines';
import { useLocale } from '../../context/LocaleContext';
import { track } from '../../lib/analytics';

// End-of-session payoff, the lesson intro in reverse: where CategoryIntro's
// collage sits UNDER content that circle-reveals over it, this recap sits
// OVER the finished game and its own circle grows to cover it — a collage of
// what the child just saw (tiles built by lib/recapTiles or the caller),
// plus one sticker that persists on the per-child shelf (Home). Tap / right
// arrow dismisses back to the completion screen.

const TILE_TILTS = [-6, 4, -3, 7, -8, 5, -4, 6];

const tileBox = 'w-20 h-20 md:w-28 md:h-28';

const renderTile = (tile) => {
  if (tile.video) {
    return (
      <video
        src={`${tile.video}#t=0.1`}
        preload="metadata"
        muted
        playsInline
        className={`${tileBox} object-cover rounded-xl pointer-events-none`}
      />
    );
  }
  if (tile.images) {
    return (
      <div className="flex gap-1">
        {tile.images.map((src, j) => (
          <img
            key={j}
            src={src}
            alt=""
            className={`h-20 md:h-28 object-cover rounded-xl ${
              tile.images.length > 1 ? 'w-10 md:w-14' : 'w-20 md:w-28'
            }`}
          />
        ))}
      </div>
    );
  }
  if (tile.swatch) {
    return (
      <div
        className={`${tileBox} rounded-xl`}
        style={{
          backgroundColor: tile.swatch,
          border: tile.outlined ? '2px solid #e5e7eb' : undefined,
        }}
      />
    );
  }
  if (tile.svg) {
    return <div className={`${tileBox} flex items-center justify-center`}>{tile.svg}</div>;
  }
  return (
    <div className={`${tileBox} flex items-center justify-center`}>
      <span className="text-4xl md:text-5xl font-bold text-gray-700 uppercase">
        {tile.text}
        {tile.accent && <span className="text-orange-500">{tile.accent}</span>}
      </span>
    </div>
  );
};

const SessionRecap = ({ category, mode, tiles, onDone }) => {
  const { speak, cancel } = useVoice();
  const { t } = useLocale();
  const [stickersRaw, setStickersRaw] = useChildSetting('stickers', null);
  const reduceMotion = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );
  const [revealed, setRevealed] = useState(reduceMotion);
  const [sticker] = useState(pickSticker);
  const [line] = useState(() => fixedLinePart(pickRecapLine()));
  const awardedRef = useRef(false);
  const doneRef = useRef(false);

  // Grow the recap circle over the finished game. Double rAF: the closed
  // circle must actually paint once, or the browser never sees a start
  // state and the transition is skipped.
  useEffect(() => {
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setRevealed(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, []);

  // Award exactly once per completion — the ref survives StrictMode's
  // double-run, and the settings update re-rendering us must not re-award
  useEffect(() => {
    if (awardedRef.current) return;
    awardedRef.current = true;
    setStickersRaw(
      appendSticker(stickersRaw, {
        e: sticker,
        c: category,
        d: new Date().toISOString().slice(0, 10),
      })
    );
    track('sticker_earned', { category, mode, meta: { sticker } });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Speak after the reveal lands so the line arrives with the collage, not
  // over the last answer's praise clip
  useEffect(() => {
    const t = setTimeout(() => speak(line), 700);
    return () => {
      clearTimeout(t);
      cancel();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancel();
    onDone();
  };

  // Right arrow drives everything in this app — here it closes the recap
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="button"
      onClick={finish}
      aria-label={`${line.text} Tap to continue`}
      className="fixed inset-0 z-50 w-full h-full bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col items-center justify-center gap-5 md:gap-8 p-6 overflow-hidden cursor-pointer"
      style={{
        clipPath: revealed ? 'circle(75% at 50% 50%)' : 'circle(0% at 50% 50%)',
        transition: reduceMotion ? undefined : 'clip-path 700ms ease-in-out',
      }}
    >
      {/* Same scattered-polaroid language as the intro, now looking back */}
      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 max-w-3xl">
        {tiles.map((tile, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-lg p-1.5 md:p-2"
            style={{ transform: `rotate(${TILE_TILTS[i % TILE_TILTS.length]}deg)` }}
          >
            {renderTile(tile)}
          </div>
        ))}
      </div>

      <span className="flex flex-col items-center gap-2">
        <span className="recap-sticker text-7xl md:text-8xl drop-shadow-lg" aria-hidden="true">
          {sticker}
        </span>
        <span className="text-2xl md:text-4xl font-bold text-gray-800 text-center max-w-2xl leading-snug">
          {t('recap.sticker')}
        </span>
        <span className="text-sm md:text-base text-gray-500">
          {t('recap.tapHint')}
        </span>
      </span>
    </button>
  );
};

export default SessionRecap;
