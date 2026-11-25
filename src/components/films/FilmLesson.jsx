import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Gamepad2, Play } from 'lucide-react';
import FilmPlayer from '../ui/FilmPlayer';
import FilmHeader from './FilmHeader';
import FilmQuiz from './FilmQuiz';
import { playLink, cameByTap } from './arrival';
import { quizFor } from '../../data/filmQuizzes';
import { localizeItems } from '../../lib/locale';
import { useLocale } from '../../context/LocaleContext';
import { setScreenContext, track } from '../../lib/analytics';
import ownedByFocusedControl from '../../utils/ownedByFocusedControl';

// A lesson made of explainer films (Science → Human Body). Unlike a
// picture lesson there is no slide show to step through: the lesson page is
// a GALLERY of its films, and each film has a page of its own —
//   /science/body                       the gallery
//   /science/body/skeletal-system       one film
//   /science/body/skeletal-system/quiz  the test about that film
// so a child goes straight to the film they want, and each film is tested
// on its own (questions in data/filmQuizzes.js).

const FilmCard = ({ film, to, size = 'big', cardRef }) => (
  <Link
    ref={cardRef}
    to={to}
    state={playLink}
    className={`group block bg-white shadow-md hover:shadow-xl transition-all duration-200 motion-safe:hover:scale-105 motion-safe:active:scale-95 ${
      size === 'big' ? 'rounded-3xl p-3 md:p-4' : 'rounded-2xl p-2'
    }`}
  >
    <span className="relative block aspect-square overflow-hidden rounded-2xl bg-white">
      <img
        src={film.image}
        alt=""
        className="w-full h-full object-contain"
        draggable={false}
      />
      {/* In the corner, so the badge never sits on the character's face */}
      <span
        className={`absolute rounded-full bg-black/45 text-white shadow-lg ${
          size === 'big' ? 'right-2 bottom-2 md:right-3 md:bottom-3 p-3 md:p-4' : 'right-1.5 bottom-1.5 p-2'
        }`}
        aria-hidden="true"
      >
        <Play
          className={size === 'big' ? 'w-7 h-7 md:w-9 md:h-9' : 'w-4 h-4'}
          fill="currentColor"
        />
      </span>
    </span>
    <span
      className={`block text-center font-bold text-gray-700 leading-tight ${
        size === 'big' ? 'mt-3 text-lg md:text-2xl' : 'mt-1.5 text-sm md:text-base'
      }`}
    >
      {film.name}
    </span>
  </Link>
);

