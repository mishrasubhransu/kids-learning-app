import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Hash, Palette, Shapes, Keyboard, Image, LogOut, ArrowLeftRight, Smile, Volume2 } from 'lucide-react';
import VoiceSelector from './ui/VoiceSelector';
import StyleToggle from './ui/StyleToggle';
import { stylesForCategory } from '../lib/imageStyles';
import { objectIcons } from '../data/numbers';
import { useAuth } from '../context/AuthContext';

// Light backgrounds (yellow/amber/green/cyan/orange) need dark text to stay
// readable; the darker card colors keep white text.
const categories = [
  {
    id: 'alphabets',
    name: 'Alphabets',
    description: 'Learn A to Z',
    icon: BookOpen,
    color: 'bg-blue-600',
    hoverColor: 'group-hover:bg-blue-700',
    textColor: 'text-white',
    preview: 'ABC',
  },
  {
    id: 'numbers',
    name: 'Numbers',
    icon: Hash,
    color: 'bg-green-500',
    hoverColor: 'group-hover:bg-green-600',
    textColor: 'text-gray-900',
    preview: '123',
  },
  {
    id: 'colors',
    name: 'Colors',
    description: 'Learn colors',
    icon: Palette,
    color: 'bg-pink-600',
    hoverColor: 'group-hover:bg-pink-700',
    textColor: 'text-white',
    preview: '🎨',
  },
  {
    id: 'shapes',
    name: 'Shapes',
    description: 'Learn shapes',
    icon: Shapes,
    color: 'bg-purple-600',
    hoverColor: 'group-hover:bg-purple-700',
    textColor: 'text-white',
    preview: '⬟',
  },
  {
    id: 'objects',
    name: 'Objects',
    description: 'Learn about objects',
    icon: Image,
    color: 'bg-amber-500',
    hoverColor: 'group-hover:bg-amber-600',
    textColor: 'text-gray-900',
    preview: '🦁',
  },
  {
    id: 'opposites',
    name: 'Opposites',
    icon: ArrowLeftRight,
    color: 'bg-cyan-500',
    hoverColor: 'group-hover:bg-cyan-600',
    textColor: 'text-gray-900',
    preview: '↔️',
  },
  {
    id: 'emotions',
    name: 'Emotions',
    icon: Smile,
    color: 'bg-yellow-500',
    hoverColor: 'group-hover:bg-yellow-600',
    textColor: 'text-gray-900',
    preview: '😊',
  },
  {
    id: 'phonics',
    name: 'Phonics',
    description: 'Learn 3-letter words',
    icon: Volume2,
    color: 'bg-indigo-600',
    hoverColor: 'group-hover:bg-indigo-700',
    textColor: 'text-white',
    preview: '🔤',
  },
  {
    id: 'typing',
    name: 'Typing',
    description: 'Type & hear letters',
    icon: Keyboard,
    color: 'bg-orange-500',
    hoverColor: 'group-hover:bg-orange-600',
    textColor: 'text-gray-900',
    preview: '⌨️',
  },
];

const Home = () => {
  const { signOut } = useAuth();
  const [numberMax, setNumberMax] = useState(() => {
    return localStorage.getItem('numberMax') || '10';
  });

  const toggleNumberMax = () => {
    const next = numberMax === '10' ? '20' : '10';
    setNumberMax(next);
    localStorage.setItem('numberMax', next);
  };

  const objectKeys = Object.keys(objectIcons);
  const [objectType, setObjectType] = useState(() => {
    const saved = localStorage.getItem('objectType');
    return objectIcons[saved] ? saved : 'strawberries';
  });

  const cycleObjectType = () => {
    const next =
      objectKeys[(objectKeys.indexOf(objectType) + 1) % objectKeys.length];
    setObjectType(next);
    localStorage.setItem('objectType', next);
  };

  return (
    // Outer div scrolls, inner div grows: with 9 cards the grid is taller
    // than short/landscape viewports, and justify-center inside a clipped
    // container would cut off both the first and last rows.
    <div className="h-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4 text-center">
        ToddLearn
      </h1>
      <p className="text-lg md:text-xl text-gray-600 mb-8 md:mb-12 text-center">
        Choose what you want to learn today!
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 max-w-5xl w-full">
        {categories.map((category) => {
          const IconComponent = category.icon;
          const darkText = category.textColor === 'text-gray-900';
          const hasPill =
            category.id === 'numbers' || Boolean(stylesForCategory(category.id));
          // Pills are siblings positioned over the card, not children of the
          // Link — nested interactive elements are invalid HTML and a tap
          // aimed at the card could silently flip a setting.
          const pillBase = `${
            darkText
              ? 'bg-black/10 hover:bg-black/20 text-gray-900'
              : 'bg-white/20 hover:bg-white/30 text-white'
          } text-sm rounded-full px-4 py-2 transition-colors whitespace-nowrap`;
          const pillPos = 'absolute bottom-3 left-1/2 -translate-x-1/2';
          return (
            // The wrapper scales on hover so the card and its overlaid pill
            // move as one unit, matching the old nested layout.
            <div
              key={category.id}
              className="group relative transform transition-transform duration-200 motion-safe:hover:scale-105"
            >
              <Link
                to={`/${category.id}`}
                className={`${category.color} ${category.hoverColor} ${category.textColor} h-full rounded-2xl p-6 md:p-8 shadow-lg transition-all duration-200 group-hover:shadow-xl flex flex-col items-center justify-center gap-3`}
              >
                <IconComponent size={48} className="md:w-16 md:h-16" />
                <span className="text-3xl md:text-5xl font-bold">
                  {category.preview}
                </span>
                <span className="text-lg md:text-xl font-semibold">
                  {category.name}
                </span>
                {hasPill ? (
                  <span className="h-9" aria-hidden="true" />
                ) : category.description ? (
                  <span
                    className={`text-sm hidden md:block ${darkText ? 'text-gray-900/80' : 'text-white/90'}`}
                  >
                    {category.description}
                  </span>
                ) : null}
              </Link>
              {category.id === 'numbers' ? (
                <div className={`${pillPos} flex items-center gap-2`}>
                  <button onClick={toggleNumberMax} className={pillBase}>
                    1–{numberMax}
                  </button>
                  <button
                    onClick={cycleObjectType}
                    aria-label={`Counting object: ${objectType}. Tap for the next one.`}
                    title="Change counting object"
                    className={`${pillBase} px-3`}
                  >
                    {objectIcons[objectType]}
                  </button>
                </div>
              ) : stylesForCategory(category.id) ? (
                <StyleToggle
                  category={category.id}
                  className={`${pillBase} ${pillPos}`}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mt-8 md:mt-12 flex flex-col items-center gap-3">
        <VoiceSelector />
        <span className="text-gray-500 text-sm">
          Use arrow keys or tap to navigate
        </span>
        <button
          onClick={signOut}
          className="mt-2 flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
      </div>
    </div>
  );
};

export default Home;
