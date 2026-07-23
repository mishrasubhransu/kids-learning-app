import { useEffect, useRef } from 'react';
import { Gamepad2, BookOpen } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';
import ownedByFocusedControl from '../../utils/ownedByFocusedControl';

// Shown when Scroll-mode autoplay finishes, instead of dropping the child
// straight into the quiz. Right arrow (the "go" key everywhere else in the
// app) accepts, so a toddler mashing forward still reaches the game.
const GameInterstitial = ({ onPlay, onKeepLearning }) => {
  const { speak, cancel } = useSpeech();
  const playButtonRef = useRef(null);

  useEffect(() => {
    speak('Great job! Ready to play a game?');
    playButtonRef.current?.focus();
    return cancel;
  }, [speak, cancel]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat || ownedByFocusedControl(e)) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onPlay();
      } else if (e.key === 'ArrowLeft' || e.key === 'Escape') {
        onKeepLearning();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPlay, onKeepLearning]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6 bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      <div className="text-7xl md:text-8xl motion-safe:animate-bounce" aria-hidden="true">
        🎉
      </div>
      <h2 className="text-3xl md:text-5xl font-bold text-gray-700 text-center">
        Ready to play a game?
      </h2>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          ref={playButtonRef}
          onClick={onPlay}
          className="flex items-center gap-3 px-10 py-5 rounded-2xl bg-purple-600 text-white text-2xl md:text-3xl font-bold shadow-lg hover:bg-purple-700 active:scale-95 transition-all"
        >
          <Gamepad2 size={32} />
          Let's play!
        </button>
        <button
          onClick={onKeepLearning}
          className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white text-gray-600 text-lg md:text-xl font-medium shadow hover:bg-gray-50 active:scale-95 transition-all"
        >
          <BookOpen size={22} />
          Keep learning
        </button>
      </div>
      <div className="text-xs md:text-sm text-gray-400">
        Press → to play | ← to keep learning
      </div>
    </div>
  );
};

export default GameInterstitial;
