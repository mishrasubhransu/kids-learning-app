import { useState, useEffect, useCallback, useRef, useMemo, useSyncExternalStore } from 'react';
import { ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import HomeButton from '../ui/HomeButton';
import CategoryIntro from '../ui/CategoryIntro';
import Crate, { ObjectGlyph } from './Crate';
import useVoice from '../../hooks/useVoice';
import useAudioFeedback from '../../hooks/useAudioFeedback';
import useChildSetting from '../../hooks/useChildSetting';
import { useLocale } from '../../context/LocaleContext';
import { fixedLinePart } from '../../data/voiceLines';
import { itemPart } from '../../lib/voiceKeys';
import { preloadVoiceClips } from '../../lib/voice';
import { setScreenContext, track } from '../../lib/analytics';
import ownedByFocusedControl from '../../utils/ownedByFocusedControl';
import shuffle from '../../utils/shuffle';
import {
  additionObjects,
  additionSums,
  askSlug,
  answerSlug,
  LETS_COUNT_SLUG,
  DEFAULT_ADDITION_OBJECT,
  DEFAULT_ADDITION_MAX,
} from '../../data/addition';

// Addition by counting on. Each sum is one screen: two crates of objects
// with + between them, and an empty crate under = with a "?" for a label.
// The right arrow drives the whole thing (the only control the toddler
// uses): press once and the objects hop one at a time into the bottom
// crate — first from the left crate, then the right — each one counted
// aloud as it lifts off and leaving a faded ghost behind so the child can
// still see the 2 and the 3 inside the 5. The "?" ticks up as they land,
// the answer line and praise close it out, and the next press brings the
// next sum (wrapping around after the last). Left mirrors right step for
// step (done → ask → previous done).
//
// Phases: ask → counting → done. `flight` tracks the count: how many
// objects have landed and which one is in the air right now.

const FLIGHT_MS = 1400; // one hop — slow enough to follow with the eyes
const MIN_STEP_MS = 1700; // never count faster than this, clip or no clip
const ABSORB_MS = 500; // quiet beat after the answer before "next" opens
const MAX_HOLD_MS = 10000; // a stuck clip must never brick the arrow
const HOP_LIFT = 0.6; // fraction of the object size the arc rises

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Crate-centre spacing in crate widths (crate + symbol + gaps), for the
// shared-vanishing-point lean: outer crates in the row layout sit ±1 step
// from the centre one; the stacked layout has A and B a half step each
// side and the answer crate on the centre line.
const ROW_STEP = 1.45;
const STACK_STEP = 1.3;

// Landscape screens (tablets, laptops, phones on their side) put all three
// crates in one row — A + B = R reads left to right and the crates come out
// almost twice the size of the stacked layout; portrait stacks the answer
// crate under the sum.
const LANDSCAPE = '(orientation: landscape)';
const subscribeLandscape = (cb) => {
  const mq = window.matchMedia(LANDSCAPE);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const useLandscape = () =>
  useSyncExternalStore(subscribeLandscape, () => window.matchMedia(LANDSCAPE).matches, () => false);

// Easy first: sums climb by total, the order within a total shuffled so a
// second session doesn't replay the exact same sequence
const orderedSums = (max) => {
  const byTotal = new Map();
  additionSums(max).forEach((s) => {
    if (!byTotal.has(s.sum)) byTotal.set(s.sum, []);
    byTotal.get(s.sum).push(s);
  });
  return [...byTotal.values()].flatMap((group) => shuffle(group));
};

// Where an object sits: crate 'A' cells 0..a-1 hold objects 1..a, crate 'B'
// the rest; the result crate 'R' takes them in counting order.
const sourceOf = (k, a) => (k <= a ? ['A', k - 1] : ['B', k - a - 1]);

const AdditionPage = () => {
  const { t, locale } = useLocale();
  const row = useLandscape();
  const { speak, cancel } = useVoice();
  const { playPositive } = useAudioFeedback();
  const [maxSetting] = useChildSetting('additionMax', DEFAULT_ADDITION_MAX);
  const [objectKey] = useChildSetting('additionObject', DEFAULT_ADDITION_OBJECT);
  const object = additionObjects[objectKey] ?? additionObjects[DEFAULT_ADDITION_OBJECT];
  const max = Number(maxSetting) || Number(DEFAULT_ADDITION_MAX);
  const sums = useMemo(() => orderedSums(max), [max]);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('ask');
  const [flight, setFlight] = useState({ landed: 0, flying: null });
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  // Forward is closed while a line is still playing (and for the absorb
  // beat after the answer) — the child hears every question and answer
  // through. Left stays open: back is a correction. Ref for the key
  // handler, state for the button's look.
  const [isBusy, setIsBusy] = useState(false);
  const busyRef = useRef(false);
  const [introState, setIntroState] = useState('intro');

  const problem = sums[Math.min(index, sums.length - 1)];
  const { a, b, sum } = problem;

  // Every in-flight sequence checks this token; any navigation bumps it
  const runTokenRef = useRef(0);
  const sceneRef = useRef(null);
  const cellEls = useRef(new Map());
  const cooldownTimerRef = useRef(null);
  const isCoolingDownRef = useRef(false);

  const reduceMotion = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    setScreenContext({ category: 'addition', mode: 'learn' });
    return () => setScreenContext({ mode: null });
  }, []);

  // Warm every clip this session can say: "Let's count!" and the counting
  // numbers first, then the questions and answers in session order — in
  // small batches, because ~100 fetches at once trip the bucket's rate
  // limit (429) and a limited clip falls back to TTS.
  useEffect(() => {
    let cancelled = false;
    const parts = [
      fixedLinePart(LETS_COUNT_SLUG),
      ...Array.from({ length: max }, (_, i) => itemPart(String(i + 1))),
      ...sums.flatMap((s) => [
        fixedLinePart(askSlug(s.a, s.b)),
        fixedLinePart(answerSlug(s.a, s.b)),
      ]),
    ];
    (async () => {
      for (let i = 0; i < parts.length && !cancelled; i += 8) {
        await preloadVoiceClips(parts.slice(i, i + 8));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sums, max, locale]);

  const beginReveal = () => setIntroState(reduceMotion ? 'done' : 'revealing');
  useEffect(() => {
    if (introState !== 'revealing') return;
    const timer = setTimeout(() => setIntroState('done'), 750);
    return () => clearTimeout(timer);
  }, [introState]);

  const stop = useCallback(() => {
    runTokenRef.current += 1;
    cancel();
    busyRef.current = false;
    setIsBusy(false);
  }, [cancel]);

  // Close forward until `promise` settles (capped), unless something else
  // has taken over in the meantime — then that owner clears the hold
  const hold = useCallback(async (promise) => {
    const token = runTokenRef.current;
    busyRef.current = true;
    setIsBusy(true);
    await Promise.race([promise, wait(MAX_HOLD_MS)]);
    if (runTokenRef.current !== token) return;
    busyRef.current = false;
    setIsBusy(false);
  }, []);

  useEffect(() => () => clearTimeout(cooldownTimerRef.current), []);

  // ---- arriving at a state (and saying its line) ---------------------

  const arriveAsk = useCallback(
    (i) => {
      stop();
      const p = sums[i];
      setIndex(i);
      setPhase('ask');
      setFlight({ landed: 0, flying: null });
      hold(speak(fixedLinePart(askSlug(p.a, p.b))));
    },
    [sums, speak, stop, hold]
  );

  const arriveDone = useCallback(
    (i, { celebrate }) => {
      stop();
      const p = sums[i];
      const token = runTokenRef.current;
      setIndex(i);
      setPhase('done');
      setFlight({ landed: p.a + p.b, flying: null });
      hold(
        (async () => {
          await speak(fixedLinePart(answerSlug(p.a, p.b)));
          if (runTokenRef.current !== token) return;
          if (celebrate) await playPositive();
          if (runTokenRef.current !== token) return;
          // let the answer sink in before the next sum can be taken
          await wait(ABSORB_MS);
        })()
      );
    },
    [sums, speak, stop, hold, playPositive]
  );

  // The first question lands as the intro's window opens
  const startedRef = useRef(false);
  useEffect(() => {
    if (introState !== 'done' || startedRef.current) return;
    startedRef.current = true;
    arriveAsk(0);
  }, [introState, arriveAsk]);

  // A range change under our feet (Home pill) restarts at the first sum
  useEffect(() => {
    if (!startedRef.current) return;
    arriveAsk(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sums]);

  // ---- the count ------------------------------------------------------

  // Measures a crate cell in scene coordinates for the flying layer
  const measure = (crate, i) => {
    const el = cellEls.current.get(`${crate}:${i}`);
    const scene = sceneRef.current;
    if (!el || !scene) return null;
    const r = el.getBoundingClientRect();
    const s = scene.getBoundingClientRect();
    return { x: r.left - s.left, y: r.top - s.top, size: r.width };
  };

  const runCount = useCallback(async () => {
    stop();
    const token = runTokenRef.current;
    const alive = () => runTokenRef.current === token;
    const total = a + b;
    setPhase('counting');
    setFlight({ landed: 0, flying: null });
    await speak(fixedLinePart(LETS_COUNT_SLUG));
    if (!alive()) return;
    for (let k = 1; k <= total; k++) {
      const [crate, cell] = sourceOf(k, a);
      const from = measure(crate, cell);
      const to = measure('R', k - 1);
      const stepStarted = Date.now();
      // Lift off and count in the same breath; the number is the moment
      // the object leaves its crate, not when it lands
      setFlight({ landed: k - 1, flying: from && to ? { k, from, to } : null });
      const spoken = speak(itemPart(String(k)));
      await wait(reduceMotion ? 0 : FLIGHT_MS);
      if (!alive()) return;
      setFlight({ landed: k, flying: null });
      await spoken;
      if (!alive()) return;
      await wait(Math.max(0, MIN_STEP_MS - (Date.now() - stepStarted)));
      if (!alive()) return;
    }
    track('addition_solved', { item: problem.id, meta: { max } });
    arriveDone(index, { celebrate: true });
  }, [a, b, speak, stop, reduceMotion, arriveDone, index, problem.id, max]);

  // ---- navigation -----------------------------------------------------

  const startCooldown = useCallback(() => {
    isCoolingDownRef.current = true;
    setIsCoolingDown(true);
    clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      isCoolingDownRef.current = false;
      setIsCoolingDown(false);
    }, 1000);
  }, []);

  const goNext = useCallback(() => {
    if (phase === 'counting' || busyRef.current || isCoolingDownRef.current) return;
    startCooldown();
    if (phase === 'ask') {
      runCount();
    } else {
      // After the last sum, back around to the first — no sticker here:
      // stickers are for tests, and this lesson has none yet
      arriveAsk((index + 1) % sums.length);
    }
  }, [phase, index, sums.length, runCount, arriveAsk, startCooldown]);

  // Back is a correction, so it skips the cooldown (same rule as the other
  // learn views). Mid-count it puts everything back and asks again.
  const goPrev = useCallback(() => {
    if (phase === 'counting' || phase === 'done') {
      arriveAsk(index);
    } else {
      const prev = (index - 1 + sums.length) % sums.length;
      arriveDone(prev, { celebrate: false });
    }
  }, [phase, index, sums.length, arriveAsk, arriveDone]);

  const repeat = useCallback(() => {
    if (phase === 'ask') speak(fixedLinePart(askSlug(a, b)));
    else if (phase === 'done') speak(fixedLinePart(answerSlug(a, b)));
  }, [phase, a, b, speak]);

  useEffect(() => {
    const onKey = (e) => {
      if (introState !== 'done' || e.repeat || ownedByFocusedControl(e)) return;
      if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        repeat();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, repeat, introState]);

  // ---- render ---------------------------------------------------------

  const { landed, flying } = flight;
  const cellState = (k) => (k <= landed || k === flying?.k ? 'ghost' : 'solid');
  const cellsA = Array.from({ length: a }, (_, i) => cellState(i + 1));
  const cellsB = Array.from({ length: b }, (_, i) => cellState(a + i + 1));
  const cellsR = Array.from({ length: landed }, () => 'solid');
  const activeCrate = flying ? sourceOf(flying.k, a)[0] : null;

  const resultLabel = phase === 'done' ? sum : landed > 0 ? landed : '?';
  const resultLabelClass =
    phase === 'done'
      ? 'text-emerald-600 addition-pop-in'
      : landed > 0
        ? 'text-emerald-600 addition-pop-in'
        : 'text-gray-400';

  const onCell = (crate) => (i, el) => {
    if (el) cellEls.current.set(`${crate}:${i}`, el);
    else cellEls.current.delete(`${crate}:${i}`);
  };

  const symbolClass =
    'font-black text-gray-400 leading-none text-[calc(var(--crate-w)*0.38)] pb-[calc(var(--crate-w)*0.3+0.5rem)] select-none';
  const hint =
    phase === 'counting'
      ? t('addition.hintCounting')
      : phase === 'done'
        ? t('addition.hintDone')
        : t('addition.hintAsk');

  const introTiles = useMemo(
    () => [
      { emoji: `${object.emoji}${object.emoji}` },
      { emoji: '➕' },
      { emoji: `${object.emoji}${object.emoji}${object.emoji}` },
      { emoji: '🟰' },
      { emoji: '5' },
    ],
    [object]
  );

  return (
    <div className="h-full relative">
      {introState !== 'done' && (
        <CategoryIntro
          categoryKey="addition"
          title={t('cat.addition')}
          emoji="➕"
          tiles={introTiles}
          onReveal={beginReveal}
        />
      )}
      <div
        className="h-full bg-gradient-to-br from-sky-50 via-teal-50 to-emerald-50 flex flex-col overflow-hidden relative"
        style={
          introState === 'intro'
            ? { clipPath: 'circle(0% at 50% 50%)' }
            : introState === 'revealing'
              ? { clipPath: 'circle(75% at 50% 50%)', transition: 'clip-path 700ms ease-in-out' }
              : undefined
        }
      >
        <div className="bg-white shadow-sm border-b border-gray-100 p-3 md:p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <HomeButton />
              <h1 className="text-2xl font-bold text-gray-800">{t('cat.addition')}</h1>
            </div>
            <button
              onClick={repeat}
              className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="Say it again"
            >
              <Volume2 size={24} />
            </button>
          </div>
        </div>

        {/* The scene. --crate-w budgets three crates plus labels into the
            height (stacked) or the width (phone landscape: one row). */}
        <div
          ref={sceneRef}
          className="relative flex-1 min-h-0 flex flex-col items-center justify-center gap-1 md:gap-3 px-4 pb-16"
          style={{
            '--crate-w': row
              ? 'min(24rem, calc((100vw - 8rem) / 4.4), calc((100vh - 12rem) / 1.45))'
              : 'min(36vw, 20rem, calc((100vh - 13rem) / 3.4))',
          }}
        >
          <div className="flex items-end justify-center gap-3 md:gap-6">
            <Crate
              cells={cellsA}
              object={object}
              onCell={onCell('A')}
              offset={row ? -ROW_STEP : -STACK_STEP / 2}
              highlight={activeCrate === 'A'}
              label={a}
              labelClassName="text-orange-500"
            />
            <div className={symbolClass} aria-hidden="true">+</div>
            <Crate
              cells={cellsB}
              object={object}
              onCell={onCell('B')}
              offset={row ? 0 : STACK_STEP / 2}
              highlight={activeCrate === 'B'}
              label={b}
              labelClassName="text-sky-500"
            />
            {row && (
              <>
                <div className={symbolClass} aria-hidden="true">=</div>
                <ResultCrate
                  cells={cellsR}
                  object={object}
                  onCell={onCell('R')}
                  offset={ROW_STEP}
                  done={phase === 'done'}
                  label={resultLabel}
                  labelClassName={resultLabelClass}
                  onTap={repeat}
                />
              </>
            )}
          </div>
          {!row && (
            <>
              <div className="font-black text-gray-400 leading-none text-[calc(var(--crate-w)*0.38)] select-none" aria-hidden="true">
                =
              </div>
              <ResultCrate
                cells={cellsR}
                object={object}
                onCell={onCell('R')}
                done={phase === 'done'}
                label={resultLabel}
                labelClassName={resultLabelClass}
                onTap={repeat}
              />
            </>
          )}

          {/* The object in the air, above every crate */}
          {flying && !reduceMotion && (
            <Flyer key={flying.k} from={flying.from} to={flying.to} object={object} />
          )}

          <div className="absolute inset-x-0 bottom-10 md:bottom-auto md:top-1/2 md:-translate-y-1/2 flex justify-between px-1 md:px-6 pointer-events-none">
            <button
              onClick={goPrev}
              className="pointer-events-auto p-3 md:p-4 rounded-full opacity-70 md:opacity-40 hover:opacity-100 hover:bg-white/60 motion-safe:active:scale-95 active:opacity-100 transition-all"
              aria-label="Back"
            >
              <ChevronLeft size={44} className="text-gray-500" />
            </button>
            <button
              onClick={goNext}
              disabled={isCoolingDown || isBusy || phase === 'counting'}
              className={`pointer-events-auto p-3 md:p-4 rounded-full transition-all ${
                isCoolingDown || isBusy || phase === 'counting'
                  ? 'opacity-15 cursor-not-allowed'
                  : 'opacity-70 md:opacity-40 hover:opacity-100 hover:bg-white/60 motion-safe:active:scale-95 active:opacity-100'
              }`}
              aria-label="Next"
            >
              <ChevronRight size={44} className="text-gray-500" />
            </button>
          </div>

          <div className="absolute bottom-9 text-sm font-medium text-gray-400 tabular-nums">
            {index + 1} / {sums.length}
          </div>
          <div className="absolute bottom-3 text-xs md:text-sm text-gray-400">{hint}</div>
        </div>
      </div>
    </div>
  );
};

// The answer crate: tappable to hear the line again, sparkles once solved
const ResultCrate = ({ cells, object, onCell, offset = 0, done, label, labelClassName, onTap }) => (
  <button
    type="button"
    onClick={onTap}
    className="relative cursor-pointer focus:outline-none"
    aria-label="Say it again"
  >
    <Crate
      cells={cells}
      object={object}
      onCell={onCell}
      offset={offset}
      highlight={done}
      label={label}
      labelClassName={labelClassName}
    />
    {done && (
      <span className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <span className="addition-sparkle absolute -top-2 left-2 text-[calc(var(--crate-w)*0.18)]">✨</span>
        <span className="addition-sparkle absolute top-1 right-0 text-[calc(var(--crate-w)*0.22)]" style={{ animationDelay: '150ms' }}>✨</span>
        <span className="addition-sparkle absolute top-1/3 -left-3 text-[calc(var(--crate-w)*0.16)]" style={{ animationDelay: '300ms' }}>✨</span>
      </span>
    )}
  </button>
);

// One object mid-hop, from its crate cell to its result cell (scene
// coordinates). Web Animations so the arc starts the instant it mounts —
// no first-frame race with a CSS transition.
const Flyer = ({ from, to, object }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // The element is sized like its landing cell; position by centers so
    // the take-off scale (front row vs back row cells differ) stays put
    const fx = from.x + from.size / 2 - to.size / 2;
    const fy = from.y + from.size / 2 - to.size / 2;
    const midX = (fx + to.x) / 2;
    const midY = Math.min(fy, to.y) - to.size * HOP_LIFT;
    const anim = el.animate(
      [
        { transform: `translate(${fx}px, ${fy}px) scale(${from.size / to.size})` },
        { transform: `translate(${midX}px, ${midY}px) scale(1.15)`, offset: 0.5 },
        { transform: `translate(${to.x}px, ${to.y}px) scale(1)` },
      ],
      { duration: FLIGHT_MS, easing: 'ease-in-out', fill: 'forwards' }
    );
    return () => anim.cancel();
  }, [from, to]);
  return (
    <div
      ref={ref}
      className="absolute left-0 top-0 z-20 flex items-center justify-center pointer-events-none drop-shadow-lg"
      style={{
        width: to.size,
        height: to.size,
        fontSize: to.size,
        transform: `translate(${from.x + from.size / 2 - to.size / 2}px, ${from.y + from.size / 2 - to.size / 2}px)`,
      }}
      aria-hidden="true"
    >
      <ObjectGlyph object={object} />
    </div>
  );
};

export default AdditionPage;
