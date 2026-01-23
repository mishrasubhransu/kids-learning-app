import { useState } from 'react';
import useSpeech from '../../hooks/useSpeech';

const TileView = ({ items, category, objectIcons }) => {
  const [activeId, setActiveId] = useState(null);
  const [objectType, setObjectType] = useState('eggs');
  const { speak } = useSpeech();

  const handleClick = (item) => {
    setActiveId(item.id);
    // Small delay to ensure click event completes before speech
    setTimeout(() => {
      speak(item.name);
    }, 50);
    // Reset animation after 400ms
    setTimeout(() => setActiveId(null), 400);
  };

  const renderTile = (item) => {
    const isActive = activeId === item.id;
    const baseClasses = `
      rounded-2xl shadow-lg cursor-pointer transition-all duration-200
      ${isActive ? 'scale-110 shadow-xl' : 'hover:scale-105 hover:shadow-xl'}
    `;

    switch (category) {
      case 'alphabets':
        return (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            className={`${baseClasses} bg-white p-4 md:p-6 flex items-center justify-center`}
          >
            <span className="text-4xl md:text-6xl font-bold text-gray-600">
              {item.display}
            </span>
          </button>
        );

      case 'numbers':
        return (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            className={`${baseClasses} bg-white p-4 md:p-6 flex flex-col items-center justify-center gap-2`}
          >
            <span className="text-3xl md:text-5xl font-bold text-gray-500">
              {item.value}
            </span>
            <div className="flex flex-wrap justify-center gap-1 max-w-[80px]">
              {Array.from({ length: Math.min(item.value, 5) }).map((_, i) => (
                <span key={i} className="text-lg md:text-xl">
                  {objectIcons?.[objectType] || '🥚'}
                </span>
              ))}
              {item.value > 5 && (
                <span className="text-xs text-gray-400">+{item.value - 5}</span>
              )}
            </div>
          </button>
        );

      case 'colors':
        return (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            className={`${baseClasses} p-4 md:p-6 flex flex-col items-center justify-center gap-2`}
            style={{
              backgroundColor: item.hex,
              border: item.name === 'White' ? '2px solid #e5e7eb' : 'none',
            }}
          >
            <span
              className={`text-lg md:text-xl font-semibold ${
                ['White', 'Yellow'].includes(item.name)
                  ? 'text-gray-700'
                  : 'text-white'
              }`}
              style={{
                textShadow: ['White', 'Yellow'].includes(item.name)
                  ? 'none'
                  : '1px 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              {item.name}
            </span>
          </button>
        );

      case 'shapes':
        return (
          <button
            key={item.id}
            onClick={() => handleClick(item)}
            className={`${baseClasses} bg-white p-4 md:p-6 flex flex-col items-center justify-center gap-2`}
          >
            <div className="w-16 h-16 md:w-24 md:h-24">{item.svg()}</div>
            <span className="text-sm md:text-base font-semibold text-gray-600">
              {item.name}
            </span>
          </button>
        );

      default:
        return null;
    }
  };

  // Grid columns based on category
  const getGridCols = () => {
    switch (category) {
      case 'alphabets':
        return 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8';
      case 'numbers':
        return 'grid-cols-3 md:grid-cols-5';
      case 'colors':
        return 'grid-cols-2 md:grid-cols-4';
      case 'shapes':
        return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5';
      default:
        return 'grid-cols-4';
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8">
      {/* Object selector for numbers */}
      {category === 'numbers' && objectIcons && (
        <div className="flex justify-center mb-6">
          <select
            value={objectType}
            onChange={(e) => setObjectType(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-blue-200 cursor-pointer outline-none shadow-sm"
          >
            {Object.entries(objectIcons).map(([key, icon]) => (
              <option key={key} value={key}>
                {key.charAt(0).toUpperCase() + key.slice(1)} {icon}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tiles grid */}
      <div
        className={`grid ${getGridCols()} gap-3 md:gap-4 max-w-5xl mx-auto w-full`}
      >
        {items.map((item) => renderTile(item))}
      </div>

      <div className="text-center mt-8 text-gray-400 text-sm">
        Click any item to hear its name
      </div>
    </div>
  );
};

export default TileView;
