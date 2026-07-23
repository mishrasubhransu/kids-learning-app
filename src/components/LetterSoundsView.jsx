import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import HomeButton from './ui/HomeButton';
import useUserSetting from '../hooks/useUserSetting';
import {
  letterSounds,
  letterImageSrc,
  letterAudioSrc,
  letterPhrase,
} from '../data/letterSounds';

const bgColors = [
  '#e74c3c', '#8e44ad', '#3498db', '#1abc9c',
  '#f1c40f', '#e67e22', '#2ecc71', '#ff0066', '#34495e',
];

const randomWordIdx = (letter) =>
  Math.floor(Math.random() * letterSounds[letter].words.length);

// Highlight the letter inside the word (first match, or the trailing x in "Fox")
const HighlightedWord = ({ letter, name }) => {
  const idx = name.toLowerCase().indexOf(letter);
  if (idx === -1) return <span>{name}</span>;
  return (
    <span>
      {name.slice(0, idx)}
      <span className="text-yellow-300">{name[idx]}</span>
      {name.slice(idx + 1)}
    </span>
  );
};

const LetterSoundsView = () => {
  const [current, setCurrent] = useState({ index: 0, wordIdx: randomWordIdx(0) });
  const [bgColor, setBgColor] = useState(bgColors[0]);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  // Mirrors isAudioPlayingRef so the Next arrow can show the locked state
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  // 'capital' shows only uppercase everywhere; 'small' adds lowercase
  const [letterCase] = useUserSetting('letterCase', 'capital');
  const audioRef = useRef(null);
  const isCoolingDownRef = useRef(false);
  const cooldownTimerRef = useRef(null);
  // Forward navigation waits for the clip to finish, however long it is
  const isAudioPlayingRef = useRef(false);
  const unlockTimerRef = useRef(null);

  const { letter, words } = letterSounds[current.index];
  const word = words[current.wordIdx];

  // ElevenLabs clips only — no browser TTS here, an interrupted play()
  // promise would otherwise stack robot speech on top of the next clip.
  const playCurrent = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(letterAudioSrc(letter, word.slug));
    audioRef.current = audio;
    isAudioPlayingRef.current = true;
    const clear = () => {
      // A superseded clip's late ended/error/abort must not unlock the
      // clip that replaced it (StrictMode remount, rapid navigation)
      if (audioRef.current === audio) {
        isAudioPlayingRef.current = false;
        setIsAudioPlaying(false);
      }
    };
    audio.addEventListener('ended', clear);
    audio.addEventListener('error', clear);
    // If the network stalls and neither event ever fires, unlock anyway —
    // otherwise forward navigation dead-locks for the rest of the session
    clearTimeout(unlockTimerRef.current);
    unlockTimerRef.current = setTimeout(clear, 5000);
    audio
      .play()
      .then(() => {
        if (audioRef.current === audio) setIsAudioPlaying(true);
      })
      .catch(clear);
  }, [letter, word]);

  // Play on mount and whenever the letter/word changes
  useEffect(() => {
    playCurrent();
  }, [playCurrent]);

  // Stop audio when leaving the page
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      clearTimeout(cooldownTimerRef.current);
      clearTimeout(unlockTimerRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    isCoolingDownRef.current = true;
    setIsCoolingDown(true);
    clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      isCoolingDownRef.current = false;
      setIsCoolingDown(false);
    }, 1000);
  }, []);

  const goTo = useCallback((indexFn) => {
    setCurrent((prev) => {
      const index = indexFn(prev.index);
      return { index, wordIdx: randomWordIdx(index) };
    });
    setBgColor(bgColors[Math.floor(Math.random() * bgColors.length)]);
  }, []);

  const goNext = useCallback(() => {
    if (isCoolingDownRef.current || isAudioPlayingRef.current) return;
    goTo((i) => (i < letterSounds.length - 1 ? i + 1 : 0));
    startCooldown();
  }, [goTo, startCooldown]);

  // Back skips the cooldown — it only exists to stop forward mashing
  const goPrev = useCallback(() => {
    goTo((i) => (i > 0 ? i - 1 : letterSounds.length - 1));
  }, [goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        playCurrent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, playCurrent]);

  return (
    <div
      className="h-full flex flex-col items-center justify-center p-4 relative transition-colors duration-300 overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Home button */}
      <div className="absolute top-4 left-4 z-10">
        <HomeButton to="/phonics" />
      </div>

      {/* Replay button */}
      <button
        onClick={playCurrent}
        className={`absolute top-4 right-4 z-10 p-3 rounded-full text-white transition-colors ${
          isAudioPlaying
            ? 'bg-white/30 animate-pulse'
            : 'bg-white/20 hover:bg-white/30'
        }`}
        aria-label="Say it again"
      >
        <Volume2 size={28} />
      </button>

      {/* Main display - clickable to replay */}
      <button
        onClick={playCurrent}
        className="flex flex-col items-center gap-3 md:gap-5 cursor-pointer focus:outline-none"
        aria-label={letterPhrase(letter, word)}
      >
        <span
          className="font-bold leading-none select-none text-white"
          style={{
            fontSize: 'min(18vw, 22vh)',
            textShadow: '4px 4px 10px rgba(0,0,0,0.3)',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          {letter.toUpperCase()}
          {letterCase === 'small' && (
            <span className="opacity-80 ml-3">{letter}</span>
          )}
        </span>

        <img
          key={word.slug}
          src={letterImageSrc(word.slug)}
          alt={word.name}
          className="w-[var(--img-hero)] h-[var(--img-hero)] object-contain rounded-3xl shadow-2xl bg-white"
        />

        <span
          className="text-4xl md:text-6xl font-bold text-white select-none"
          style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.3)' }}
        >
          <HighlightedWord
            letter={letter}
            name={letterCase === 'capital' ? word.name.toUpperCase() : word.name}
          />
        </span>
      </button>

      {/* Navigation arrows */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 md:px-8 pointer-events-none">
        <button
          onClick={goPrev}
          className="pointer-events-auto p-4 rounded-full transition-all focus:outline-none opacity-40 hover:opacity-100 hover:bg-white/20"
          aria-label="Previous letter"
        >
          <ChevronLeft size={48} className="text-white" />
        </button>
        <button
          onClick={goNext}
          disabled={isCoolingDown || isAudioPlaying}
          className={`pointer-events-auto p-4 rounded-full transition-all focus:outline-none ${
            isCoolingDown || isAudioPlaying
              ? 'opacity-15 cursor-not-allowed'
              : 'opacity-40 hover:opacity-100 hover:bg-white/20'
          }`}
          aria-label="Next letter"
        >
          <ChevronRight size={48} className="text-white" />
        </button>
      </div>

      {/* Progress indicators */}
      <div className="absolute bottom-10 flex flex-wrap justify-center gap-1.5 max-w-[90%]">
        {letterSounds.map((entry, idx) => (
          <button
            key={entry.letter}
            onClick={() => {
              setCurrent({ index: idx, wordIdx: randomWordIdx(idx) });
              setBgColor(bgColors[Math.floor(Math.random() * bgColors.length)]);
            }}
            className={`rounded-full transition-all duration-300 ${
              idx === current.index
                ? 'bg-white w-3 h-3'
                : 'bg-white/40 hover:bg-white/60 w-2 h-2'
            }`}
            aria-label={`Go to letter ${entry.letter.toUpperCase()}`}
          />
        ))}
      </div>

      <div className="absolute bottom-4 text-xs md:text-sm text-white/40">
        Arrow keys to move | Click the picture to hear it again
      </div>
    </div>
  );
};

export default LetterSoundsView;
