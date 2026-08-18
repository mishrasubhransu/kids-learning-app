import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import useVoice from '../../hooks/useVoice';
import useWordCase from '../../hooks/useWordCase';
import useChildSetting from '../../hooks/useChildSetting';
import { itemPart } from '../../lib/voiceKeys';
import { localizedName } from '../../lib/locale';
import { useLocale } from '../../context/LocaleContext';
import preloadImages from '../../utils/preloadImages';
import ownedByFocusedControl from '../../utils/ownedByFocusedControl';
import ItemMedia from '../ui/ItemMedia';
import { pairExamplesAt, exampleSlotCount } from '../../data/opposites';

// The two poles of every pair: warm for the first word, cool for its opposite.
const POLES = [
  { accent: '#FF7A59', tint: '#FFF4EC' },
  { accent: '#3B9EFF', tint: '#EEF6FF' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Per-child record of the example slot each pair showed last, JSON { id:
// slot } (useChildSetting mirrors it to localStorage) — the rotation
// continues across sessions instead of restarting or coin-flipping.
const parseShownSlots = (raw) => {
  try {
    const o = JSON.parse(raw);
    return o && typeof o === 'object' ? o : {};
  } catch {
    return {};
  }
};

const upcomingSlot = (item, shownSlots) => {
  const last = Number.isInteger(shownSlots[item.id]) ? shownSlots[item.id] : -1;
  return (last + 1) % exampleSlotCount(item);
};

// The slot a pair is showing right now = the one its latest arrival wrote
// (single-slot pairs are never written and always show 0)
const shownSlot = (item, shownSlots) =>
  Number.isInteger(shownSlots[item.id]) ? shownSlots[item.id] : 0;

// One linear sequence: pair 0 word 0, pair 0 word 1, pair 1 word 0, ...
// The right arrow always means "what comes next".
const PairLearnView = ({ items, holdIntro = false }) => {
  const displayItems = useMemo(() => shuffle(items), [items]);
  // Which example slot each pair shows comes straight from the per-child
  // record: arriving at a pair advances its entry (see the layout effect
  // below), and the map only ever changes for the pair being arrived at —
  // so cards never swap mid-look, and leaving and coming back, even in
  // the same session, brings the pair's next scenario. Both sides share
  // a slot so the contrast stays apples-to-apples.
  const [shownSlotsRaw, setShownSlots] = useChildSetting('slotShown-opposites', null);
  const shownSlots = useMemo(() => parseShownSlots(shownSlotsRaw), [shownSlotsRaw]);
  const [step, setStep] = useState(0);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const { speak } = useVoice();
  const { t } = useLocale();
  const caseClass = useWordCase();
  const prevStepRef = useRef(null);
  const isCoolingDownRef = useRef(false);
  const cooldownTimerRef = useRef(null);

  const totalSteps = displayItems.length * 2;
  const pairIndex = Math.floor(step / 2);
  const side = step % 2;
  const currentItem = displayItems[pairIndex];
  const activeWord = currentItem.pair[side];
  const pole = POLES[side];

  // Arrival at a pair: advance its rotation. Layout effect so the frame
  // that still derives the pair's PREVIOUS slot is never painted; the
  // item-ref guard keeps word-to-word steps (and StrictMode's double
  // pass) from advancing again.
  const arrivedItemRef = useRef(null);
  useLayoutEffect(() => {
    const item = displayItems[pairIndex];
    if (!item || arrivedItemRef.current === item) return;
    arrivedItemRef.current = item;
    if (exampleSlotCount(item) < 2) return;
    const shown = parseShownSlots(shownSlotsRaw);
    setShownSlots(JSON.stringify({ ...shown, [item.id]: upcomingSlot(item, shown) }));
  }, [pairIndex, displayItems, shownSlotsRaw, setShownSlots]);

  // Media the current pair shows, one example per word from its shown slot
  const currentExamples = useMemo(
    () => pairExamplesAt(currentItem, shownSlot(currentItem, shownSlots)),
    [currentItem, shownSlots]
  );

  // Speak whenever the highlight moves (and once on mount — held while the
  // category intro page is up, so the first word lands as the reveal opens)
  useEffect(() => {
    if (holdIntro) return;
    if (prevStepRef.current !== step) {
      speak(itemPart(displayItems[Math.floor(step / 2)].pair[step % 2]));
      prevStepRef.current = step;
    }
  }, [step, displayItems, speak, holdIntro]);

  // Warm the images the NEXT pair will show on arrival — its upcoming
  // slot is deterministic, so this predicts it without advancing anything
  // (video examples stream on their own; only images preload)
  useEffect(() => {
    const next = displayItems[(pairIndex + 1) % displayItems.length];
    if (!next) return;
    const examples = pairExamplesAt(next, upcomingSlot(next, shownSlots));
    const paths = Object.values(examples).filter((m) => typeof m === 'string');
    if (paths.length) preloadImages(paths);
  }, [pairIndex, displayItems, shownSlots]);

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
    if (isCoolingDownRef.current) return;
    setStep((prev) => (prev + 1) % totalSteps);
    startCooldown();
  }, [totalSteps, startCooldown]);

  // Back is a correction, so it skips the cooldown that only exists to
  // stop forward mashing (same rule as ScrollView/LetterSoundsView).
  const goPrev = useCallback(() => {
    setStep((prev) => (prev - 1 + totalSteps) % totalSteps);
  }, [totalSteps]);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => clearTimeout(cooldownTimerRef.current);
  }, []);

  const handleCardTap = (tappedSide) => {
    const tappedStep = pairIndex * 2 + tappedSide;
    if (tappedStep === step) {
      speak(itemPart(activeWord)); // same card: just say it again
    } else {
      setStep(tappedStep);
    }
  };

  // Keyboard: right = next, left = back, space/enter = repeat — inert while
  // the intro page is up (its own listener turns those keys into "skip")
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (holdIntro || e.repeat || ownedByFocusedControl(e)) return;
      if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        speak(itemPart(activeWord));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, speak, activeWord, holdIntro]);

  const renderCard = (cardSide) => {
    const word = currentItem.pair[cardSide];
    const cardPole = POLES[cardSide];
    const isActive = cardSide === side;

    return (
      <button
        onClick={() => handleCardTap(cardSide)}
        className={`rounded-3xl bg-white p-4 md:p-6 flex flex-col items-center gap-3 transition-all duration-300 cursor-pointer ${
          isActive
            ? 'opposites-spotlight scale-100 shadow-2xl'
            : 'scale-90 opacity-50 shadow-md grayscale-[30%]'
        }`}
        style={{
          border: '8px solid',
          borderColor: isActive ? cardPole.accent : 'transparent',
          '--spotlight-color': cardPole.accent,
        }}
        aria-label={isActive ? `${localizedName(word)}, say it again` : `Show ${localizedName(word)}`}
      >
        <ItemMedia
          item={(() => {
            const media = currentExamples[word];
            return typeof media === 'string' ? { image: media } : media;
          })()}
          playing={isActive}
          alt={localizedName(word)}
          className="w-[var(--img-card)] h-[var(--img-card)] object-contain rounded-2xl pointer-events-none"
        />
        <span
          className={`text-3xl md:text-5xl font-black tracking-wide ${caseClass} transition-colors duration-300`}
          style={{ color: isActive ? cardPole.accent : '#9CA3AF' }}
        >
          {localizedName(word)}
        </span>
      </button>
    );
  };

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center p-4 relative transition-colors duration-500"
      style={{ backgroundColor: pole.tint }}
    >
      {/* The pair, side by side */}
      <div className="flex items-center justify-center gap-4 md:gap-10">
        {renderCard(0)}
        {renderCard(1)}
      </div>

      {/* Repeat word */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => speak(itemPart(activeWord))}
          className="p-3 rounded-full bg-white/70 text-gray-600 hover:bg-white transition-colors shadow"
          aria-label={`Say ${activeWord} again`}
        >
          <Volume2 size={24} />
        </button>
      </div>

      {/* Navigation arrows: on narrow screens they flank the page counter at
          the bottom (floating at mid-height they overlap the pair cards).
          bottom-10 centers the 68px buttons on the bottom-16 counter. */}
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
          disabled={isCoolingDown}
          className={`pointer-events-auto p-3 md:p-4 rounded-full transition-all ${
            isCoolingDown
              ? 'opacity-15 cursor-not-allowed'
              : 'opacity-70 md:opacity-40 hover:opacity-100 hover:bg-white/60 motion-safe:active:scale-95 active:opacity-100'
          }`}
          aria-label="Next"
        >
          <ChevronRight size={44} className="text-gray-500" />
        </button>
      </div>

      {/* Pair dots — display-only on touch, clickable via a padded hit box
          for mouse/keyboard; a plain counter replaces them on phones/short
          landscape (see .progress-dots in index.css) */}
      <div className="progress-count absolute bottom-16 text-sm font-medium text-gray-400">
        {pairIndex + 1} / {displayItems.length}
      </div>
      <div className="progress-dots absolute bottom-16 flex flex-wrap justify-center max-w-[90%] touch-display-only">
        {displayItems.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => setStep(idx * 2)}
            className="group w-6 h-6 flex items-center justify-center"
            aria-label={`Go to ${item.name}`}
          >
            <span
              className={`rounded-full transition-all duration-300 ${
                idx === pairIndex
                  ? 'w-3 h-3'
                  : 'w-2 h-2 bg-gray-300 group-hover:bg-gray-400'
              }`}
              style={idx === pairIndex ? { backgroundColor: pole.accent } : undefined}
            />
          </button>
        ))}
      </div>

      <div className="absolute bottom-6 text-xs md:text-sm text-gray-400">
        {t('pair.hint')}
      </div>
    </div>
  );
};

export default PairLearnView;
