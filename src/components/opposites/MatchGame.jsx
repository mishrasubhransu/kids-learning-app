import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, Play } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';
import useAudioFeedback from '../../hooks/useAudioFeedback';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Each round: one prompt word, its opposite among distractors from other pairs.
function buildRounds(items, difficulty) {
  let roundCount;
  let choiceCount;
  switch (difficulty) {
    case 'easy':
      roundCount = 5;
      choiceCount = 2;
      break;
    case 'medium':
      roundCount = 10;
      choiceCount = 3;
      break;
    default:
      roundCount = items.length;
      choiceCount = 4;
  }

  return shuffle(items).slice(0, roundCount).map((pair) => {
    const promptSide = Math.floor(Math.random() * 2);
    const promptWord = pair.pair[promptSide];
    const answerWord = pair.pair[1 - promptSide];

    const distractors = shuffle(items.filter((p) => p.id !== pair.id))
      .slice(0, choiceCount - 1)
      .map((p) => {
        const side = Math.floor(Math.random() * 2);
        return { word: p.pair[side], image: p.images[p.pair[side]] };
      });

    return {
      promptWord,
      promptImage: pair.images[promptWord],
      answerWord,
      choices: shuffle([
        { word: answerWord, image: pair.images[answerWord] },
        ...distractors,
      ]),
    };
  });
}

const MatchGame = ({ items, difficulty }) => {
  const [rounds, setRounds] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const { speak } = useSpeech();
  const { playPositive, playEncouragement } = useAudioFeedback();
  const advanceTimerRef = useRef(null);

  const current = rounds[currentIdx];

  const resetGame = useCallback(() => {
    setRounds(buildRounds(items, difficulty));
    setCurrentIdx(0);
    setSelected(null);
    setIsCorrect(null);
    setCorrectCount(0);
    setGameComplete(false);
  }, [items, difficulty]);

  useEffect(() => {
    resetGame();
    setHasStarted(false);
  }, [resetGame]);

  useEffect(() => {
    return () => clearTimeout(advanceTimerRef.current);
  }, []);

  const askRound = useCallback((round) => {
    if (round) speak(`What is the opposite of ${round.promptWord}?`);
  }, [speak]);

  const handleStart = () => {
    setHasStarted(true);
    setTimeout(() => askRound(rounds[0]), 100);
  };

  const handleRestart = () => {
    const fresh = buildRounds(items, difficulty);
    setRounds(fresh);
    setCurrentIdx(0);
    setSelected(null);
    setIsCorrect(null);
    setCorrectCount(0);
    setGameComplete(false);
    setHasStarted(true);
    setTimeout(() => askRound(fresh[0]), 400);
  };

  const nextRound = useCallback(() => {
    clearTimeout(advanceTimerRef.current);
    if (currentIdx >= rounds.length - 1) {
      setGameComplete(true);
      return;
    }
    const nextIdx = currentIdx + 1;
    setCurrentIdx(nextIdx);
    setSelected(null);
    setIsCorrect(null);
    setTimeout(() => askRound(rounds[nextIdx]), 400);
  }, [currentIdx, rounds, askRound]);

  const handleSelect = (word) => {
    if (selected !== null && isCorrect) return;
    setSelected(word);

    if (word === current.answerWord) {
      setIsCorrect(true);
      const newCount = correctCount + 1;
      setCorrectCount(newCount);
      playPositive(newCount).then(() => {
        advanceTimerRef.current = setTimeout(() => nextRound(), 800);
      });
    } else {
      setIsCorrect(false);
      playEncouragement().then(() => {
        speak(`${word} is not the opposite of ${current.promptWord}. Try again!`);
      });
      setTimeout(() => {
        setSelected(null);
        setIsCorrect(null);
      }, 2000);
    }
  };

  // Keyboard: space/enter to start, R to repeat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (!hasStarted && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        handleStart();
      } else if (e.key === 'r' || e.key === 'R') {
        askRound(current);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, current, askRound]);

  if (gameComplete) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="text-center">
          <div className="text-6xl md:text-8xl mb-6">🏆</div>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-700 mb-4">
            All Matched!
          </h2>
          <p className="text-lg md:text-xl text-gray-500 mb-8">
            You found {rounds.length} opposites. Great job!
          </p>
          <button
            onClick={handleRestart}
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-500 text-white rounded-xl font-semibold text-xl hover:bg-blue-600 transition-colors shadow-lg"
          >
            <Play size={28} />
            Play Again
          </button>
        </div>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-700 mb-6">
            Match the Opposites!
          </h2>
          <p className="text-lg text-gray-500 mb-8">
            Look at the picture, then find its opposite.
          </p>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-3 px-8 py-4 bg-blue-500 text-white rounded-xl font-semibold text-xl hover:bg-blue-600 transition-colors shadow-lg"
          >
            <Play size={28} />
            Start
          </button>
          <p className="text-gray-400 text-sm mt-4">or press Space / Enter</p>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const getChoiceStyle = (word) => {
    if (selected === null) {
      return 'bg-white border-4 border-transparent hover:border-blue-200 hover:scale-105';
    }
    if (selected === word) {
      return isCorrect
        ? 'bg-green-50 border-4 border-green-500 opposites-pop'
        : 'bg-red-50 border-4 border-red-400 opposites-shake';
    }
    return 'bg-white border-4 border-transparent opacity-60';
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 relative">
      {/* Progress */}
      <div className="absolute top-3 right-4 text-sm md:text-base text-gray-400 font-medium">
        {currentIdx + 1} / {rounds.length}
      </div>

      {/* Prompt card */}
      <div className="flex flex-col items-center mb-6">
        <div className="rounded-3xl bg-white shadow-xl border-8 border-orange-300 p-3 md:p-4 flex flex-col items-center gap-1">
          <img
            src={current.promptImage}
            alt={current.promptWord}
            className="w-28 h-28 md:w-40 md:h-40 object-contain rounded-xl"
            draggable={false}
          />
          <span className="text-2xl md:text-3xl font-black uppercase text-orange-500">
            {current.promptWord}
          </span>
        </div>
        <button
          onClick={() => askRound(current)}
          className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm md:text-base"
        >
          <Volume2 size={18} />
          What is the opposite of {current.promptWord}?
        </button>
      </div>

      {/* Choices */}
      <div className="flex flex-wrap justify-center gap-4 md:gap-6">
        {current.choices.map((choice) => (
          <button
            key={choice.word}
            onClick={() => handleSelect(choice.word)}
            disabled={selected !== null && isCorrect}
            className={`${getChoiceStyle(choice.word)} rounded-2xl shadow-lg p-3 md:p-4 flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer`}
          >
            <img
              src={choice.image}
              alt={choice.word}
              className="w-24 h-24 md:w-36 md:h-36 object-contain rounded-xl pointer-events-none"
              draggable={false}
            />
            <span className="text-xl md:text-2xl font-bold text-gray-700">
              {choice.word}
            </span>
          </button>
        ))}
      </div>

      {/* Feedback */}
      <div className="h-12 md:h-16 flex items-center justify-center mt-4">
        {isCorrect === true && <div className="text-4xl md:text-5xl">🎉</div>}
        {isCorrect === false && (
          <span className="text-xl text-orange-600 font-medium">Try again!</span>
        )}
      </div>

      <div className="absolute bottom-3 text-gray-400 text-xs md:text-sm">
        Press R to hear the question again
      </div>
    </div>
  );
};

export default MatchGame;
