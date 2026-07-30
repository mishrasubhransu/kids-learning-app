import { useEffect, useMemo, useRef, useCallback } from 'react';
import useVoice from '../../hooks/useVoice';
import { fixedLinePart } from '../../data/voiceLines';
import { relationByValue } from '../../data/relations';
import { familyPhotoUrl } from '../../lib/familyPhotos';

// Family-tree entry page — the My Family take on CategoryIntro: instead of
// a scattered collage, members stand in generation rows (grandparents,
// parents, then the child's own row with the active child in it), joined by
// a little trunk. Tap anywhere (or ArrowRight — it drives everything in
// this app) to circle-reveal into the lesson.

const TreeNode = ({ photoUrl, emoji, name, highlight = false }) => (
  <span className="flex flex-col items-center gap-1.5 w-20 md:w-24">
    <span
      className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden shadow-lg ring-4 flex items-center justify-center bg-white text-3xl md:text-4xl ${
        highlight ? 'ring-amber-400' : 'ring-white'
      }`}
      aria-hidden={photoUrl ? undefined : 'true'}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        emoji
      )}
    </span>
    <span className="text-xs md:text-sm font-bold text-gray-700 text-center leading-tight truncate w-full">
      {name}
    </span>
  </span>
);

const FamilyTreeIntro = ({ members, activeChild, onReveal }) => {
  const { speak, cancel } = useVoice();
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancel();
    onReveal();
  }, [cancel, onReveal]);

  // Generation rows, top to bottom; the child joins their own row so they
  // can find themself in the tree
  const rows = useMemo(() => {
    const byGeneration = [[], [], []];
    members.forEach((m) => {
      const gen = relationByValue(m.relation)?.generation ?? 2;
      byGeneration[gen].push({
        key: m.id,
        name: m.name,
        photoUrl: familyPhotoUrl(m.photo_path),
        emoji: relationByValue(m.relation)?.emoji || '🙂',
      });
    });
    if (activeChild) {
      byGeneration[2].push({
        key: 'me',
        name: activeChild.name,
        photoUrl: null,
        emoji: activeChild.avatar || '🧒',
        highlight: true,
      });
    }
    return byGeneration.filter((row) => row.length > 0);
  }, [members, activeChild]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!doneRef.current) speak(fixedLinePart('this-is-my-family'));
    }, 300);
    return () => clearTimeout(timer);
  }, [speak]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish]);

  return (
    <button
      type="button"
      onClick={finish}
      aria-label="This is my family! Tap to start"
      className="absolute inset-0 w-full h-full bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex flex-col items-center justify-center gap-4 md:gap-6 p-6 overflow-hidden cursor-pointer"
    >
      <h1 className="text-4xl md:text-6xl font-black text-gray-800">
        My Family
      </h1>

      <div className="flex flex-col items-center">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-col items-center">
            {i > 0 && (
              <span
                className="w-1 h-5 md:h-7 bg-amber-300 rounded-full my-1"
                aria-hidden="true"
              />
            )}
            <div className="flex flex-wrap justify-center gap-4 md:gap-8">
              {row.map((node) => (
                <TreeNode key={node.key} {...node} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="text-lg md:text-xl text-gray-500 font-semibold motion-safe:animate-pulse">
        Tap to meet everyone!
      </p>
    </button>
  );
};

export default FamilyTreeIntro;
