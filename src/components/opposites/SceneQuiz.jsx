import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, Play } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';
import useAudioFeedback from '../../hooks/useAudioFeedback';
import preloadImages from '../../utils/preloadImages';
import ownedByFocusedControl from '../../utils/ownedByFocusedControl';

const SceneQuiz = ({ items, difficulty }) => {
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
  const wrongResetTimerRef = useRef(null);

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
    for (let i = allTests.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allTests[i], allTests[j]] = [allTests[j], allTests[i]];
    }
    return allTests;
  }, [items, difficulty]);

  useEffect(() => {
    setQuestions(buildQuestions());
    setCurrentIdx(0);
    setCorrectCount(0);
    setTestComplete(false);
    setHasStarted(false);
    setSelectedAnswer(null);
    setIsCorrect(null);
  }, [buildQuestions]);

  useEffect(() => {
    return () => {
      clearTimeout(autoAdvanceTimerRef.current);
      clearTimeout(wrongResetTimerRef.current);
    };
  }, []);

  const current = questions[currentIdx];

  // Warm the current question's choice images (covers the start screen)
  // and the next question's
  useEffect(() => {
    const targets = [questions[currentIdx], questions[currentIdx + 1]].filter(
      Boolean
    );
    preloadImages(targets.flatMap((q) => q.pair.map((w) => q.images[w])));
  }, [questions, currentIdx]);

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
    clearTimeout(autoAdvanceTimerRef.current);
    clearTimeout(wrongResetTimerRef.current);
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
    // Only lock input after a correct answer — during wrong-answer feedback
    // the highlighted correct card invites a retry, so let it through.
    if (selectedAnswer !== null && isCorrect) return;
    clearTimeout(wrongResetTimerRef.current);
    setSelectedAnswer(word);

    if (word === current.correctAnswer) {
      setIsCorrect(true);
      const newCount = correctCount + 1;
      setCorrectCount(newCount);
      playPositive(newCount).then(() => {
        autoAdvanceTimerRef.current = setTimeout(() => nextQuestion(), 800);
      });
    } else {
      setIsCorrect(false);
      // Name what they picked but don't reveal the answer — the dashed
      // hint plus immediate retry lets them find it themselves.
      playEncouragement().then(() => {
        speak(`That was ${word}.`);
      });
      wrongResetTimerRef.current = setTimeout(() => {
        setSelectedAnswer(null);
        setIsCorrect(null);
      }, 2000);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat || ownedByFocusedControl(e)) return;
      if (!hasStarted && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        handleStart();
      } else if (e.key === 'r' || e.key === 'R') {
        askQuestion();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, askQuestion]);

  if (testComplete) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="text-center">
          <div className="text-6xl md:text-8xl mb-6">🏆</div>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-700 mb-4">Quiz Complete!</h2>
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
          <h2 className="text-3xl md:text-5xl font-bold text-gray-700 mb-6">Ready for the Quiz?</h2>
          <p className="text-lg text-gray-500 mb-8">
            Look at the picture, listen, and tap the right answer!
          </p>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-500 text-white rounded-xl font-semibold text-xl hover:bg-blue-600 transition-colors shadow-lg"
          >
            <Play size={28} />
            Start Quiz
          </button>
          <p className="text-gray-400 text-sm mt-4">or press Space / Enter</p>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const buttonOrder = currentIdx % 2 === 0 ? current.pair : [...current.pair].reverse();

  const getButtonStyle = (word) => {
    if (selectedAnswer === null) {
      return 'bg-white border-4 border-transparent hover:border-blue-200 hover:scale-105';
    }
    if (selectedAnswer === word) {
      return isCorrect
        ? 'bg-green-50 border-4 border-green-500 opposites-pop'
        : 'bg-red-50 border-4 border-red-400 opposites-shake';
    }
    if (!isCorrect && word === current.correctAnswer) {
      return 'bg-white border-4 border-green-500 border-dashed';
    }
    return 'bg-white border-4 border-transparent opacity-60';
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 relative">
      {/* Progress */}
      <div className="absolute top-3 right-4 text-sm md:text-base text-gray-400 font-medium">
        {currentIdx + 1} / {questions.length}
      </div>

      {/* Question */}
      <div className="mb-4 text-center">
        <h2 className="text-2xl md:text-4xl font-bold text-gray-700 mb-3">
          {current.question}
        </h2>
        <button
          onClick={askQuestion}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm md:text-base"
        >
          <Volume2 size={18} />
          Repeat question
        </button>
      </div>

      {/* Image answer buttons */}
      <div className="flex gap-4 md:gap-8">
        {buttonOrder.map((word) => (
          <button
            key={word}
            onClick={() => handleSelect(word)}
            disabled={selectedAnswer !== null && isCorrect}
            className={`${getButtonStyle(word)} rounded-2xl shadow-lg p-3 md:p-4 flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer select-none`}
          >
            <img
              src={current.images[word]}
              alt={word}
              className="w-[var(--img-choice)] h-[var(--img-choice)] object-contain rounded-xl pointer-events-none"
              draggable={false}
            />
            <span className="text-xl md:text-3xl font-bold text-gray-700">{word}</span>
          </button>
        ))}
      </div>

      {/* Feedback */}
      <div className="h-12 md:h-14 flex items-center justify-center mt-3">
        {isCorrect === true && <div className="text-4xl md:text-5xl">🎉</div>}
        {isCorrect === false && (
          <span className="text-xl text-orange-600 font-medium">Try again!</span>
        )}
      </div>

      <div className="absolute bottom-3 text-gray-400 text-xs md:text-sm">
        Press R to repeat the question
      </div>
    </div>
  );
};

export default SceneQuiz;
