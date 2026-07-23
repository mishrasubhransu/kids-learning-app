import { useState, useMemo, useEffect } from 'react';
import { BookOpen, Gamepad2, Pencil } from 'lucide-react';
import { recordingCategoryFor, syncRecordings, preloadRecordings } from '../lib/recordings';
import HomeButton from './ui/HomeButton';
import ScrollView from './learning/ScrollView';
import TileView from './learning/TileView';
import TracingMode from './learning/TracingMode';
import TestingMode from './testing/TestingMode';
import DifficultySelector from './ui/DifficultySelector';
import { getImageStyle, applyImageStyle } from '../lib/imageStyles';

import alphabets from '../data/alphabets';
import numbers, { objectIcons } from '../data/numbers';
import colors from '../data/colors';
import shapes, { getRandomShapeColor } from '../data/shapes.jsx';
import { objectCategories, objectItems } from '../data/objects';
import emotions from '../data/emotions';
import { phonicsFamilies, phonicsWords } from '../data/phonics';

const categoryData = {
  alphabets: { items: alphabets, title: 'Alphabets' },
  numbers: { items: numbers, title: 'Numbers', objectIcons },
  colors: { items: colors, title: 'Colors' },
  shapes: { items: shapes, title: 'Shapes' },
  emotions: { items: emotions, title: 'Emotions' },
};

objectCategories.forEach((cat) => {
  categoryData[`objects-${cat.id}`] = {
    items: objectItems[cat.id],
    title: cat.name,
  };
});

phonicsFamilies.forEach((family) => {
  categoryData[`phonics-${family.id}`] = {
    items: phonicsWords[family.id],
    title: family.name,
  };
});

const CategoryPage = ({ category, backTo = '/home' }) => {
  const [mode, setMode] = useState('scroll'); // 'scroll' | 'tile' | 'test'
  const [difficulty, setDifficulty] = useState('easy'); // 'easy' | 'medium' | 'hard'
  // Chosen via the pill on the home Numbers card, persisted in localStorage
  const savedObjectType = localStorage.getItem('objectType');
  const objectType = objectIcons[savedObjectType]
    ? savedObjectType
    : 'strawberries';

  // Generate a random color for shapes (only once when entering the shapes category)
  const shapeColor = useMemo(() => {
    return category === 'shapes' ? getRandomShapeColor() : null;
  }, [category]);

  // Warm the audio cache when a category with parent recordings opens, so
  // playback never waits on the network mid-session
  useEffect(() => {
    const recordingCategory = recordingCategoryFor(category);
    const categoryItems = categoryData[category]?.items;
    if (!recordingCategory || !categoryItems) return;
    syncRecordings().then(() =>
      preloadRecordings(recordingCategory, categoryItems.map((i) => i.name))
    );
  }, [category]);

  const data = categoryData[category];
  if (!data) {
    return <div>Category not found</div>;
  }

  const { items: rawItems, title, objectIcons: icons } = data;
  const sizedItems = category === 'numbers'
    ? rawItems.slice(0, Number(localStorage.getItem('numberMax') || '10'))
    : rawItems;
  const items = applyImageStyle(sizedItems, category, getImageStyle(category));

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 p-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Back button and title */}
          <div className="flex items-center gap-4">
            <HomeButton to={backTo} />
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          </div>

          {/* Mode selector */}
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setMode('scroll')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === 'scroll'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <BookOpen size={16} />
                Scroll
              </button>
              <button
                onClick={() => setMode('tile')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
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
                Tiles
              </button>
              {(category === 'alphabets' || category === 'numbers') && (
                <button
                  onClick={() => setMode('trace')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                    mode === 'trace'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Pencil size={16} />
                  Trace
                </button>
              )}
              <button
                onClick={() => setMode('test')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === 'test'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Gamepad2 size={16} />
                Test
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

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {mode === 'scroll' && (
          <ScrollView
            items={items}
            category={category}
            objectIcons={icons}
            shapeColor={shapeColor}
            objectType={objectType}
            onAutoplayComplete={() => setMode('test')}
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
            items={items}
            category={category}
            difficulty={difficulty}
            objectIcons={icons}
            shapeColor={shapeColor}
            objectType={objectType}
          />
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
