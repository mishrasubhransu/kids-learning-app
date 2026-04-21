import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Volume2, Play, Square } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';

const bgColors = [
  '#e74c3c', '#8e44ad', '#3498db', '#1abc9c',
  '#f1c40f', '#e67e22', '#2ecc71', '#ff0066', '#34495e',
];

const orderedCategories = ['alphabets', 'numbers'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ScrollView = ({ items, category, objectIcons, shapeColor, objectType, onObjectTypeChange, onAutoplayComplete }) => {
  const displayItems = useMemo(
    () => orderedCategories.includes(category) ? items : shuffle(items),
    [items, category]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bgColor, setBgColor] = useState('#2c3e50');
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const { speak } = useSpeech();
  const hasInteracted = useRef(false);
  const prevIndexRef = useRef(currentIndex);
  const isCoolingDownRef = useRef(false);
  const cooldownTimerRef = useRef(null);

  const currentItem = displayItems[currentIndex];

  const speakCurrent = useCallback(() => {
    if (currentItem) {
      speak(currentItem.name);
    }
  }, [currentItem, speak]);

  const stopAutoplay = useCallback(() => {
    setIsAutoplay(false);
  }, []);

  const startAutoplay = useCallback(() => {
    setCurrentIndex(0);
    setIsAutoplay(true);
    hasInteracted.current = true;
  }, []);

  // Speak the first item when entering the page
  useEffect(() => {
    if (!isAutoplay) {
      speakCurrent();
      hasInteracted.current = true;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Speak and change background when navigating manually (non-autoplay)
  useEffect(() => {
    if (isAutoplay) return;
    if (hasInteracted.current && prevIndexRef.current !== currentIndex) {
      speakCurrent();
      if (category === 'alphabets') {
        setBgColor(bgColors[Math.floor(Math.random() * bgColors.length)]);
      }
    }
    prevIndexRef.current = currentIndex;
  }, [currentIndex, speakCurrent, isAutoplay, category]);

  // Autoplay effect: speak current item, then advance after speech ends
  useEffect(() => {
    if (!isAutoplay) return;

    let advanceTimer;
    let fallbackTimer;
    let cancelled = false;

    const utterance = speak(currentItem.name);
    if (category === 'alphabets') {
      setBgColor(bgColors[Math.floor(Math.random() * bgColors.length)]);
    }

    const advance = () => {
      if (cancelled) return;
      clearTimeout(fallbackTimer);
      clearTimeout(advanceTimer);
      if (currentIndex >= displayItems.length - 1) {
        setIsAutoplay(false);
        onAutoplayComplete?.();
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    };

    if (utterance) {
      utterance.onend = () => {
        if (cancelled) return;
        advanceTimer = setTimeout(advance, 1500);
      };
    }

    // Fallback in case onend doesn't fire
    fallbackTimer = setTimeout(advance, 5000);

    return () => {
      cancelled = true;
      clearTimeout(advanceTimer);
      clearTimeout(fallbackTimer);
    };
  }, [isAutoplay, currentIndex, speak, currentItem, category, displayItems.length, onAutoplayComplete]);

  const startCooldown = useCallback(() => {
    isCoolingDownRef.current = true;
    setIsCoolingDown(true);
    clearTimeout(cooldownTimerRef.current);
    cooldownTimerRef.current = setTimeout(() => {
      isCoolingDownRef.current = false;
      setIsCoolingDown(false);
    }, 1000);
  }, []);

  const goNext = useCallback(() => {
    if (isCoolingDownRef.current) return;
    stopAutoplay();
    hasInteracted.current = true;
    setCurrentIndex((prev) => (prev < displayItems.length - 1 ? prev + 1 : 0));
    startCooldown();
  }, [displayItems.length, startCooldown, stopAutoplay]);

  const goPrev = useCallback(() => {
    if (isCoolingDownRef.current) return;
    stopAutoplay();
    hasInteracted.current = true;
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : displayItems.length - 1));
    startCooldown();
  }, [displayItems.length, startCooldown, stopAutoplay]);

  const handleItemClick = () => {
    stopAutoplay();
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
        stopAutoplay();
        hasInteracted.current = true;
        speakCurrent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, speakCurrent, stopAutoplay]);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => clearTimeout(cooldownTimerRef.current);
  }, []);

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
            <span className="text-6xl md:text-8xl font-bold text-gray-400">
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
                onChange={(e) => onObjectTypeChange(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="bg-gray-100 border-none rounded-md px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-gray-200 cursor-pointer outline-none"
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
            <span className="text-4xl md:text-6xl font-bold text-gray-600">
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
            <span className="text-4xl md:text-6xl font-bold text-gray-600">
              {currentItem.name}
            </span>
          </div>
        );

      case 'opposites':
        return (
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-4 md:gap-8">
              <div className="flex flex-col items-center gap-2">
                <img
                  src={currentItem.images[currentItem.pair[0]]}
                  alt={currentItem.pair[0]}
                  className="w-32 h-32 md:w-48 md:h-48 lg:w-56 lg:h-56 object-contain rounded-2xl shadow-lg bg-white"
                />
                <span className="text-2xl md:text-3xl font-bold text-gray-600">
                  {currentItem.pair[0]}
                </span>
              </div>
              <span className="text-3xl md:text-5xl font-bold text-gray-300">&</span>
              <div className="flex flex-col items-center gap-2">
                <img
                  src={currentItem.images[currentItem.pair[1]]}
                  alt={currentItem.pair[1]}
                  className="w-32 h-32 md:w-48 md:h-48 lg:w-56 lg:h-56 object-contain rounded-2xl shadow-lg bg-white"
                />
                <span className="text-2xl md:text-3xl font-bold text-gray-600">
                  {currentItem.pair[1]}
                </span>
              </div>
            </div>
            <span className="text-3xl md:text-4xl font-bold text-gray-500">
              {currentItem.name}
            </span>
          </div>
        );

      default:
        if (currentItem.image) {
          return (
            <div className="flex flex-col items-center gap-6">
              <img
                src={currentItem.image}
                alt={currentItem.name}
                className="w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 object-contain rounded-2xl shadow-lg bg-white"
              />
              <span className="text-4xl md:text-6xl font-bold text-gray-600">
                {currentItem.name}
              </span>
            </div>
          );
        }
        return null;
    }
  };

  const isAlphabets = category === 'alphabets';

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center p-4 relative transition-colors duration-300"
      style={isAlphabets ? { backgroundColor: bgColor } : undefined}
    >
      {/* Main display - clickable to speak */}
      <button
        onClick={handleItemClick}
        className="flex items-center justify-center min-h-[50vh] cursor-pointer hover:opacity-90 transition-opacity focus:outline-none"
        aria-label={`Speak ${currentItem?.name}`}
      >
        {renderItem()}
      </button>

      {/* Top-right controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={() => isAutoplay ? stopAutoplay() : startAutoplay()}
          className={`p-3 rounded-full transition-colors ${
            isAutoplay
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : isAlphabets
                ? 'bg-white/20 text-white hover:bg-white/30'
                : 'bg-green-100 text-green-600 hover:bg-green-200'
          }`}
          aria-label={isAutoplay ? 'Stop autoplay' : 'Start autoplay'}
        >
          {isAutoplay ? <Square size={24} /> : <Play size={24} />}
        </button>
        <button
          onClick={handleItemClick}
          className={`p-3 rounded-full transition-colors ${
            isAlphabets
              ? 'bg-white/20 text-white hover:bg-white/30'
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          }`}
          aria-label="Speak"
        >
          <Volume2 size={24} />
        </button>
      </div>

      {/* Navigation arrows */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 md:px-8 pointer-events-none">
        <button
          onClick={goPrev}
          disabled={isCoolingDown}
          className={`pointer-events-auto p-4 rounded-full transition-all focus:outline-none ${
            isCoolingDown
              ? 'opacity-15 cursor-not-allowed'
              : `opacity-40 hover:opacity-100 ${isAlphabets ? 'hover:bg-white/20' : 'hover:bg-gray-200'}`
          }`}
          aria-label="Previous"
        >
          <ChevronLeft size={48} className={isAlphabets ? 'text-white' : 'text-gray-500'} />
        </button>
        <button
          onClick={goNext}
          disabled={isCoolingDown}
          className={`pointer-events-auto p-4 rounded-full transition-all focus:outline-none ${
            isCoolingDown
              ? 'opacity-15 cursor-not-allowed'
              : `opacity-40 hover:opacity-100 ${isAlphabets ? 'hover:bg-white/20' : 'hover:bg-gray-200'}`
          }`}
          aria-label="Next"
        >
          <ChevronRight size={48} className={isAlphabets ? 'text-white' : 'text-gray-500'} />
        </button>
      </div>

      {/* Progress indicators */}
      <div className="absolute bottom-16 flex flex-wrap justify-center gap-2 max-w-[90%]">
        {displayItems.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              stopAutoplay();
              hasInteracted.current = true;
              setCurrentIndex(idx);
            }}
            className={`rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? (isAlphabets ? 'bg-white' : 'bg-gray-500') + ' w-3 h-3'
                : (isAlphabets ? 'bg-white/40 hover:bg-white/60' : 'bg-gray-300 hover:bg-gray-400') + ' w-2 h-2'
            }`}
            aria-label={`Go to item ${idx + 1}`}
          />
        ))}
      </div>

      <div className={`absolute bottom-6 text-xs md:text-sm ${isAlphabets ? 'text-white/40' : 'text-gray-400'}`}>
        {isAutoplay
          ? `Autoplay: ${currentIndex + 1} / ${displayItems.length}`
          : 'Click the letter or use Arrow Keys | Space to hear'}
      </div>
    </div>
  );
};

export default ScrollView;
