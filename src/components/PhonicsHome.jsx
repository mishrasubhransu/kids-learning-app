import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { phonicsFamilies, phonicsWords } from '../data/phonics';

const PhonicsHome = () => {
  return (
    <div className="h-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col overflow-hidden">
      <div className="bg-white shadow-sm border-b border-gray-100 p-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link
            to="/home"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Go home"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Phonics
          </h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <p className="text-lg md:text-xl text-gray-600 mb-8 text-center">
          Pick a word family to learn!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl w-full">
          {phonicsFamilies.map((family) => (
            <Link
              key={family.id}
              to={`/phonics/${family.id}`}
              className={`${family.color} ${family.hoverColor} rounded-2xl p-6 md:p-8 text-white shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl flex flex-col items-center justify-center gap-3`}
            >
              <span className="text-5xl md:text-6xl">{family.emoji}</span>
              <span className="text-3xl md:text-4xl font-bold tracking-wide uppercase">
                <span className="opacity-70">_</span>
                {family.id}
              </span>
              <span className="text-sm opacity-80">
                {phonicsWords[family.id].length} words
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PhonicsHome;
