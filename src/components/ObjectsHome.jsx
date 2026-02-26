import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { objectCategories, objectItems } from '../data/objects';

const ObjectsHome = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 p-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link
            to="/"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Go home"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Objects
          </h1>
        </div>
      </div>

      {/* Category selection */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <p className="text-lg md:text-xl text-gray-600 mb-8 text-center">
          Pick a category to explore!
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 max-w-5xl w-full">
          {objectCategories.map((cat) => (
            <Link
              key={cat.id}
              to={`/objects/${cat.id}`}
              className={`${cat.color} ${cat.hoverColor} rounded-2xl p-6 md:p-8 text-white shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl flex flex-col items-center justify-center gap-3`}
            >
              <span className="text-5xl md:text-6xl">{cat.emoji}</span>
              <span className="text-lg md:text-xl font-semibold">
                {cat.name}
              </span>
              <span className="text-sm opacity-80">
                {objectItems[cat.id].length} items
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ObjectsHome;
