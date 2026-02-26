import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Home, BookOpen, Gamepad2 } from 'lucide-react';
import ScrollView from './learning/ScrollView';
import TileView from './learning/TileView';
import TestingMode from './testing/TestingMode';
import DifficultySelector from './ui/DifficultySelector';

import alphabets from '../data/alphabets';
import numbers, { objectIcons } from '../data/numbers';
import colors from '../data/colors';
import shapes, { getRandomShapeColor } from '../data/shapes.jsx';
import { objectCategories, objectItems } from '../data/objects';

const categoryData = {
  alphabets: { items: alphabets, title: 'Alphabets' },
  numbers: { items: numbers, title: 'Numbers', objectIcons },
  colors: { items: colors, title: 'Colors' },
  shapes: { items: shapes, title: 'Shapes' },
};

objectCategories.forEach((cat) => {
  categoryData[`objects-${cat.id}`] = {
    items: objectItems[cat.id],
    title: cat.name,
  };
});

const CategoryPage = ({ category, backTo = '/' }) => {
  const [mode, setMode] = useState('scroll'); // 'scroll' | 'tile' | 'test'
  const [difficulty, setDifficulty] = useState('easy'); // 'easy' | 'medium' | 'hard'

  // Generate a random color for shapes (only once when entering the shapes category)
  const shapeColor = useMemo(() => {
    return category === 'shapes' ? getRandomShapeColor() : null;
  }, [category]);

  const data = categoryData[category];
  if (!data) {
    return <div>Category not found</div>;
  }

  const { items, title, objectIcons: icons } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 p-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Back button and title */}
          <div className="flex items-center gap-4">
            <Link
              to={backTo}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <Home size={24} className="text-gray-600" />
            </Link>
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
          />
        )}
        {mode === 'tile' && (
          <TileView
            items={items}
            category={category}
            objectIcons={icons}
            shapeColor={shapeColor}
          />
        )}
        {mode === 'test' && (
          <TestingMode
            items={items}
            category={category}
            difficulty={difficulty}
            objectIcons={icons}
            shapeColor={shapeColor}
          />
        )}
      </div>
    </div>
  );
};

export default CategoryPage;