const FilmGallery = ({ base, backTo, catInfo, title, films, category }) => {
  const { t } = useLocale();
  const cards = useRef([]);

  useEffect(() => {
    setScreenContext({ category, mode: 'films' });
    return () => setScreenContext({ mode: null });
  }, [category]);

  // The arrow keys walk the cards; Enter (the link's own key) opens one
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const at = cards.current.indexOf(document.activeElement);
      const step = e.key === 'ArrowRight' ? 1 : -1;
      const next = at === -1 ? 0 : (at + step + films.length) % films.length;
      cards.current[next]?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [films.length]);

  return (
    <div className="h-full bg-gradient-to-br from-sky-50 via-indigo-50 to-slate-100 flex flex-col">
      <FilmHeader backTo={backTo} catInfo={catInfo} title={title} />
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center p-6 md:p-10">
          <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8 text-center">
            {t('film.pick')}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl w-full">
            {films.map((film, i) => (
              <FilmCard
                key={film.slug}
                film={film}
                to={`${base}/${film.slug}`}
                cardRef={(el) => {
                  cards.current[i] = el;
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const FilmWatch = ({ base, catInfo, films, film, category, hasQuiz }) => {
  const { t, locale } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const narration = film.film.narration[locale] ?? film.film.narration.en;
  const item = film.enName ?? film.name;

  // 'idle' (poster) | 'playing' | 'paused'; `watched` = it has run to the end
  const [state, setState] = useState(() => (cameByTap(location) ? 'playing' : 'idle'));
  const [watched, setWatched] = useState(false);

  useEffect(() => {
    setScreenContext({ category, mode: 'film' });
    return () => setScreenContext({ mode: null });
  }, [category]);

  // One play per visit to the page however often it is paused and resumed;
  // a replay after the end counts again
  const counted = useRef(false);
  useEffect(() => {
    if (state !== 'playing' || counted.current) return;
    counted.current = true;
    track('film_play', { category, item });
  }, [state, category, item]);

  const toggle = useCallback(
    () => setState((s) => (s === 'playing' ? 'paused' : 'playing')),
    []
  );
  const handleEnded = useCallback(() => {
    setState('idle');
    setWatched(true);
    counted.current = false;
    track('film_end', { category, item });
  }, [category, item]);
  // The browser refused to start it (no tap yet): back to the poster
  const handleBlocked = useCallback(() => setState('idle'), []);

  const at = films.indexOf(film);
  const go = useCallback(
    (step) => {
      const next = films[at + step];
      navigate(next ? `${base}/${next.slug}` : base, next ? { state: playLink } : undefined);
    },
    [films, at, base, navigate]
  );

  // → plays the film; once it is running or over, → is the next film (the
  // gallery after the last one). ← backs out of a running film to its
  // poster, then to the film before. Space/Enter play and pause.
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat || ownedByFocusedControl(e)) return;
      if (e.key === 'ArrowRight') {
        if (state === 'idle' && !watched) setState('playing');
        else go(1);
      } else if (e.key === 'ArrowLeft') {
        if (state !== 'idle') setState('idle');
        else go(-1);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape') {
        navigate(base);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, watched, go, toggle, navigate, base]);

  const others = films.filter((f) => f !== film);
  const playing = state === 'playing';

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col overflow-hidden">
      <FilmHeader backTo={base} catInfo={catInfo} title={film.name} />
      {/* Film beside its siblings on a wide screen, above them on a tall one */}
      <div className="flex-1 min-h-0 flex flex-col landscape:flex-row items-center [justify-content:safe_center] gap-4 md:gap-8 p-4 overflow-y-auto landscape:overflow-hidden">
        <button
          type="button"
          onClick={toggle}
          className="shrink-0 cursor-pointer rounded-2xl"
          aria-label={`${playing ? 'Pause' : 'Play'} ${film.name}`}
        >
          <FilmPlayer
            src={film.film.video}
            audioSrc={narration}
            poster={film.image}
            alt={film.name}
            state={state}
            watched={watched}
            onEnded={handleEnded}
            onBlocked={handleBlocked}
            className={`${
              hasQuiz ? 'w-[min(92vw,calc(100dvh-29rem))]' : 'w-[min(92vw,calc(100dvh-24rem))]'
            } landscape:w-[min(calc(100vw-16rem),calc(100dvh-8.5rem))] aspect-square rounded-2xl shadow-lg bg-white`}
          />
        </button>

        {/* The game about this film and the other films wait out of sight
            while it plays, so nothing on screen pulls a child away from it */}
        {(hasQuiz || others.length > 0) && (
          <div
            className={`shrink-0 flex flex-col items-center gap-3 transition-opacity duration-300 ${
              playing ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            inert={playing}
          >
            {hasQuiz && (
              <Link
                to={`${base}/${film.slug}/quiz`}
                state={playLink}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-lg md:text-xl font-bold shadow-md hover:shadow-lg transition-all motion-safe:active:scale-95 ${
                  watched && state === 'idle' ? 'motion-safe:animate-bounce' : ''
                }`}
              >
                <Gamepad2 className="w-7 h-7" />
                {t('film.game')}
              </Link>
            )}
            {others.length > 0 && (
              <div>
                <p className="text-sm md:text-base font-semibold text-gray-500 text-center mb-2">
                  {t('film.more')}
                </p>
                <div className="flex landscape:flex-col gap-3 justify-center">
                  {others.map((f) => (
                    <div
                      key={f.slug}
                      className={`w-24 md:w-32 ${
                        hasQuiz
                          ? 'landscape:w-[min(9rem,calc((100dvh-17.5rem)/3.6))]'
                          : 'landscape:w-[min(9rem,calc((100dvh-13rem)/3.6))]'
                      }`}
                    >
                      <FilmCard film={f} to={`${base}/${f.slug}`} size="small" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const FilmLesson = ({ section, catInfo, items, slug, page }) => {
  const { t, locale } = useLocale();
  const films = useMemo(() => localizeItems(items), [items, locale]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = `/${section}/${catInfo.id}`;
  const category = `${section}-${catInfo.id}`;
  const titleKey = `cat.${section}.${catInfo.id}`;
  const title = t(titleKey) === titleKey ? catInfo.name : t(titleKey);

  if (!slug) {
    return (
      <FilmGallery
        base={base}
        backTo={`/${section}`}
        catInfo={catInfo}
        title={title}
        films={films}
        category={category}
      />
    );
  }

  const film = films.find((f) => f.slug === slug);
  if (!film) return <Navigate to={base} replace />;
  const questions = quizFor(film.slug);
  if (page === 'quiz') {
    if (!questions.length) return <Navigate to={`${base}/${film.slug}`} replace />;
    return (
      <FilmQuiz
        key={film.slug}
        base={base}
        catInfo={catInfo}
        film={film}
        questions={questions}
        category={category}
      />
    );
  }
  // Keyed by film: moving on to another one starts from a clean player
  return (
    <FilmWatch
      key={film.slug}
      base={base}
      catInfo={catInfo}
      films={films}
      film={film}
      category={category}
      hasQuiz={questions.length > 0}
    />
  );
};

export default FilmLesson;
