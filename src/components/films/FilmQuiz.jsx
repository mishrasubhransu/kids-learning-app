import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clapperboard, Play, RotateCcw, Volume2 } from 'lucide-react';
import FilmHeader from './FilmHeader';
import { cameByTap } from './arrival';
import useVoice from '../../hooks/useVoice';
import useAudioFeedback from '../../hooks/useAudioFeedback';
import useAudioLock from '../../hooks/useAudioLock';
import preloadImages from '../../utils/preloadImages';
import ownedByFocusedControl from '../../utils/ownedByFocusedControl';
import shuffle from '../../utils/shuffle';
import SessionRecap from '../ui/SessionRecap';
import { useLocale } from '../../context/LocaleContext';
import { setScreenContext, track } from '../../lib/analytics';

// The test about ONE film (data/filmQuizzes.js): the narrator asks a
// question about what the film showed, and the child taps one of three
// pictures. Same feel as the other tests — praise and on to the next one
// when right; when wrong, a kind word, the right picture hinted with a
// dashed border, the question again, and another go.

const FilmQuiz = ({ base, catInfo, film, questions: source, category }) => {
  const { t, locale } = useLocale();
  const location = useLocation();
  const { speak, cancel } = useVoice();
  const { playPositive, playEncouragement } = useAudioFeedback();
  const { locked, withLock } = useAudioLock();

  // A fresh order each round, and the right picture in a different place
  const deal = useCallback(
    () => shuffle(source).map((q) => ({ ...q, options: shuffle(q.options) })),
    [source]
  );
  const [questions, setQuestions] = useState(deal);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [started, setStarted] = useState(() => cameByTap(location));
  const [complete, setComplete] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  // Praise builds with the streak; the score counts first-try answers only
  const [rightCount, setRightCount] = useState(0);
  const firstTry = useRef(0);
  const missed = useRef(false);
  const advanceTimer = useRef(null);
  const resetTimer = useRef(null);
  const askTimer = useRef(null);
  const clip = useRef(null);

  const current = questions[index];
  const item = film.enName ?? film.name;

  useEffect(() => {
    setScreenContext({ category, mode: 'quiz' });
    return () => setScreenContext({ mode: null });
  }, [category]);

  useEffect(() => {
    preloadImages(questions.flatMap((q) => q.options.map((o) => o.image)));
  }, [questions]);

  const hush = useCallback(() => {
    cancel();
    clip.current?.pause();
  }, [cancel]);

  // The question in the narrator's voice; the browser's voice stands in
  // where a language has no clip, or the clip won't load
  const ask = useCallback(
    (q) => {
      if (!q) return;
      hush();
      const url = q.audio[locale];
      if (!url) {
        speak(q.question);
        return;
      }
      const audio = new Audio(url);
      clip.current = audio;
      audio.onerror = () => {
        if (clip.current === audio) speak(q.question);
      };
      audio.play().catch(() => {});
    },
    [hush, locale, speak]
  );

  useEffect(
    () => () => {
      clearTimeout(advanceTimer.current);
      clearTimeout(resetTimer.current);
      clearTimeout(askTimer.current);
      clip.current?.pause();
    },
    []
  );

  // Arrived by tapping the game button: straight into the first question
  useEffect(() => {
    if (!started) return undefined;
    askTimer.current = setTimeout(() => ask(questions[0]), 400);
    return () => clearTimeout(askTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    setStarted(true);
    ask(current);
  };

  const next = useCallback(() => {
    clearTimeout(advanceTimer.current);
    clearTimeout(resetTimer.current);
    if (index >= questions.length - 1) {
      setComplete(true);
      setShowRecap(true);
      track('test_complete', {
        category,
        mode: 'quiz',
        item,
        meta: { correct: firstTry.current, total: questions.length },
      });
      return;
    }
    setIndex(index + 1);
    setPicked(null);
    setIsCorrect(null);
    missed.current = false;
    askTimer.current = setTimeout(() => ask(questions[index + 1]), 400);
  }, [index, questions, ask, category, item]);

  const restart = () => {
    const dealt = deal();
    setQuestions(dealt);
    setIndex(0);
    setPicked(null);
    setIsCorrect(null);
    setComplete(false);
    setRightCount(0);
    firstTry.current = 0;
    missed.current = false;
    askTimer.current = setTimeout(() => ask(dealt[0]), 400);
  };

  const select = (option) => {
    // No taps while praise or encouragement is speaking, or once it's right
    if (locked() || (picked !== null && isCorrect)) return;
    clearTimeout(resetTimer.current);
    clearTimeout(askTimer.current);
    hush();
    setPicked(option.id);
    const right = option.id === current.answer;
    track('answer', {
      category,
      mode: 'quiz',
      item: `${item}: ${current.id}`,
      meta: right ? { correct: true } : { correct: false, picked: option.id },
    });
    if (right) {
      setIsCorrect(true);
      if (!missed.current) firstTry.current += 1;
      const count = rightCount + 1;
      setRightCount(count);
      withLock(() => playPositive(count)).then(() => {
        advanceTimer.current = setTimeout(next, 800);
      });
    } else {
      setIsCorrect(false);
      missed.current = true;
      withLock(() => playEncouragement()).then(() => {
        // The board clears as the question is asked again — the child can
        // answer over it
        resetTimer.current = setTimeout(() => {
          setPicked(null);
          setIsCorrect(null);
          ask(current);
        }, 400);
      });
    }
  };
  const selectRef = useRef(select);
  selectRef.current = select;

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat || ownedByFocusedControl(e) || complete) return;
      if (!started) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          start();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (!locked()) ask(current);
      } else if (e.key === 'ArrowRight' && isCorrect === true) {
        next();
      } else if (/^[1-3]$/.test(e.key)) {
        const option = current?.options[Number(e.key) - 1];
        if (option) selectRef.current(option);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, complete, isCorrect, current, next, ask, locked]);

  const recapTiles = useMemo(
    () =>
      complete
        ? questions.map((q) => ({ images: [q.options.find((o) => o.id === q.answer).image] }))
        : [],
    [complete, questions]
  );

  const cardClass = (option) => {
    if (picked === null) {
      return 'bg-white border-transparent hover:border-blue-200 motion-safe:hover:scale-105';
    }
    if (picked === option.id) {
      return isCorrect
        ? 'bg-green-50 border-green-500 opposites-pop'
        : 'bg-red-50 border-red-400 opposites-shake';
    }
    if (!isCorrect && option.id === current.answer) {
      return 'bg-white border-green-500 border-dashed';
    }
    return 'bg-white border-transparent opacity-60';
  };

  const bigButton =
    'inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-xl transition-colors shadow-lg';

  let body;
  if (complete) {
    body = (
      <>
        {showRecap && (
          <SessionRecap
            category={category}
            mode="quiz"
            tiles={recapTiles}
            onDone={() => setShowRecap(false)}
          />
        )}
        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 text-center">
          <div className="text-6xl md:text-8xl mb-6" aria-hidden="true">🏆</div>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-700 mb-4">
            {t('film.quizDone')}
          </h2>
          <p className="text-lg md:text-xl text-gray-500 mb-8">
            {t('opposites.quizMsg', { count: questions.length })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={restart}
              className={`${bigButton} bg-blue-500 text-white hover:bg-blue-600`}
            >
              <RotateCcw size={26} />
              {t('test.startAgain')}
            </button>
            <Link
              to={base}
              className={`${bigButton} bg-white text-gray-700 hover:bg-gray-50`}
            >
              <Clapperboard size={26} />
              {t('film.more')}
            </Link>
          </div>
        </div>
      </>
    );
  } else if (!started) {
    body = (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-gray-700 mb-6">
          {t('film.quizReady')}
        </h2>
        <p className="text-lg text-gray-500 mb-8">{t('film.quizHint')}</p>
        <button
          type="button"
          onClick={start}
          className={`${bigButton} bg-blue-500 text-white hover:bg-blue-600`}
        >
          <Play size={28} />
          {t('opposites.start')}
        </button>
        <p className="text-gray-400 text-sm mt-4">{t('test.orPress')}</p>
      </div>
    );
  } else {
    body = (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center p-4 md:p-6 relative">
          <div className="absolute top-3 right-4 text-sm md:text-base text-gray-400 font-medium">
            {index + 1} / {questions.length}
          </div>

          <div className="mb-4 md:mb-6 mt-6 text-center">
            <h2 className="text-2xl md:text-4xl font-bold text-gray-700 mb-3">
              {current.question}
            </h2>
            <button
              type="button"
              onClick={() => !locked() && ask(current)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm md:text-base"
            >
              <Volume2 size={18} />
              {t('test.repeat')}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 md:gap-6 w-full max-w-4xl">
            {current.options.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => select(option)}
                disabled={picked !== null && isCorrect === true}
                className={`${cardClass(option)} border-4 rounded-2xl shadow-lg p-2 md:p-4 flex flex-col items-center gap-1 md:gap-2 transition-all duration-200 cursor-pointer select-none`}
              >
                <img
                  src={option.image}
                  alt=""
                  className="w-full aspect-square object-cover rounded-xl pointer-events-none"
                  draggable={false}
                />
                <span className="text-sm md:text-2xl font-bold text-gray-700 leading-tight min-h-[2.5em] md:min-h-0 flex items-center text-center">
                  {option.name}
                </span>
              </button>
            ))}
          </div>

          <div className="h-12 md:h-14 flex items-center justify-center mt-3">
            {isCorrect === true && <div className="text-4xl md:text-5xl">🎉</div>}
            {isCorrect === false && (
              <span className="text-xl text-orange-600 font-medium">
                {t('opposites.tryAgain')}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col overflow-hidden">
      <FilmHeader backTo={`${base}/${film.slug}`} catInfo={catInfo} title={film.name} />
      {body}
    </div>
  );
};

export default FilmQuiz;
