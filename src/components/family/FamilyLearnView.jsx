import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';
import { neutralNameUrl } from '../../lib/nameAudio';
import { relationByValue, relationLabel } from '../../data/relations';
import ownedByFocusedControl from '../../utils/ownedByFocusedControl';

// One family member at a time: big photo, their name said out loud (the
// ElevenLabs name clip when it exists, TTS otherwise), arrows to move on —
// right arrow drives everything, tap the photo to hear the name again.
const FamilyLearnView = ({ items }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { speak, cancel } = useSpeech();
  const audioRef = useRef(null);
  const current = items[currentIndex];

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
    if (!current) return;
    const timer = setTimeout(() => sayName(current), 250);
    return () => clearTimeout(timer);
  }, [currentIndex, current, sayName]);

  const goTo = useCallback(
    (delta) => {
      setCurrentIndex((prev) =>
        (prev + delta + items.length) % items.length
      );
    },
    [items.length]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat || ownedByFocusedControl(e)) return;
      if (e.key === 'ArrowRight') goTo(1);
      else if (e.key === 'ArrowLeft') goTo(-1);
      else if (e.key === 'r' || e.key === 'R') {
        if (current) sayName(current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo, sayName, current]);

  if (!current) return null;

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
        onClick={() => sayName(current)}
        aria-label={`${current.name}. Tap to hear again`}
        className="flex flex-col items-center gap-3 md:gap-4 min-w-0 cursor-pointer select-none"
      >
        <span className="w-[min(62vw,48vh)] aspect-square rounded-3xl overflow-hidden shadow-xl ring-8 ring-white bg-white flex items-center justify-center text-[8rem]">
          {current.image ? (
            <img
              src={current.image}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <span aria-hidden="true">
              {relationByValue(current.relation)?.emoji || '🙂'}
            </span>
          )}
        </span>
        <span className="text-4xl md:text-6xl font-black text-gray-800">
          {current.name}
        </span>
        <span className="text-lg md:text-xl font-semibold text-amber-600 bg-amber-100 px-4 py-1 rounded-full">
          {relationLabel(current.relation)}
        </span>
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
