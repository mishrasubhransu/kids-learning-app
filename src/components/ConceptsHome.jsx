import { Link } from 'react-router-dom';
import { conceptCategories, conceptItems } from '../data/concepts';
import HomeButton from './ui/HomeButton';
import StyleToggle from './ui/StyleToggle';
import { stylesForCategory } from '../lib/imageStyles';
import { isLessonEnabled } from '../data/lessons';
import { useChildProfile } from '../context/ChildProfileContext';
import { useLocale } from '../context/LocaleContext';

const ConceptsHome = () => {
  const { activeChild } = useChildProfile();
  const { t } = useLocale();
  const enabledLessons = activeChild?.settings?.enabledLessons;
  const visibleCategories = conceptCategories.filter((cat) =>
    isLessonEnabled(enabledLessons, `concepts.${cat.id}`)
  );

  return (
    <div className="h-full bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 p-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <HomeButton />
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            {t('cat.concepts')}
          </h1>
        </div>
      </div>

      {/* Category selection. Scroll lives on this wrapper (not justify-center's
          flex box) so overflowing rows on phones scroll instead of clipping
          the top — same pattern as Home. */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center p-6 md:p-12">
          <p className="text-lg md:text-xl text-gray-600 mb-8 text-center">
            {t('concepts.title')}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 max-w-5xl w-full">
            {visibleCategories.map((cat) => {
              // Lessons with more than one art style (e.g. emotions
              // cartoon/real) get a toggle pill. It sits over the card as a
              // sibling of the Link, not inside it — nested interactive
              // elements are invalid HTML (same pattern as Home).
              const styleCategory = `concepts-${cat.id}`;
              const hasStyles = Boolean(stylesForCategory(styleCategory));
              return (
                <div
                  key={cat.id}
                  className="group relative transform transition-transform duration-200 motion-safe:hover:scale-105"
                >
                  {/* No name callout on tap — the category's intro page
                      announces it with the collage instead */}
                  <Link
                    to={`/concepts/${cat.id}`}
                    className={`${cat.color} ${cat.hoverColor} h-full rounded-2xl p-6 md:p-8 text-white shadow-lg transition-all duration-200 group-hover:shadow-xl motion-safe:active:scale-95 flex flex-col items-center justify-center gap-3`}
                  >
                    <span className="text-5xl md:text-6xl">{cat.emoji}</span>
                    <span className="text-lg md:text-xl font-semibold">
                      {t(`cat.concepts.${cat.id}`)}
                    </span>
                    <span className="text-sm opacity-80">
                      {t('concepts.itemCount', { count: conceptItems[cat.id].length })}
                    </span>
                    {hasStyles && <span className="h-8" aria-hidden="true" />}
                  </Link>
                  {hasStyles && (
                    <StyleToggle
                      category={styleCategory}
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/20 hover:bg-white/30 text-white text-sm rounded-full px-4 py-2 transition-colors whitespace-nowrap"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConceptsHome;
