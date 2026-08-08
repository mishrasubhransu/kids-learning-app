import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Gamepad2 } from 'lucide-react';
import HomeButton from '../ui/HomeButton';
import TestingMode from '../testing/TestingMode';
import FamilyTreeIntro from './FamilyTreeIntro';
import FamilyLearnView from './FamilyLearnView';
import useFamilyMembers, { memberPhotoPaths } from '../../hooks/useFamilyMembers';
import useChildSetting from '../../hooks/useChildSetting';
import useSessionItems from '../../hooks/useSessionItems';
import { useChildProfile } from '../../context/ChildProfileContext';
import { familyPhotoUrl } from '../../lib/familyPhotos';
import { setScreenContext } from '../../lib/analytics';

// The My Family lesson: a family-tree entry page (instead of the standard
// collage intro) that circle-reveals into Learn/Test on the child's own
// people. Members come from the account-wide list the parent manages in
// the Parent Zone.

// Salted at module load (NOT during render — render must stay pure), so a
// multi-photo member leads with a different photo on each app visit while
// every render of one visit agrees on the pick.
const VISIT_SALT = Math.floor(Math.random() * 0xffffffff);
const visitPhotoIndex = (memberId, count) => {
  let h = VISIT_SALT;
  for (const ch of String(memberId)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
  return h % count;
};
const FamilyPage = ({ backTo = '/home' }) => {
  const { members, loading } = useFamilyMembers();
  const { activeChild } = useChildProfile();
  const [mode, setMode] = useState('learn'); // 'learn' | 'test'
  const [introState, setIntroState] = useState('intro'); // 'intro' | 'revealing' | 'done'

  // `image` is a fresh pick from the member's photos each app visit — the
  // child should recognise the person, not one particular picture. Learn
  // mode re-shuffles per interaction via `images`; the test inherits the
  // per-visit pick.
  const items = useMemo(
    () =>
      members.map((m) => {
        const images = memberPhotoPaths(m).map(familyPhotoUrl);
        return {
          id: m.id,
          name: m.name,
          relation: m.relation,
          relationDetail: m.relation_detail,
          images,
          image: images.length ? images[visitPhotoIndex(m.id, images.length)] : null,
          audioPath: m.name_audio_path,
        };
      }),
    [members]
  );

  // The test is a picture quiz, so only members with photos qualify; the
  // parent-configured test cap rotates them like every other category
  const photoItems = useMemo(() => items.filter((i) => i.image), [items]);
  const [testCap] = useChildSetting('testItemCap', 'all');
  const testItems = useSessionItems('family', 'test', photoItems, testCap, mode === 'test');

  const reduceMotion = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );
  const beginReveal = () => setIntroState(reduceMotion ? 'done' : 'revealing');
  useEffect(() => {
    if (introState !== 'revealing') return;
    const t = setTimeout(() => setIntroState('done'), 750);
    return () => clearTimeout(t);
  }, [introState]);

  useEffect(() => {
    setScreenContext({ category: 'family', mode });
    return () => setScreenContext({ mode: null });
  }, [mode]);

  // No members yet: the lesson can't start, so point the grown-up at the
  // Parent Zone instead of showing an empty tree
  if (!loading && members.length === 0) {
    return (
      <div className="h-full bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-7xl" aria-hidden="true">👪</div>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-700">
          Let&apos;s meet your family!
        </h1>
        <p className="text-lg text-gray-500 max-w-md">
          Ask a grown-up to add family photos in the Parent Zone, and the
          people you love will appear here.
        </p>
        <Link
          to="/parent"
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors shadow-lg"
        >
          Open Parent Zone
        </Link>
        <HomeButton to={backTo} />
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {introState !== 'done' && members.length > 0 && (
        <FamilyTreeIntro
          members={members}
          activeChild={activeChild}
          onReveal={beginReveal}
        />
      )}
      <div
        className="h-full bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col overflow-hidden relative"
        style={
          introState === 'intro'
            ? { clipPath: 'circle(0% at 50% 50%)' }
            : introState === 'revealing'
              ? {
                  clipPath: 'circle(75% at 50% 50%)',
                  transition: 'clip-path 700ms ease-in-out',
                }
              : undefined
        }
      >
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-100 p-4">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <HomeButton to={backTo} />
              <span
                className="bg-rose-100 w-10 h-10 rounded-xl flex items-center justify-center text-2xl shadow-sm"
                aria-hidden="true"
              >
                👪
              </span>
              <h1 className="text-2xl font-bold text-gray-800">My Family</h1>
            </div>

            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setMode('learn')}
                className={`min-h-10 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === 'learn'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <BookOpen size={16} />
                Learn
              </button>
              <button
                onClick={() => setMode('test')}
                className={`min-h-10 px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                  mode === 'test'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Gamepad2 size={16} />
                Test
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-h-0 flex flex-col">
          {mode === 'learn' && items.length > 0 && (
            <FamilyLearnView items={items} holdIntro={introState === 'intro'} />
          )}
          {mode === 'test' &&
            (photoItems.length >= 2 ? (
              <TestingMode
                items={testItems}
                category="family"
                difficulty="easy"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div className="text-6xl" aria-hidden="true">📷</div>
                <p className="text-xl text-gray-500 max-w-md">
                  The family game needs at least two photos — ask a grown-up
                  to add some in the Parent Zone!
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default FamilyPage;
