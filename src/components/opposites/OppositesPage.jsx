import { useState, useEffect, useMemo } from 'react';
import { BookOpen, Puzzle, Gamepad2 } from 'lucide-react';
import { setScreenContext } from '../../lib/analytics';
import HomeButton from '../ui/HomeButton';
import PairLearnView from './PairLearnView';
import MatchGame from './MatchGame';
import SceneQuiz from './SceneQuiz';
import DifficultySelector from '../ui/DifficultySelector';
import CategoryIntro from '../ui/CategoryIntro';
import opposites, { wordImages } from '../../data/opposites';
import shuffle from '../../utils/shuffle';

const modes = [
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'match', label: 'Match', icon: Puzzle },
  { id: 'quiz', label: 'Quiz', icon: Gamepad2 },
];

const OppositesPage = ({ backTo = '/home' }) => {
  const [mode, setMode] = useState('learn');
  const [difficulty, setDifficulty] = useState('easy');
  // Collage intro page that circle-reveals into the lesson (same flow as the
  // concepts categories in CategoryPage): 'intro' → 'revealing' → 'done'
  const [introState, setIntroState] = useState('intro');

  // Each collage tile is one pair, both sides in a single frame
  const introTiles = useMemo(
    () =>
      shuffle(opposites)
        .slice(0, 6)
        .map((item) => ({
          images: item.pair.map((w) => wordImages(item, w)[0]),
        })),
    []
  );

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

  // Screen-time analytics: learn vs match vs quiz time is the interesting
  // split here; clear the mode on the way out
  useEffect(() => {
    setScreenContext({ category: 'opposites', mode });
    return () => setScreenContext({ mode: null });
  }, [mode]);

  return (
    <div className="h-full relative">
      {introState !== 'done' && (
        <CategoryIntro
          categoryKey="opposites"
          title="Opposites"
          emoji="↔️"
          tiles={introTiles}
          onReveal={beginReveal}
        />
      )}
      <div
        className="h-full bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col overflow-hidden relative"
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
          <div className="flex items-center gap-4">
            <HomeButton to={backTo} />
            <h1 className="text-2xl font-bold text-gray-800">Opposites</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {modes.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`min-h-10 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                      mode === m.id
                        ? 'bg-white text-gray-800 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={16} />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Always in the layout so the mode pills don't jump when Learn
                hides it; visibility (not conditional render) reserves the
                space and drops it from the tab order. */}
            <div className={mode === 'learn' ? 'invisible' : undefined}>
              <DifficultySelector difficulty={difficulty} onChange={setDifficulty} />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {mode === 'learn' && (
          <PairLearnView items={opposites} holdIntro={introState === 'intro'} />
        )}
        {mode === 'match' && <MatchGame items={opposites} difficulty={difficulty} />}
        {mode === 'quiz' && <SceneQuiz items={opposites} difficulty={difficulty} />}
      </div>
      </div>
    </div>
  );
};

export default OppositesPage;
