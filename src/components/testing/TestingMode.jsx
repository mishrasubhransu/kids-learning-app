import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Volume2, Play } from 'lucide-react';
import CountingFrames from '../ui/CountingFrames';
import useVoice from '../../hooks/useVoice';
import useWordCase from '../../hooks/useWordCase';
import { whichOnePart, thatWasPart, tryToFindPart } from '../../lib/voiceKeys';
import useAudioFeedback from '../../hooks/useAudioFeedback';
import useAudioLock from '../../hooks/useAudioLock';
import ownedByFocusedControl from '../../utils/ownedByFocusedControl';
import { useLocale } from '../../context/LocaleContext';
import { track } from '../../lib/analytics';
import ItemMedia from '../ui/ItemMedia';
import SessionRecap from '../ui/SessionRecap';
import { recapTilesForItems } from '../../lib/recapTiles';

// autoStart skips the "Ready to Test?" screen — used when the child already
// tapped through the post-autoplay interstitial (that tap is the user gesture
// speech needs, so a second start tap would just be a hurdle).
const TestingMode = ({ items, category, difficulty, objectIcons, shapeColor, objectType, autoStart = false }) => {
  const [options, setOptions] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [testComplete, setTestComplete] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const { t } = useLocale();
  const { speak, cancel } = useVoice();
  // Family names are identity, not vocabulary — they stay as the parent
  // typed them regardless of the case setting
  const wordCase = useWordCase();
  const caseClass = category === 'family' ? '' : wordCase;
  const { playPositive, playEncouragement } = useAudioFeedback();
  const { locked, withLock } = useAudioLock();
  const autoAdvanceTimerRef = useRef(null);
  const wrongResetTimerRef = useRef(null);
  const askedIdsRef = useRef(new Set());
  const touchStartRef = useRef(null);

  // Get number of options based on difficulty
  const getOptionCount = useCallback(() => {
    switch (difficulty) {
      case 'easy':
        return Math.min(3, items.length);
      case 'medium':
        return Math.min(5, items.length);
      case 'hard':
        return items.length;
      default:
        return 4;
    }
  }, [difficulty, items.length]);

  // Shuffle array
  const shuffle = (arr) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Generate new question and return the correct answer (random without replacement)
  const generateQuestion = useCallback(() => {
    // Check if all items have been asked
    const remaining = items.filter((item) => !askedIdsRef.current.has(item.id));
    if (remaining.length === 0) {
      setTestComplete(true);
      setShowRecap(true); // recap sticker moment over the trophy screen
      return null;
    }

    const count = getOptionCount();

    // Pick correct answer from remaining (not yet asked) items
    const correct = remaining[Math.floor(Math.random() * remaining.length)];
    askedIdsRef.current.add(correct.id);

    // Build options: correct answer + random others from all items
    const others = shuffle(items.filter((item) => item.id !== correct.id));
    const selectedOptions = [correct, ...others.slice(0, count - 1)];

    setOptions(shuffle(selectedOptions));
    setCorrectAnswer(correct);
    setSelectedAnswer(null);
    setIsCorrect(null);
    // Clear any pending timers
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    clearTimeout(wrongResetTimerRef.current);

    return correct; // Return the new correct answer
  }, [items, getOptionCount]);

  // Speak question for a specific answer (used after generating new question)
  const askQuestionFor = useCallback((answer) => {
    if (answer) {
      speak(whichOnePart(answer));
    }
  }, [speak]);

  // Initialize on mount and difficulty change
  useEffect(() => {
    askedIdsRef.current = new Set();
    setTestComplete(false);
    const first = generateQuestion();
    setHasStarted(autoStart);
    if (autoStart) {
      const timer = setTimeout(() => askQuestionFor(first), 400);
      return () => clearTimeout(timer);
    }
  }, [generateQuestion, difficulty, autoStart, askQuestionFor]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      clearTimeout(wrongResetTimerRef.current);
    };
  }, []);

  // Speak the question - uses current correctAnswer state
  const askQuestion = useCallback(() => {
    if (correctAnswer && !locked()) {
      speak(whichOnePart(correctAnswer));
    }
  }, [correctAnswer, speak, locked]);

  // Start the test
  const handleStart = () => {
    setHasStarted(true);
    setTimeout(() => {
      askQuestion();
    }, 100);
  };

  // Restart the test
  const handleRestart = () => {
    askedIdsRef.current = new Set();
    setTestComplete(false);
    setCorrectCount(0);
    const newCorrect = generateQuestion();
    setTimeout(() => {
      askQuestionFor(newCorrect);
    }, 400);
  };

  // Next question with proper timing
  const nextQuestion = useCallback(() => {
    // Clear timers
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }

    // Generate new question and get the new correct answer
    const newCorrect = generateQuestion();

    // Speak the NEW question after a short delay
    setTimeout(() => {
      askQuestionFor(newCorrect);
    }, 400);
  }, [generateQuestion, askQuestionFor]);

  useEffect(() => {
    if (!testComplete) return;
    track('test_complete', {
      category,
      mode: 'test',
      meta: { correct: correctCount, total: items.length, difficulty },
    });
  }, [testComplete, category, correctCount, items.length, difficulty]);

  // Memoized so re-renders while the recap is open (the sticker persist
  // updates the profile context) don't reshuffle the collage mid-view
  const recapTiles = useMemo(
    () =>
      testComplete ? recapTilesForItems(category, items, { shapeColor }) : [],
    [testComplete, category, items, shapeColor]
  );

  // Handle answer selection
  const handleSelect = (item) => {
    // Ignore taps while feedback audio is playing — a fast second tap would
    // start another clip on top of the one still speaking.
    if (locked()) return;
    // Only lock input after a correct answer — during wrong-answer feedback
    // the dash-highlighted correct option invites a retry, so let it through.
    if (selectedAnswer !== null && isCorrect) return;
    clearTimeout(wrongResetTimerRef.current);
    cancel(); // an in-flight question shouldn't keep talking under the feedback

    setSelectedAnswer(item.id);
    const isRight = item.id === correctAnswer.id;

    withLock(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      if (isRight) {
        setIsCorrect(true);
        const newCount = correctCount + 1;
        setCorrectCount(newCount);
        track('answer', {
          category,
          mode: 'test',
          item: correctAnswer.enName ?? correctAnswer.name,
          meta: { correct: true, difficulty },
        });
        await playPositive(newCount);
      } else {
        setIsCorrect(false);
        track('answer', {
          category,
          mode: 'test',
          item: correctAnswer.enName ?? correctAnswer.name,
          meta: { correct: false, picked: item.enName ?? item.name, difficulty },
        });
        await playEncouragement();
        await speak([thatWasPart(item), tryToFindPart(correctAnswer)]);
      }
    }).then(() => {
      if (isRight) {
        // Wait a beat before advancing
        autoAdvanceTimerRef.current = setTimeout(() => {
          nextQuestion();
        }, 800);
      } else {
        // Reset only after the spoken correction ends, so the moment taps
        // work again is also the moment the board looks ready for a retry.
        wrongResetTimerRef.current = setTimeout(() => {
          setSelectedAnswer(null);
          setIsCorrect(null);
        }, 600);
      }
    });
  };

  // Touch handlers for long-press support on mobile
  const handleTouchStart = useCallback((e) => {
    const preventContextMenu = (ev) => ev.preventDefault();
    e.target.addEventListener('contextmenu', preventContextMenu, { once: true });
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  }, []);

  const handleSelectRef = useRef(handleSelect);
  handleSelectRef.current = handleSelect;

  const createTouchEndHandler = useCallback((item) => (e) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    if (dx < 50 && dy < 50) {
      e.preventDefault();
      handleSelectRef.current(item);
    }
    touchStartRef.current = null;
  }, []);

  const touchProps = useCallback((item) => ({
    onTouchStart: handleTouchStart,
    onTouchEnd: createTouchEndHandler(item),
    onContextMenu: (e) => e.preventDefault(),
  }), [handleTouchStart, createTouchEndHandler]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat || ownedByFocusedControl(e)) return;
      if (!hasStarted && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        handleStart();
      } else if (e.key === 'ArrowRight' && isCorrect === true && !testComplete) {
        // !testComplete: after the final answer the arrow belongs to the
        // recap overlay — re-running nextQuestion here would re-open it
        // (and award a second sticker)
        nextQuestion();
      } else if (e.key === 'r' || e.key === 'R') {
        askQuestion();
      } else if (hasStarted && !testComplete && /^[1-9]$/.test(e.key)) {
        // Options read left-to-right, top-to-bottom, so key N = Nth option
        const item = options[Number(e.key) - 1];
        if (item) handleSelectRef.current(item);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, isCorrect, nextQuestion, askQuestion, options, testComplete]);

  // Quiz choices show every object too (a child counts them); the size
  // steps down with the range so a 1–40 option stays a tidy card
  const choiceCell =
    items.length <= 10 ? '1.5rem' : items.length <= 20 ? '1.25rem' : '1rem';

  const renderOption = (item) => {
    const isSelected = selectedAnswer === item.id;
    const isCorrectAnswer = item.id === correctAnswer?.id;
    const showResult = selectedAnswer !== null;

    // Same feedback language as MatchGame/SceneQuiz: border-4 + pop/shake
    let bgClass = 'bg-white hover:bg-gray-50';
    let borderClass = 'border-4 border-transparent';

    if (showResult && isSelected) {
      if (isCorrect) {
        bgClass = 'bg-green-50';
        borderClass = 'border-4 border-green-500 opposites-pop';
      } else {
        bgClass = 'bg-red-50';
        borderClass = 'border-4 border-red-400 opposites-shake';
      }
    } else if (showResult && isCorrectAnswer && !isCorrect) {
      borderClass = 'border-4 border-green-500 border-dashed';
    }

    const baseClasses = `
      rounded-2xl shadow-lg cursor-pointer transition-all duration-200 select-none
      ${bgClass} ${borderClass}
      ${selectedAnswer === null ? 'motion-safe:hover:scale-105 hover:shadow-xl' : ''}
    `;

    switch (category) {
      case 'alphabets':
        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item)}
            {...touchProps(item)}
            disabled={selectedAnswer !== null && isCorrect}
            className={`${baseClasses} p-6 md:p-8 flex items-center justify-center`}
          >
            <span className="text-5xl md:text-7xl font-bold text-gray-600">
              {item.display}
            </span>
          </button>
        );

      case 'numbers':
        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item)}
            {...touchProps(item)}
            disabled={selectedAnswer !== null && isCorrect}
            className={`${baseClasses} p-6 md:p-8 flex flex-col items-center justify-center gap-3`}
          >
            <span className="text-4xl md:text-6xl font-bold text-gray-500">
              {item.value}
            </span>
            <CountingFrames
              count={item.value}
              icon={objectIcons?.[objectType] || '🥚'}
              cell={choiceCell}
            />
          </button>
        );

      case 'colors':
        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item)}
            {...touchProps(item)}
            disabled={selectedAnswer !== null && isCorrect}
            className={`${baseClasses} p-4 aspect-square flex items-center justify-center`}
            style={{
              backgroundColor: showResult ? undefined : item.hex,
              border: item.name === 'White' && !showResult ? '2px solid #e5e7eb' : undefined,
            }}
          >
            {showResult ? (
              <div
                className="w-[var(--img-tile)] h-[var(--img-tile)] rounded-full"
                style={{
                  backgroundColor: item.hex,
                  border: item.name === 'White' ? '2px solid #e5e7eb' : 'none',
                }}
              />
            ) : null}
          </button>
        );

      case 'shapes':
        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item)}
            {...touchProps(item)}
            disabled={selectedAnswer !== null && isCorrect}
            className={`${baseClasses} p-6 md:p-8 flex items-center justify-center`}
          >
            <div className="w-[var(--img-tile)] h-[var(--img-tile)]">{item.svg(shapeColor)}</div>
          </button>
        );

      default:
        if (category?.startsWith('phonics-')) {
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              {...touchProps(item)}
              disabled={selectedAnswer !== null && isCorrect}
              className={`${baseClasses} p-6 md:p-8 flex items-center justify-center`}
            >
              {/* My Words entries have no rime split — one plain word,
                  smaller so long ones still fit the answer card */}
              <span
                className={`${
                  item.onset ? 'text-4xl md:text-6xl' : 'text-2xl md:text-4xl break-words min-w-0'
                } font-bold tracking-wide ${caseClass}`}
              >
                {item.onset ? (
                  <>
                    <span className="text-gray-700">{item.onset}</span>
                    <span className="text-orange-500">{item.rime}</span>
                  </>
                ) : (
                  <span className="text-gray-700">{item.name}</span>
                )}
              </span>
            </button>
          );
        }
        if (item.image || item.video) {
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              {...touchProps(item)}
              disabled={selectedAnswer !== null && isCorrect}
              className={`${baseClasses} p-1 flex flex-col items-center justify-center gap-1`}
            >
              <ItemMedia
                item={item}
                alt={showResult ? item.name : ''}
                className="w-full aspect-square object-contain rounded-lg"
              />
              {showResult && (
                <span className={`text-base md:text-lg font-medium text-gray-600 ${caseClass}`}>
                  {item.name}
                </span>
              )}
            </button>
          );
        }
        return null;
    }
  };

  const getGridCols = () => {
    const count = options.length;
    if (count <= 3) return 'grid-cols-3';
    if (count <= 4) return 'grid-cols-2 md:grid-cols-4';
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3';
    // Hard mode can show every item (26 letters) — denser columns, and the
    // scroll container below keeps the tall grid reachable
    if (count > 12) return 'grid-cols-4 md:grid-cols-6';
    return 'grid-cols-3 md:grid-cols-4';
  };

  // Test complete screen
  if (testComplete) {
    return (
      <>
      {showRecap && (
        <SessionRecap
          category={category}
          mode="test"
          tiles={recapTiles}
          onDone={() => setShowRecap(false)}
        />
      )}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="text-center">
          <div className="text-6xl md:text-8xl mb-6">🏆</div>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-700 mb-4">
            {t('test.complete')}
          </h2>
          <p className="text-lg md:text-xl text-gray-500 mb-8">
            {t('test.completeMsg', { count: items.length })}
          </p>
          <button
            onClick={handleRestart}
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-500 text-white rounded-xl font-semibold text-xl hover:bg-blue-600 transition-colors shadow-lg"
          >
            <Play size={28} />
            {t('test.startAgain')}
          </button>
        </div>
      </div>
      </>
    );
  }

  // Start screen
  if (!hasStarted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-700 mb-6">
            {t('test.ready')}
          </h2>
          <p className="text-lg text-gray-500 mb-8">
            {t('test.readyHint')}
          </p>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-500 text-white rounded-xl font-semibold text-xl hover:bg-blue-600 transition-colors shadow-lg"
          >
            <Play size={28} />
            {t('test.start')}
          </button>
          <p className="text-gray-400 text-sm mt-4">{t('test.orPress')}</p>
        </div>
      </div>
    );
  }

  return (
    // Scrollable so hard mode's full grid stays reachable; my-auto on the
    // wrapper centers short content and lets tall content scroll from the top
    // (justify-center would clip the top of an overflowing flex column)
    <div className="flex-1 min-h-0 flex flex-col items-center overflow-y-auto p-4 md:p-8">
      <div className="my-auto w-full max-w-5xl flex flex-col items-center">
        {/* Question prompt — the template splits around {name} so the
            answer word keeps its highlight in any word order */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl md:text-4xl font-bold text-gray-700 mb-4">
            {(() => {
              // Sentinel split keeps the answer word highlighted wherever
              // the locale's word order puts it
              const [before, after = ''] = t('test.whichOne', { name: '\u0000' }).split('\u0000');
              return (
                <>
                  {before}
                  <span className={`text-blue-600 ${caseClass}`}>{correctAnswer?.name}</span>
                  {after}
                </>
              );
            })()}
          </h2>
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={askQuestion}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Volume2 size={20} />
              {t('test.repeat')}
            </button>
          </div>
        </div>

        {/* Options grid */}
        <div className={`grid ${getGridCols()} gap-4 md:gap-6 w-full mb-4`}>
          {options.map((item) => renderOption(item))}
        </div>

        {/* Result feedback — praise audio auto-advances, so no Next button
            that would vanish before anyone could tap it. Fixed-height slot so
            the instructions below don't jump when feedback appears. */}
        <div className="min-h-16 md:min-h-20 flex items-center justify-center">
          {isCorrect === true && <div className="text-4xl md:text-6xl">🎉</div>}
          {isCorrect === false && (
            <span className="text-xl text-orange-600 font-medium">
              {t('test.tryAgain', { name: correctAnswer?.name })}
            </span>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-2 text-gray-400 text-xs md:text-sm text-center">
          {t('test.keysHint', { max: Math.min(options.length, 9) })}
        </div>
      </div>
    </div>
  );
};

export default TestingMode;
