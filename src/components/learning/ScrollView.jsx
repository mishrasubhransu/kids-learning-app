import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';

const bgColors = [
  '#e74c3c', '#8e44ad', '#3498db', '#1abc9c',
  '#f1c40f', '#e67e22', '#2ecc71', '#ff0066', '#34495e',
];

const ScrollView = ({ items, category, objectIcons, shapeColor }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [objectType, setObjectType] = useState('eggs');
  const [bgColor, setBgColor] = useState('#2c3e50');
  const { speak } = useSpeech();
  const hasInteracted = useRef(false);
  const prevIndexRef = useRef(currentIndex);

  const currentItem = items[currentIndex];

  const speakCurrent = useCallback(() => {
    if (currentItem) {
      speak(currentItem.name);
    }
  }, [currentItem, speak]);

  // Speak and change background when navigating (after user has interacted)
  useEffect(() => {
    if (hasInteracted.current && prevIndexRef.current !== currentIndex) {
      speakCurrent();
      setBgColor(bgColors[Math.floor(Math.random() * bgColors.length)]);
    }
    prevIndexRef.current = currentIndex;
  }, [currentIndex, speakCurrent]);

  const goNext = useCallback(() => {
    hasInteracted.current = true;
    setCurrentIndex((prev) => {
      const next = prev < items.length - 1 ? prev + 1 : 0;
      return next;
    });
  }, [items.length]);

  const goPrev = useCallback(() => {
    hasInteracted.current = true;
    setCurrentIndex((prev) => {
      const next = prev > 0 ? prev - 1 : items.length - 1;
      return next;
    });
  }, [items.length]);

  const handleItemClick = () => {
    hasInteracted.current = true;
    speakCurrent();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        hasInteracted.current = true;
        speakCurrent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, speakCurrent]);

  const renderItem = () => {
    switch (category) {
      case 'alphabets':
        return (
          <span className="font-bold leading-none select-none text-white" style={{
            fontSize: 'min(25vw, 40vh)',
            textShadow: '4px 4px 10px rgba(0,0,0,0.3)',
            fontFamily: 'Arial, sans-serif'
          }}>
            {currentItem.display}
          </span>
        );

      case 'numbers':
        return (
          <div className="flex flex-col items-center gap-8">
            <span className="text-6xl md:text-8xl font-bold text-white/80">
              {currentItem.value}
            </span>
            <div className="grid grid-cols-5 gap-2 md:gap-4 justify-items-center min-h-[7.5rem] md:min-h-[14rem] content-start">
              {Array.from({ length: currentItem.value }).map((_, i) => (
                <div
                  key={i}
                  className="text-[3rem] md:text-[5rem] leading-none filter drop-shadow-lg transform transition-all hover:scale-110 duration-200"
                >
                  {objectIcons?.[objectType] || '🥚'}
                </div>
              ))}
            </div>
            {objectIcons && (
              <select
                value={objectType}
                onChange={(e) => setObjectType(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/20 border-none rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-white/30 cursor-pointer outline-none"
              >
                {Object.entries(objectIcons).map(([key, icon]) => (
                  <option key={key} value={key}>
                    {key.charAt(0).toUpperCase() + key.slice(1)} {icon}
                  </option>
                ))}
              </select>
            )}
          </div>
        );

      case 'colors':
        return (
          <div className="flex flex-col items-center gap-6">
            <div
              className="w-48 h-48 md:w-72 md:h-72 rounded-full shadow-2xl border-4 border-white transition-transform hover:scale-105"
              style={{
                backgroundColor: currentItem.hex,
                boxShadow: currentItem.name === 'White' 
                  ? '0 25px 50px -12px rgba(0, 0, 0, 0.25), inset 0 0 0 2px #e5e7eb' 
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}
            />
            <span className="text-4xl md:text-6xl font-bold text-white">
              {currentItem.name}
            </span>
          </div>
        );

      case 'shapes':
        return (
          <div className="flex flex-col items-center gap-6">
            <div className="w-48 h-48 md:w-72 md:h-72">
              {currentItem.svg(shapeColor)}
            </div>
            <span className="text-4xl md:text-6xl font-bold text-white">
              {currentItem.name}
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center p-4 relative transition-colors duration-300"
      style={{ backgroundColor: bgColor }}
    >
      {/* Main display - clickable to speak */}
      <button
        onClick={handleItemClick}
        className="flex items-center justify-center min-h-[50vh] cursor-pointer hover:opacity-90 transition-opacity focus:outline-none"
        aria-label={`Speak ${currentItem?.name}`}
      >
        {renderItem()}
      </button>

      {/* Speak button hint */}
      <button
        onClick={handleItemClick}
        className="absolute top-4 right-4 p-3 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
        aria-label="Speak"
      >
        <Volume2 size={24} />
      </button>

      {/* Navigation arrows */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 md:px-8 pointer-events-none">
        <button
          onClick={goPrev}
          className="pointer-events-auto p-4 rounded-full hover:bg-white/20 transition-colors opacity-40 hover:opacity-100 focus:outline-none"
          aria-label="Previous"
        >
          <ChevronLeft size={48} className="text-white" />
        </button>
        <button
          onClick={goNext}
          className="pointer-events-auto p-4 rounded-full hover:bg-white/20 transition-colors opacity-40 hover:opacity-100 focus:outline-none"
          aria-label="Next"
        >
          <ChevronRight size={48} className="text-white" />
        </button>
      </div>

      {/* Progress indicators */}
      <div className="absolute bottom-16 flex flex-wrap justify-center gap-2 max-w-[90%]">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              hasInteracted.current = true;
              setCurrentIndex(idx);
            }}
            className={`rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? 'bg-white w-3 h-3'
                : 'bg-white/40 w-2 h-2 hover:bg-white/60'
            }`}
            aria-label={`Go to item ${idx + 1}`}
          />
        ))}
      </div>

      <div className="absolute bottom-6 text-white/40 text-xs md:text-sm">
        Click the letter or use Arrow Keys | Space to hear
      </div>
    </div>
  );
};

export default ScrollView;
