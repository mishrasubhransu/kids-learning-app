import { useState, useMemo, useEffect } from 'react';
import { BookOpen, Gamepad2, Pencil } from 'lucide-react';
import { ADMIN_EMAIL, recordingCategoryFor, syncRecordings, preloadRecordings } from '../lib/recordings';
import { useAuth } from '../context/AuthContext';
import HomeButton from './ui/HomeButton';
import ScrollView from './learning/ScrollView';
import TileView from './learning/TileView';
import TracingMode from './learning/TracingMode';
import TestingMode from './testing/TestingMode';
import DifficultySelector from './ui/DifficultySelector';
import GameInterstitial from './ui/GameInterstitial';
import CategoryIntro from './ui/CategoryIntro';
import { resolveImageStyle, applyImageStyle } from '../lib/imageStyles';
import { preloadVoiceClips } from '../lib/voice';
import { itemQuizParts } from '../lib/voiceKeys';
import { localizeItems, setSpeechLocale } from '../lib/locale';
import { useLocale } from '../context/LocaleContext';
import { setScreenContext } from '../lib/analytics';
import useChildSetting from '../hooks/useChildSetting';
import useSessionItems from '../hooks/useSessionItems';
import shuffle from '../utils/shuffle';

import alphabets from '../data/alphabets';
import numbers, { objectIcons } from '../data/numbers';
import colors from '../data/colors';
import shapes, { getRandomShapeColor } from '../data/shapes.jsx';
import { conceptCategories, conceptItems, pickItemVariants } from '../data/concepts';
import { phonicsFamilies, phonicsWords } from '../data/phonics';

const categoryData = {
  alphabets: { items: alphabets, title: 'Alphabets' },
  numbers: { items: numbers, title: 'Numbers', objectIcons },
  colors: { items: colors, title: 'Colors' },
  shapes: { items: shapes, title: 'Shapes' },
};

conceptCategories.forEach((cat) => {
  categoryData[`concepts-${cat.id}`] = {
    items: conceptItems[cat.id],
    title: cat.name,
  };
});

phonicsFamilies.forEach((family) => {
  categoryData[`phonics-${family.id}`] = {
    items: phonicsWords[family.id],
    title: family.name,
  };
});

