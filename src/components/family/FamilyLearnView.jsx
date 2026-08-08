import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';
import { neutralNameUrl } from '../../lib/nameAudio';
import { relationByValue } from '../../data/relations';
import { kinshipLabel, kinshipEmoji, selfLabel } from '../../data/kinship';
import { useLocale } from '../../context/LocaleContext';
import { useChildProfile } from '../../context/ChildProfileContext';
import ownedByFocusedControl from '../../utils/ownedByFocusedControl';

// One family member at a time: big photo, their name said out loud (the
// ElevenLabs name clip when it exists, TTS otherwise), arrows to move on —
// right arrow drives everything, tap the photo to hear the name again (and,
// when the member has several photos, see another one — same person, new
// picture). The kinship pill under the name is in the child's language.
// holdIntro keeps this view silent and deaf to keys while the family-tree
// intro is up (it's mounted underneath the reveal), same contract as
// ScrollView/PairLearnView — the first name lands as the reveal opens.
const FamilyLearnView = ({ items, holdIntro = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { speak, cancel } = useSpeech();
  const { locale } = useLocale();
  const { activeChild } = useChildProfile();
  const audioRef = useRef(null);
  const current = items[currentIndex];

  // Which of the current member's photos is up. null = the page-visit pick
  // (item.image); every navigation and tap re-rolls it in the event handler
  // (render stays pure — no Math.random outside handlers).
  const [photoIdx, setPhotoIdx] = useState(null);

  const sayName = useCallback(
    (item) => {
      audioRef.current?.pause();
      cancel();
      if (item.audioPath) {
        const audio = new Audio(neutralNameUrl(item.audioPath));
        audioRef.current = audio;
        // Clip missing or blocked: same name via TTS
        audio.onerror = () => speak(item.name);
        audio.play().catch(() => speak(item.name));
      } else {
        speak(item.name);
      }
    },
    [cancel, speak]
  );

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (holdIntro || !current) return;
    const timer = setTimeout(() => sayName(current), 250);
    return () => clearTimeout(timer);
  }, [holdIntro, currentIndex, current, sayName]);

  // Moving to a card re-rolls which of that member's photos comes up
  const goTo = useCallback(
    (delta) => {
      const next = (currentIndex + delta + items.length) % items.length;
      const count = items[next]?.images?.length || 0;
      setPhotoIdx(count ? Math.floor(Math.random() * count) : 0);
      setCurrentIndex(next);
    },
    [currentIndex, items]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (holdIntro || e.repeat || ownedByFocusedControl(e)) return;
      if (e.key === 'ArrowRight') goTo(1);
      else if (e.key === 'ArrowLeft') goTo(-1);
      else if (e.key === 'r' || e.key === 'R') {
        if (current) sayName(current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, sayName, current, holdIntro]);

  if (!current) return null;

  const photoCount = current.images?.length || 0;
  const shownIdx =
    photoIdx === null
      ? Math.max(0, current.images?.indexOf(current.image) ?? 0)
      : photoCount
        ? photoIdx % photoCount
        : 0;
  const photo = current.images?.[shownIdx] ?? current.image;
  // A member linked to the viewing child's own profile is simply "Me!"
  const isSelf =
    current.childProfileId && current.childProfileId === activeChild?.id;
  const pill = isSelf ? selfLabel(locale) : kinshipLabel(current, locale);
  // Repeat the name and, with several photos, hop to a different one —
  // same person, new picture
  const onCardTap = () => {
    sayName(current);
    if (photoCount > 1) {
      setPhotoIdx(
        (shownIdx + 1 + Math.floor(Math.random() * (photoCount - 1))) % photoCount
      );
    }
  };

  return (
    <div className="flex-1 min-h-0 flex items-center justify-center gap-2 md:gap-6 p-4 relative">
      <button
        onClick={() => goTo(-1)}
        aria-label="Previous"
        className="shrink-0 bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 rounded-full p-2.5 md:p-3.5 shadow-lg transition-colors"
      >
        <ChevronLeft size={30} />
      </button>

      <button
        onClick={onCardTap}
        aria-label={`${current.name}. Tap to hear again`}
        className="flex flex-col items-center gap-3 md:gap-4 min-w-0 cursor-pointer select-none"
      >
        <span className="w-[min(62vw,48vh)] aspect-square rounded-3xl overflow-hidden shadow-xl ring-8 ring-white bg-white flex items-center justify-center text-[8rem]">
          {photo ? (
            <img
              src={photo}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <span aria-hidden="true">
              {kinshipEmoji(current) ||
                relationByValue(current.relation)?.emoji ||
                '🙂'}
            </span>
          )}
        </span>
        <span className="text-4xl md:text-6xl font-black text-gray-800">
          {current.name}
        </span>
        {pill && (
          <span className="text-lg md:text-xl font-semibold text-amber-600 bg-amber-100 px-4 py-1 rounded-full">
            {pill}
          </span>
        )}
      </button>

      <button
        onClick={() => goTo(1)}
        aria-label="Next"
        className="shrink-0 bg-white/80 hover:bg-white text-gray-500 hover:text-gray-700 rounded-full p-2.5 md:p-3.5 shadow-lg transition-colors"
      >
        <ChevronRight size={30} />
      </button>

      <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
        {items.map((item, i) => (
          <span
            key={item.id}
            className={`w-2 h-2 rounded-full ${
              i === currentIndex ? 'bg-amber-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default FamilyLearnView;
