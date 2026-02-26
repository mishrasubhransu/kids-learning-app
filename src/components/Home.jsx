import { Link } from 'react-router-dom';
import { BookOpen, Hash, Palette, Shapes, Keyboard, Image } from 'lucide-react';

const categories = [
  {
    id: 'alphabets',
    name: 'Alphabets',
    description: 'Learn A to Z',
    icon: BookOpen,
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600',
    preview: 'ABC',
  },
  {
    id: 'numbers',
    name: 'Numbers',
    description: 'Learn 1 to 10',
    icon: Hash,
    color: 'bg-green-500',
    hoverColor: 'hover:bg-green-600',
    preview: '123',
  },
  {
    id: 'colors',
    name: 'Colors',
    description: 'Learn colors',
    icon: Palette,
    color: 'bg-pink-500',
    hoverColor: 'hover:bg-pink-600',
    preview: '🎨',
  },
  {
    id: 'shapes',
    name: 'Shapes',
    description: 'Learn shapes',
    icon: Shapes,
    color: 'bg-purple-500',
    hoverColor: 'hover:bg-purple-600',
    preview: '⬟',
  },
  {
    id: 'objects',
    name: 'Objects',
    description: 'Learn about objects',
    icon: Image,
    color: 'bg-amber-500',
    hoverColor: 'hover:bg-amber-600',
    preview: '🦁',
  },
  {
    id: 'typing',
    name: 'Typing',
    description: 'Type & hear letters',
    icon: Keyboard,
    color: 'bg-orange-500',
    hoverColor: 'hover:bg-orange-600',
    preview: '⌨️',
  },
];

const Home = () => {
  return (
    <div className="h-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex flex-col items-center justify-center p-4 overflow-hidden">
      <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4 text-center">
        Toddler Learning App
      </h1>
      <p className="text-lg md:text-xl text-gray-600 mb-12 text-center">
        Choose what you want to learn today!
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 max-w-5xl w-full">
        {categories.map((category) => {
          const IconComponent = category.icon;
          return (
            <Link
              key={category.id}
              to={`/${category.id}`}
              className={`${category.color} ${category.hoverColor} rounded-2xl p-6 md:p-8 text-white shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl flex flex-col items-center justify-center gap-3`}
            >
              <IconComponent size={48} className="md:w-16 md:h-16" />
              <span className="text-3xl md:text-5xl font-bold">
                {category.preview}
              </span>
              <span className="text-lg md:text-xl font-semibold">
                {category.name}
              </span>
              <span className="text-sm opacity-80 hidden md:block">
                {category.description}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 text-gray-500 text-sm">
        Use arrow keys or tap to navigate
      </div>
    </div>
  );
};

export default Home;
