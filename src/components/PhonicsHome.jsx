import { Link } from 'react-router-dom';
import { phonicsFamilies, phonicsWords } from '../data/phonics';
import { customWordItems } from '../data/wordLibrary';
import HomeButton from './ui/HomeButton';
import { isLessonEnabled } from '../data/lessons';
import { useChildProfile } from '../context/ChildProfileContext';
import useWordCase from '../hooks/useWordCase';

// Letter Sounds ("A is for Apple") used to live here — it's a Home card now.

const groups = [
  { id: '2-letter', title: '2-Letter Sounds', subtitle: 'Consonant + vowel' },
  { id: '3-letter', title: '3-Letter Words', subtitle: 'Word families' },
];

const PhonicsHome = () => {
  const { activeChild } = useChildProfile();
  const enabledLessons = activeChild?.settings?.enabledLessons;
  const caseClass = useWordCase();
  // Parent-curated list: having words IS the on switch (no registry key)
  const myWordsCount = customWordItems(activeChild?.settings?.customWords).length;

  return (
    <div className="h-full bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col overflow-y-auto">
      <div className="bg-white shadow-sm border-b border-gray-100 p-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <HomeButton />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Phonics
          </h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center p-6 md:p-10 gap-8 md:gap-10">
        {groups.map((group) => {
          const families = phonicsFamilies.filter(
            (f) =>
              f.group === group.id &&
              isLessonEnabled(enabledLessons, `phonics.${f.id}`)
          );
          if (families.length === 0) return null;
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
                    className={`${family.color} ${family.hoverColor} rounded-2xl p-4 md:p-5 text-white shadow-lg transform transition-all duration-200 motion-safe:hover:scale-105 hover:shadow-xl motion-safe:active:scale-95 flex flex-col items-center justify-center gap-1`}
                  >
                    {family.emoji && (
                      <span className="text-3xl md:text-4xl">{family.emoji}</span>
                    )}
                    <span className={`text-3xl md:text-5xl font-bold tracking-wide ${caseClass}`}>
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

        {myWordsCount > 0 && (
          <section className="w-full max-w-5xl">
            <div className="mb-4 px-1">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                My Words
              </h2>
              <p className="text-sm md:text-base text-gray-500">
                Picked just for you
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              <Link
                to="/phonics/my-words"
                className="bg-rose-500 hover:bg-rose-600 rounded-2xl p-4 md:p-5 text-white shadow-lg transform transition-all duration-200 motion-safe:hover:scale-105 hover:shadow-xl motion-safe:active:scale-95 flex flex-col items-center justify-center gap-1"
              >
                <span className="text-3xl md:text-4xl">⭐</span>
                <span className="text-2xl md:text-3xl font-bold">My Words</span>
                <span className="text-xs opacity-80">
                  {myWordsCount} {myWordsCount === 1 ? 'word' : 'words'}
                </span>
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default PhonicsHome;
