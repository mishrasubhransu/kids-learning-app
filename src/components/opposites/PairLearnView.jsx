import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';
import preloadImages from '../../utils/preloadImages';
import ownedByFocusedControl from '../../utils/ownedByFocusedControl';

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

// One linear sequence: pair 0 word 0, pair 0 word 1, pair 1 word 0, ...
// The right arrow always means "what comes next".
const PairLearnView = ({ items }) => {
  const displayItems = useMemo(() => shuffle(items), [items]);
  const [step, setStep] = useState(0);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const { speak } = useSpeech();
  const prevStepRef = useRef(null);
  const isCoolingDownRef = useRef(false);
  const cooldownTimerRef = useRef(null);

  const totalSteps = displayItems.length * 2;
  const pairIndex = Math.floor(step / 2);
  const side = step % 2;
  const currentItem = displayItems[pairIndex];
  const activeWord = currentItem.pair[side];
  const pole = POLES[side];

  // Speak whenever the highlight moves (and once on mount)
  useEffect(() => {
    if (prevStepRef.current !== step) {
      speak(displayItems[Math.floor(step / 2)].pair[step % 2]);
      prevStepRef.current = step;
    }
  }, [step, displayItems, speak]);

  // Warm the next pair's images so the word never plays over blank cards
  useEffect(() => {
    const next = displayItems[(pairIndex + 1) % displayItems.length];
    if (next) preloadImages(next.pair.map((w) => next.images[w]));
  }, [pairIndex, displayItems]);

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
      speak(activeWord); // same card: just say it again
    } else {
      setStep(tappedStep);
    }
  };

  // Keyboard: right = next, left = back, space/enter = repeat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat || ownedByFocusedControl(e)) return;
      if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        speak(activeWord);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, speak, activeWord]);

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
        aria-label={isActive ? `${word}, say it again` : `Show ${word}`}
      >
        <img
          src={currentItem.images[word]}
          alt={word}
          className="w-[var(--img-card)] h-[var(--img-card)] object-contain rounded-2xl pointer-events-none"
          draggable={false}
        />
        <span
          className="text-3xl md:text-5xl font-black tracking-wide uppercase transition-colors duration-300"
          style={{ color: isActive ? cardPole.accent : '#9CA3AF' }}
        >
          {word}
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
          onClick={() => speak(activeWord)}
          className="p-3 rounded-full bg-white/70 text-gray-600 hover:bg-white transition-colors shadow"
          aria-label={`Say ${activeWord} again`}
        >
          <Volume2 size={24} />
        </button>
      </div>

      {/* Navigation arrows: below the cards on narrow screens — floating at
          mid-height they overlap the pair cards */}
      <div className="mt-4 w-full flex justify-between px-1 pointer-events-none md:absolute md:inset-x-0 md:top-1/2 md:-translate-y-1/2 md:mt-0 md:px-6">
        <button
          onClick={goPrev}
          className="pointer-events-auto p-3 md:p-4 rounded-full opacity-70 md:opacity-40 hover:opacity-100 hover:bg-white/60 active:scale-95 active:opacity-100 transition-all"
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
              : 'opacity-70 md:opacity-40 hover:opacity-100 hover:bg-white/60 active:scale-95 active:opacity-100'
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
        Press the right arrow to keep going
      </div>
    </div>
  );
};

export default PairLearnView;
