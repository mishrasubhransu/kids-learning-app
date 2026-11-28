import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Volume2, RotateCcw } from 'lucide-react';
import useVoice from '../../hooks/useVoice';
import { recordingCategoryFor } from '../../lib/recordings';
import useAudioFeedback from '../../hooks/useAudioFeedback';
import ownedByFocusedControl from '../../utils/ownedByFocusedControl';
import { useChildProfile } from '../../context/ChildProfileContext';
import { track } from '../../lib/analytics';
import TraceBoard from './TraceBoard';

const brushColors = [
  '#e74c3c', '#3498db', '#2ecc71', '#f1c40f',
  '#9b59b6', '#e67e22', '#1abc9c', '#ff0066',
];

const TracingMode = ({ items, category }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Bumping `attempt` remounts the board — a fresh try at the same character
  const [attempt, setAttempt] = useState(0);
  const [completed, setCompleted] = useState(false);
  const brushColor = brushColors[currentIndex % brushColors.length];
  // Parent-recorded voice when a recording exists, browser TTS otherwise —
  // same speech path as the sibling lesson modes (ScrollView etc.)
  const { speakItem } = useVoice(recordingCategoryFor(category));
  const { playPositive } = useAudioFeedback();
  const { activeChild } = useChildProfile();
  const soundOn = activeChild?.settings?.soundEffects !== false;

  const currentItem = items[currentIndex];
  const displayText = currentItem.display || currentItem.name;

  useEffect(() => {
    speakItem(currentItem.name);
  }, [currentIndex, speakItem, currentItem]);

  // Praise is earned: TraceBoard only reports completion once every stroke
  // has been followed from its start dot to its end, in order.
  const handleComplete = useCallback(() => {
    setCompleted(true);
    track('trace_complete', { category, item: currentItem.name });
    playPositive(1);
  }, [category, currentItem, playPositive]);

  const handleRestart = () => {
    setCompleted(false);
    setAttempt((n) => n + 1);
  };

  const goNext = () => {
    setCompleted(false);
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  const goPrev = () => {
    setCompleted(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat || ownedByFocusedControl(e)) return;
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === ' ') {
        e.preventDefault();
        speakItem(currentItem.name);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, items.length, speakItem, currentItem]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
      {/* Top controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={handleRestart}
          className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          aria-label="Start again"
        >
          <RotateCcw size={24} />
        </button>
        <button
          onClick={() => speakItem(currentItem.name)}
          className="p-3 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
          aria-label="Speak"
        >
          <Volume2 size={24} />
        </button>
      </div>

      {/* Label */}
      <div className="mb-4 text-center">
        <span className="text-2xl md:text-3xl font-bold text-gray-600">
          Trace: {displayText}
        </span>
      </div>

      {/* Guided tracing board — start dot, arrow and guide dots per stroke */}
      <div className="relative w-full max-w-lg aspect-square bg-white rounded-2xl shadow-lg">
        <TraceBoard
          key={`${currentIndex}-${displayText}-${attempt}`}
          text={displayText}
          color={brushColor}
          soundOn={soundOn}
          onComplete={handleComplete}
        />
        {completed && (
          <div
            className="absolute top-3 inset-x-0 flex justify-center gap-2 text-4xl pointer-events-none motion-safe:animate-bounce"
            aria-hidden="true"
          >
            <span>⭐</span>
            <span>⭐</span>
            <span>⭐</span>
          </div>
        )}
      </div>

      {/* Navigation arrows: below the canvas on narrow screens — floating
          at mid-height they'd overlap the canvas edges, so a child tracing
          near the border would trigger navigation and lose the drawing */}
      <div className="mt-4 w-full max-w-lg flex justify-between px-2 pointer-events-none md:absolute md:inset-x-0 md:top-1/2 md:-translate-y-1/2 md:mt-0 md:max-w-none md:px-8">
        <button
          onClick={goPrev}
          className="pointer-events-auto p-4 rounded-full opacity-70 md:opacity-40 hover:opacity-100 hover:bg-gray-200 motion-safe:active:scale-95 active:opacity-100 transition-all"
          aria-label="Previous"
        >
          <ChevronLeft size={48} className="text-gray-500" />
        </button>
        <button
          onClick={goNext}
          className={`pointer-events-auto p-4 rounded-full hover:opacity-100 hover:bg-gray-200 motion-safe:active:scale-95 active:opacity-100 transition-all ${
            completed ? 'opacity-100 bg-green-100 motion-safe:animate-pulse' : 'opacity-70 md:opacity-40'
          }`}
          aria-label="Next"
        >
          <ChevronRight size={48} className={completed ? 'text-green-600' : 'text-gray-500'} />
        </button>
      </div>

      {/* Progress */}
      <div className="mt-4 text-gray-400 text-sm">
        {currentIndex + 1} / {items.length} — Use arrow keys to navigate
      </div>
    </div>
  );
};

export default TracingMode;