const CategoryPage = ({ category, backTo = '/home', catInfo }) => {
  const { user } = useAuth();
  const { locale, t } = useLocale();
  // Recorded clips only play for the admin account (regional pronunciation
  // varies), so don't warm the audio cache for anyone else
  const isAdmin = user?.email === ADMIN_EMAIL;
  // Concepts lessons open with the collage intro page ("Let's learn about
  // animals!") that circle-reveals into the content; other categories (no
  // photo assets yet) go straight in. 'intro' → 'revealing' → 'done'.
  const hasIntro = category.startsWith('concepts-');
  const [introState, setIntroState] = useState(hasIntro ? 'intro' : 'done');
  const [mode, setMode] = useState('scroll'); // 'scroll' | 'tile' | 'test'
  // "Ready to play a game?" screen after autoplay, instead of a silent jump to test
  const [showGamePrompt, setShowGamePrompt] = useState(false);
  // Entering test via that screen skips TestingMode's own "Ready to Test?" gate
  const [autoStartTest, setAutoStartTest] = useState(false);
  const [difficulty, setDifficulty] = useState('easy'); // 'easy' | 'medium' | 'hard'
  // Chosen via the pill on the home Numbers card, saved per child
  const [savedObjectType] = useChildSetting('objectType', 'strawberries');
  const objectType = objectIcons[savedObjectType]
    ? savedObjectType
    : 'strawberries';
  // Counting range and image style are per-child too (Parent Zone / pills)
  const [numberMax] = useChildSetting('numberMax', '10');
  const [savedImageStyle] = useChildSetting(`imageStyle-${category}`, null);

  // Indian Food speaks the language the parent pinned for it, not the app
  // language. Stamped during render (before children mount — same pattern
  // as LocaleProvider stamping the app locale) so the intro, preload and
  // every quiz sentence resolve against it; cleared when the page unmounts.
  const [indianFoodLang] = useChildSetting('indianFoodLang', null);
  setSpeechLocale(category === 'concepts-indian-food' ? indianFoodLang : null);
  useEffect(() => () => setSpeechLocale(null), []);

  const selectMode = (next) => {
    setShowGamePrompt(false);
    setAutoStartTest(false);
    setMode(next);
  };

  // Screen-time analytics: report the precise category key and the active
  // mode; clear the mode on the way out so it doesn't leak onto other pages
  useEffect(() => {
    setScreenContext({ category, mode });
    return () => setScreenContext({ mode: null });
  }, [category, mode]);

  // Generate a random color for shapes (only once when entering the shapes category)
  const shapeColor = useMemo(() => {
    return category === 'shapes' ? getRandomShapeColor() : null;
  }, [category]);

  // Items may list several interchangeable photos (item.images, e.g. the
  // nature lesson); pick one at random per visit so repeat visits vary but
  // the picture never swaps mid-session. Localization adds slug/enName and
  // swaps display names for the active language.
  const resolvedItems = useMemo(() => {
    const categoryItems = categoryData[category]?.items;
    return categoryItems ? localizeItems(pickItemVariants(categoryItems)) : null;
  }, [category, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Numbers honor the per-child counting range before any session capping
  const sizedItems = useMemo(() => {
    if (!resolvedItems) return null;
    return category === 'numbers'
      ? resolvedItems.slice(0, Number(numberMax || '10'))
      : resolvedItems;
  }, [resolvedItems, category, numberMax]);

  // Parent-configured session sizes; capped pools rotate unseen-first
  // across visits. Lesson modes (scroll/tile/trace) share one pool so the
  // visit is coherent; the test rotates on its own track and only counts
  // as "shown" once test mode is actually opened.
  // Ordered/fixed sets skip the caps entirely: rotation's seen/unseen top-up
  // breaks contiguous runs (numbers 1, 2, 3, 4, 13…; alphabets A, B, C, N…),
  // and phonics families are small fixed word sets. numberMax stays numbers'
  // dedicated size control.
  const [lessonCap] = useChildSetting('lessonItemCap', 'all');
  const [testCap] = useChildSetting('testItemCap', 'all');
  const capExempt =
    category === 'numbers' ||
    category === 'alphabets' ||
    category.startsWith('phonics-');
  const lessonPool = useSessionItems(category, 'lesson', sizedItems, capExempt ? 'all' : lessonCap, mode !== 'test');
  const testPool = useSessionItems(category, 'test', sizedItems, capExempt ? 'all' : testCap, mode === 'test');

  // Memoized so re-renders (e.g. the rotation persist updating the profile
  // context) don't hand the views a fresh array identity — TestingMode
  // resets its question state when `items` changes
  const items = useMemo(
    () =>
      lessonPool
        ? applyImageStyle(lessonPool, category, resolveImageStyle(category, savedImageStyle))
        : null,
    [lessonPool, category, savedImageStyle]
  );
  const testItems = useMemo(
    () =>
      testPool
        ? applyImageStyle(testPool, category, resolveImageStyle(category, savedImageStyle))
        : null,
    [testPool, category, savedImageStyle]
  );

  // Intro collage: a random sample of this visit's items in the active image
  // style — memoized so the tiles don't reshuffle on re-render mid-intro
  const introTiles = useMemo(() => {
    if (!hasIntro || !resolvedItems) return [];
    const styled = applyImageStyle(
      resolvedItems,
      category,
      resolveImageStyle(category, savedImageStyle)
    );
    return shuffle(styled)
      .slice(0, 8)
      .map((item) =>
        item.video ? { video: item.video } : { images: [item.image] }
      );
  }, [hasIntro, resolvedItems, category, savedImageStyle]);

  // The reveal: content is clipped to a dot, then the circle grows over it.
  // Reduced motion (or no intro) jumps straight to the content.
  const reduceMotion = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );
  const beginReveal = () => setIntroState(reduceMotion ? 'done' : 'revealing');
  useEffect(() => {
    if (introState !== 'revealing') return;
    const t = setTimeout(() => setIntroState('done'), 750);
    return () => clearTimeout(t);
  }, [introState]);

  // Warm the voice-clip cache for everything this category can say (item
  // names + quiz sentences); keys without clips filter out for free
  useEffect(() => {
    if (resolvedItems) {
      preloadVoiceClips(resolvedItems.flatMap((i) => itemQuizParts(i)));
    }
  }, [resolvedItems]);

  // Warm the audio cache when a category with parent recordings opens, so
  // playback never waits on the network mid-session
  useEffect(() => {
    if (!isAdmin) return;
    const recordingCategory = recordingCategoryFor(category);
    const categoryItems = categoryData[category]?.items;
    if (!recordingCategory || !categoryItems) return;
    // Recordings are keyed by the raw English name (see useVoice.speakItem)
    syncRecordings().then(() =>
      preloadRecordings(recordingCategory, categoryItems.map((i) => i.name))
    );
  }, [category, isAdmin]);

  const data = categoryData[category];
  if (!data) {
    return (
      <div className="h-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-6xl" aria-hidden="true">🤔</div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-700 text-center">
          {t('lesson.notFound')}
        </h1>
        <HomeButton to={backTo} />
      </div>
    );
  }

  const { objectIcons: icons } = data;
  // 'concepts-animals' → 'cat.concepts.animals'; keys the string table
  // doesn't know (phonics families — English-only) keep their data title
  const titleKey = `cat.${category.replace('-', '.')}`;
  const title = t(titleKey) === titleKey ? data.title : t(titleKey);

  return (
    <div className="h-full relative">
      {/* Intro page under the clipped content: the content circle starts at
          zero size, so all taps land here until the reveal begins */}
      {introState !== 'done' && (
        <CategoryIntro
          categoryKey={category}
          title={title}
          emoji={catInfo?.emoji}
          tiles={introTiles}
          onReveal={beginReveal}
        />
      )}
      <div
        className="h-full bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col overflow-hidden relative"
        style={
          introState === 'intro'
            ? { clipPath: 'circle(0% at 50% 50%)' }
            : introState === 'revealing'
              ? {
                  clipPath: 'circle(75% at 50% 50%)',
                  transition: 'clip-path 700ms ease-in-out',
                }
              : undefined
        }
      >
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 p-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Back button and title */}
          <div className="flex items-center gap-4">
            <HomeButton to={backTo} />
            {/* Echo the card the child tapped on ConceptsHome (its color + emoji) */}
            {catInfo && (
              <span
                className={`${catInfo.color} w-10 h-10 rounded-xl flex items-center justify-center text-2xl shadow-sm`}
                aria-hidden="true"
              >
                {catInfo.emoji}
              </span>
            )}
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          </div>

          {/* Mode selector */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => selectMode('scroll')}
                className={`min-h-10 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === 'scroll'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <BookOpen size={16} />
                {t('mode.scroll')}
              </button>
              <button
                onClick={() => selectMode('tile')}
                className={`min-h-10 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === 'tile'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                {t('mode.tiles')}
              </button>
              {(category === 'alphabets' || category === 'numbers') && (
                <button
                  onClick={() => selectMode('trace')}
                  className={`min-h-10 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    mode === 'trace'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Pencil size={16} />
                  {t('mode.trace')}
                </button>
              )}
              <button
                onClick={() => selectMode('test')}
                className={`min-h-10 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === 'test'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Gamepad2 size={16} />
                {t('mode.test')}
              </button>
            </div>

            {mode === 'test' && (
              <DifficultySelector
                difficulty={difficulty}
                onChange={setDifficulty}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main content — min-h-0 so a tall child (hard-mode TestingMode grid)
          scrolls inside its own container instead of growing past the page */}
      <div className="flex-1 min-h-0 flex flex-col">
        {mode === 'scroll' && showGamePrompt && (
          <GameInterstitial
            onPlay={() => {
              setShowGamePrompt(false);
              setAutoStartTest(true);
              setMode('test');
            }}
            onKeepLearning={() => setShowGamePrompt(false)}
          />
        )}
        {mode === 'scroll' && !showGamePrompt && (
          <ScrollView
            items={items}
            category={category}
            objectIcons={icons}
            shapeColor={shapeColor}
            objectType={objectType}
            holdIntro={introState === 'intro'}
            onAutoplayComplete={() => setShowGamePrompt(true)}
          />
        )}
        {mode === 'tile' && (
          <TileView
            items={items}
            category={category}
            objectIcons={icons}
            shapeColor={shapeColor}
            objectType={objectType}
          />
        )}
        {mode === 'trace' && (
          <TracingMode items={items} category={category} />
        )}
        {mode === 'test' && (
          <TestingMode
            items={testItems}
            category={category}
            difficulty={difficulty}
            objectIcons={icons}
            shapeColor={shapeColor}
            objectType={objectType}
            autoStart={autoStartTest}
          />
        )}
      </div>
      </div>
    </div>
  );
};

export default CategoryPage;
