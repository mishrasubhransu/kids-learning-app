import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { phonicsFamilies, phonicsWords } from '../data/phonics';

const groups = [
  { id: '2-letter', title: '2-Letter Sounds', subtitle: 'Consonant + vowel' },
  { id: '3-letter', title: '3-Letter Words', subtitle: 'Word families' },
];

const PhonicsHome = () => {
  return (
    <div className="h-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col overflow-y-auto">
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

      <div className="flex-1 flex flex-col items-center p-6 md:p-10 gap-8 md:gap-10">
        {groups.map((group) => {
          const families = phonicsFamilies.filter((f) => f.group === group.id);
          return (
            <section key={group.id} className="w-full max-w-5xl">
              <div className="mb-4 px-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                  {group.title}
                </h2>
                <p className="text-sm md:text-base text-gray-500">
                  {group.subtitle}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                {families.map((family) => (
                  <Link
                    key={family.id}
                    to={`/phonics/${family.id}`}
                    className={`${family.color} ${family.hoverColor} rounded-2xl p-4 md:p-5 text-white shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl flex flex-col items-center justify-center gap-1`}
                  >
                    {family.emoji && (
                      <span className="text-3xl md:text-4xl">{family.emoji}</span>
                    )}
                    <span className="text-3xl md:text-5xl font-bold tracking-wide uppercase">
                      <span className="opacity-70">_</span>
                      {family.id}
                    </span>
                    <span className="text-xs opacity-80">
                      {phonicsWords[family.id].length} sounds
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default PhonicsHome;
