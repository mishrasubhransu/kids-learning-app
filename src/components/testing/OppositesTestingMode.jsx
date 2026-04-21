import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, Play } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';
import useAudioFeedback from '../../hooks/useAudioFeedback';

const OppositesTestingMode = ({ items, difficulty }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [testComplete, setTestComplete] = useState(false);
  const { speak } = useSpeech();
  const { playPositive, playEncouragement } = useAudioFeedback();
  const autoAdvanceTimerRef = useRef(null);
  const touchStartRef = useRef(null);

  // Build question pool based on difficulty
  const buildQuestions = useCallback(() => {
    let pairCount;
    switch (difficulty) {
      case 'easy': pairCount = 5; break;
      case 'medium': pairCount = 10; break;
      default: pairCount = items.length;
    }
    const selected = items.slice(0, pairCount);
    const allTests = selected.flatMap((pair) =>
      pair.tests.map((t) => ({ ...t, pair: pair.pair, images: pair.images }))
    );
    // Shuffle
    for (let i = allTests.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allTests[i], allTests[j]] = [allTests[j], allTests[i]];
    }
    return allTests;
  }, [items, difficulty]);

  useEffect(() => {
    const q = buildQuestions();
    setQuestions(q);
    setCurrentIdx(0);
    setCorrectCount(0);
    setTestComplete(false);
    setHasStarted(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
  }, [buildQuestions]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

  const current = questions[currentIdx];

  const askQuestion = useCallback(() => {
    if (current) speak(current.question);
  }, [current, speak]);

  const handleStart = () => {
    setHasStarted(true);
    setTimeout(() => askQuestion(), 100);
  };

  const handleRestart = () => {
    const q = buildQuestions();
    setQuestions(q);
    setCurrentIdx(0);
    setCorrectCount(0);
    setTestComplete(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setTimeout(() => {
      if (q[0]) speak(q[0].question);
    }, 400);
  };

  const nextQuestion = useCallback(() => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    if (currentIdx >= questions.length - 1) {
      setTestComplete(true);
      return;
    }
    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setTimeout(() => {
      if (questions[nextIdx]) speak(questions[nextIdx].question);
    }, 400);
  }, [currentIdx, questions, speak]);

  const handleSelect = (word) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(word);

    setTimeout(() => {
      if (word === current.correctAnswer) {
        setIsCorrect(true);
        const newCount = correctCount + 1;
        setCorrectCount(newCount);
        playPositive(newCount).then(() => {
          autoAdvanceTimerRef.current = setTimeout(() => nextQuestion(), 800);
        });
      } else {
        setIsCorrect(false);
        playEncouragement().then(() => {
          speak(`That was ${word}. The answer is ${current.correctAnswer}.`);
        });
        setTimeout(() => {
          setSelectedAnswer(null);
          setIsCorrect(null);
        }, 3000);
      }
    }, 50);
  };

  const handleTouchStart = useCallback((e) => {
    const preventContextMenu = (ev) => ev.preventDefault();
    e.target.addEventListener('contextmenu', preventContextMenu, { once: true });
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleSelectRef = useRef(handleSelect);
  handleSelectRef.current = handleSelect;

  const createTouchEndHandler = useCallback((word) => (e) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    if (dx < 50 && dy < 50) {
      e.preventDefault();
      handleSelectRef.current(word);
    }
    touchStartRef.current = null;
  }, []);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (!hasStarted && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        handleStart();
      } else if (e.key === 'r' || e.key === 'R') {
        askQuestion();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, askQuestion]);

  if (testComplete) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="text-center">
          <div className="text-6xl md:text-8xl mb-6">🏆</div>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-700 mb-4">Test Complete!</h2>
          <p className="text-lg md:text-xl text-gray-500 mb-8">
            You answered {questions.length} questions. Great job!
          </p>
          <button
            onClick={handleRestart}
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-500 text-white rounded-xl font-semibold text-xl hover:bg-blue-600 transition-colors shadow-lg"
          >
            <Play size={28} />
            Start Again
          </button>
        </div>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-700 mb-6">Ready to Test?</h2>
          <p className="text-lg text-gray-500 mb-8">
            Listen to the question and pick the right answer!
          </p>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-500 text-white rounded-xl font-semibold text-xl hover:bg-blue-600 transition-colors shadow-lg"
          >
            <Play size={28} />
            Start Test
          </button>
          <p className="text-gray-400 text-sm mt-4">or press Space / Enter</p>
        </div>
      </div>
    );
  }

  if (!current) return null;

  // Randomize button order per question
  const buttonOrder = currentIdx % 2 === 0 ? current.pair : [...current.pair].reverse();

  const getButtonStyle = (word) => {
    if (selectedAnswer === null) return 'bg-white hover:bg-gray-50 border-2 border-transparent hover:scale-105';
    if (selectedAnswer === word) {
      return isCorrect
        ? 'bg-green-100 border-2 border-green-500'
        : 'bg-red-100 border-2 border-red-500';
    }
    if (!isCorrect && word === current.correctAnswer) {
      return 'bg-white border-2 border-green-500 border-dashed';
    }
    return 'bg-white border-2 border-transparent';
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
      {/* Question */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl md:text-4xl font-bold text-gray-700 mb-4">
          {current.question}
        </h2>
        <button
          onClick={askQuestion}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
        >
          <Volume2 size={20} />
          Repeat question
        </button>
      </div>

      {/* Scene image */}
      <img
        src={current.sceneImage}
        alt="scene"
        className="w-64 h-64 md:w-80 md:h-80 object-contain rounded-2xl shadow-lg bg-white mb-8"
      />

      {/* Two answer buttons */}
      <div className="flex gap-4 md:gap-8 mb-8">
        {buttonOrder.map((word) => (
          <button
            key={word}
            onClick={() => handleSelect(word)}
            onTouchStart={handleTouchStart}
            onTouchEnd={createTouchEndHandler(word)}
            onContextMenu={(e) => e.preventDefault()}
            disabled={selectedAnswer !== null && isCorrect}
            className={`${getButtonStyle(word)} rounded-2xl shadow-lg px-8 py-6 md:px-12 md:py-8 transition-all duration-200 cursor-pointer select-none`}
          >
            <span className="text-2xl md:text-4xl font-bold text-gray-700">{word}</span>
          </button>
        ))}
      </div>

      {/* Feedback */}
      {isCorrect === true && <div className="text-4xl md:text-6xl">🎉</div>}
      {isCorrect === false && (
        <span className="text-xl text-orange-600 font-medium">
          Try again!
        </span>
      )}

      <div className="absolute bottom-6 text-gray-400 text-xs md:text-sm text-center">
        Press R to repeat the question
      </div>
    </div>
  );
};

export default OppositesTestingMode;
