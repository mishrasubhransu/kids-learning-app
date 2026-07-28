import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import StyleToggle from './ui/StyleToggle';
import { stylesForCategory } from '../lib/imageStyles';
import { objectIcons } from '../data/numbers';
import { homeCategories } from '../data/categories';
import { isLessonVisible, newLessonKeys } from '../data/lessons';
import { useChildProfile, DEFAULT_CHILD_NAME } from '../context/ChildProfileContext';
import useChildSetting from '../hooks/useChildSetting';

const Home = () => {
  const { activeChild } = useChildProfile();
  const enabledLessons = activeChild?.settings?.enabledLessons;

  const objectKeys = Object.keys(objectIcons);
  const [savedObjectType, setObjectType] = useChildSetting('objectType', 'strawberries');
  const objectType = objectIcons[savedObjectType] ? savedObjectType : 'strawberries';

  const cycleObjectType = () => {
    setObjectType(objectKeys[(objectKeys.indexOf(objectType) + 1) % objectKeys.length]);
  };

  const [numberMax, setNumberMax] = useChildSetting('numberMax', '10');
  const toggleNumberMax = () => {
    setNumberMax(numberMax === '10' ? '20' : '10');
  };

  const visibleCategories = homeCategories.filter((cat) =>
    isLessonVisible(enabledLessons, cat.id)
  );

  const greetName =
    activeChild && activeChild.name !== DEFAULT_CHILD_NAME ? activeChild.name : null;
  const hasNewLessons = newLessonKeys(enabledLessons).length > 0;

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
        {greetName ? (
          <>
            Hi {greetName}! 👋 What do you want to learn today?
          </>
        ) : (
          'Choose what you want to learn today!'
        )}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 max-w-5xl w-full">
        {visibleCategories.map((category) => {
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
        <span className="text-gray-500 text-sm">
          Use arrow keys or tap to navigate
        </span>
        <Link
          to="/parent"
          className="relative mt-1 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Settings size={16} />
          Parents
          {hasNewLessons && (
            <span
              className="absolute -top-1 -right-3 w-2.5 h-2.5 rounded-full bg-amber-400"
              title="New lessons available"
            />
          )}
        </Link>
      </div>
      </div>
    </div>
  );
};

export default Home;
