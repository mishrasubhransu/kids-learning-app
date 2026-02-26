import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronRight, Volume2, Play } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';
import { getRandomPositive, getRandomEncouragement } from '../../utils/feedback';

const TestingMode = ({ items, category, difficulty, objectIcons, shapeColor }) => {
  const [options, setOptions] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [objectType] = useState('eggs');
  const { speak } = useSpeech();
  const autoAdvanceTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

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

  // Generate new question and return the correct answer
  const generateQuestion = useCallback(() => {
    const count = getOptionCount();
    const shuffledItems = shuffle(items);
    const selectedOptions = shuffledItems.slice(0, count);
    const correct = selectedOptions[Math.floor(Math.random() * selectedOptions.length)];

    setOptions(shuffle(selectedOptions));
    setCorrectAnswer(correct);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setCountdown(null);

    // Clear any pending timers
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    return correct; // Return the new correct answer
  }, [items, getOptionCount]);

  // Initialize on mount and difficulty change
  useEffect(() => {
    generateQuestion();
    setHasStarted(false);
  }, [generateQuestion, difficulty]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  // Speak the question - uses current correctAnswer state
  const askQuestion = useCallback(() => {
    if (correctAnswer) {
      speak(`Which one is ${correctAnswer.name}?`);
    }
  }, [correctAnswer, speak]);

  // Speak question for a specific answer (used after generating new question)
  const askQuestionFor = useCallback((answer) => {
    if (answer) {
      speak(`Which one is ${answer.name}?`);
    }
  }, [speak]);

  // Start the test
  const handleStart = () => {
    setHasStarted(true);
    setTimeout(() => {
      askQuestion();
    }, 100);
  };

  // Next question with proper timing
  const nextQuestion = useCallback(() => {
    // Clear timers
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setCountdown(null);

    // Generate new question and get the new correct answer
    const newCorrect = generateQuestion();

    // Speak the NEW question after a short delay
    setTimeout(() => {
      askQuestionFor(newCorrect);
    }, 400);
  }, [generateQuestion, askQuestionFor]);

  // Handle answer selection
  const handleSelect = (item) => {
    if (selectedAnswer !== null) return; // Already answered

    setSelectedAnswer(item.id);

    setTimeout(() => {
      if (item.id === correctAnswer.id) {
        setIsCorrect(true);
        const feedback = getRandomPositive();
        speak(feedback);

        // Start countdown for auto-advance
        let secondsLeft = 2;
        setCountdown(secondsLeft);

        countdownTimerRef.current = setInterval(() => {
          secondsLeft -= 1;
          setCountdown(secondsLeft);
          if (secondsLeft <= 0) {
            clearInterval(countdownTimerRef.current);
          }
        }, 1000);

        // Auto-advance after 3 seconds
        autoAdvanceTimerRef.current = setTimeout(() => {
          nextQuestion();
        }, 3000);
      } else {
        setIsCorrect(false);
        const feedback = `${getRandomEncouragement()} That was ${item.name}. Try to find ${correctAnswer.name}.`;
        speak(feedback);
        // Reset selection after feedback
        setTimeout(() => {
          setSelectedAnswer(null);
          setIsCorrect(null);
        }, 3000);
      }
    }, 50);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (!hasStarted && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        handleStart();
      } else if (e.key === 'ArrowRight' && isCorrect === true) {
        nextQuestion();
      } else if (e.key === 'r' || e.key === 'R') {
        askQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasStarted, isCorrect, nextQuestion, askQuestion]);

  const renderOption = (item) => {
    const isSelected = selectedAnswer === item.id;
    const isCorrectAnswer = item.id === correctAnswer?.id;
    const showResult = selectedAnswer !== null;

    let bgClass = 'bg-white hover:bg-gray-50';
    let borderClass = 'border-2 border-transparent';

    if (showResult && isSelected) {
      if (isCorrect) {
        bgClass = 'bg-green-100';
        borderClass = 'border-2 border-green-500';
      } else {
        bgClass = 'bg-red-100';
        borderClass = 'border-2 border-red-500';
      }
    } else if (showResult && isCorrectAnswer && !isCorrect) {
      borderClass = 'border-2 border-green-500 border-dashed';
    }

    const baseClasses = `
      rounded-2xl shadow-lg cursor-pointer transition-all duration-200
      ${bgClass} ${borderClass}
      ${selectedAnswer === null ? 'hover:scale-105 hover:shadow-xl' : ''}
    `;

    switch (category) {
      case 'alphabets':
        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item)}
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
            disabled={selectedAnswer !== null && isCorrect}
            className={`${baseClasses} p-6 md:p-8 flex flex-col items-center justify-center gap-3`}
          >
            <span className="text-4xl md:text-6xl font-bold text-gray-500">
              {item.value}
            </span>
            <div className="grid grid-cols-5 justify-items-center gap-1">
              {Array.from({ length: item.value }).map((_, i) => (
                <span key={i} className="text-2xl">
                  {objectIcons?.[objectType] || '🥚'}
                </span>
              ))}
            </div>
          </button>
        );

      case 'colors':
        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item)}
            disabled={selectedAnswer !== null && isCorrect}
            className={`${baseClasses} p-4 aspect-square flex items-center justify-center`}
            style={{
              backgroundColor: showResult ? undefined : item.hex,
              border: item.name === 'White' && !showResult ? '2px solid #e5e7eb' : undefined,
            }}
          >
            {showResult ? (
              <div
                className="w-16 h-16 md:w-24 md:h-24 rounded-full"
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
            disabled={selectedAnswer !== null && isCorrect}
            className={`${baseClasses} p-6 md:p-8 flex items-center justify-center`}
          >
            <div className="w-20 h-20 md:w-28 md:h-28">{item.svg(shapeColor)}</div>
          </button>
        );

      default:
        return null;
    }
  };

  const getGridCols = () => {
    const count = options.length;
    if (count <= 3) return 'grid-cols-3';
    if (count <= 4) return 'grid-cols-2 md:grid-cols-4';
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-3 md:grid-cols-4';
  };

  // Start screen
  if (!hasStarted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-700 mb-6">
            Ready to Test?
          </h2>
          <p className="text-lg text-gray-500 mb-8">
            Click the button below to start. Listen to the question and click the correct answer!
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

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
      {/* Question prompt */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl md:text-4xl font-bold text-gray-700 mb-4">
          Which one is{' '}
          <span className="text-blue-600">{correctAnswer?.name}</span>?
        </h2>
        <button
          onClick={askQuestion}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
        >
          <Volume2 size={20} />
          Repeat question
        </button>
      </div>

      {/* Options grid */}
      <div className={`grid ${getGridCols()} gap-4 md:gap-6 max-w-3xl w-full mb-8`}>
        {options.map((item) => renderOption(item))}
      </div>

      {/* Result feedback and next button */}
      {isCorrect === true && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl md:text-6xl">🎉</div>
          <button
            onClick={nextQuestion}
            className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold text-lg hover:bg-green-600 transition-colors shadow-lg"
          >
            Next {countdown !== null && countdown > 0 && `(${countdown})`}
            <ChevronRight size={24} />
          </button>
          <span className="text-gray-400 text-sm">
            Auto-advancing in {countdown}s or press Right Arrow
          </span>
        </div>
      )}

      {isCorrect === false && (
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl text-orange-600 font-medium">
            Try again! Find {correctAnswer?.name}
          </span>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-6 text-gray-400 text-xs md:text-sm text-center">
        Press R to repeat the question
      </div>
    </div>
  );
};

export default TestingMode;
