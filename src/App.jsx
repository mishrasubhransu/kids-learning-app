import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Settings } from 'lucide-react';

const App = () => {
  const [mode, setMode] = useState('alphabet'); // 'alphabet' | 'numbers'
  const [objectType, setObjectType] = useState('eggs'); // 'peanuts' | 'strawberries' | 'eggs'
  const [currentIndex, setCurrentIndex] = useState(0);

  // Data configurations
  const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  const numbers = Array.from({ length: 10 }, (_, i) => i + 1);

  const objectIcons = {
    peanuts: '🥜',
    strawberries: '🍓',
    eggs: '🥚'
  };

  // Determine current dataset length based on mode
  const currentLength = mode === 'alphabet' ? letters.length : numbers.length;

  // Handle navigation logic
  const goNext = () => {
    setCurrentIndex((prev) => (prev < currentLength - 1 ? prev + 1 : 0));
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : currentLength - 1));
  };

  // Switch mode handler
  const switchMode = (newMode) => {
    setMode(newMode);
    setCurrentIndex(0); // Reset to start when changing modes
  };

  // Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentLength]); // Re-bind if length changes (mode switch)

  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center relative overflow-hidden select-none font-sans">

      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex flex-col md:flex-row items-center justify-center gap-4 bg-white/80 backdrop-blur-sm z-10 border-b border-gray-100">

        {/* Mode Toggles */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => switchMode('alphabet')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'alphabet'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Alphabets
          </button>
          <button
            onClick={() => switchMode('numbers')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'numbers'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Numbers
          </button>
        </div>

        {/* Object Selector (Only in Numbers mode) */}
        {mode === 'numbers' && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-sm text-gray-500 font-medium">Count:</label>
            <select
              value={objectType}
              onChange={(e) => setObjectType(e.target.value)}
              className="bg-gray-100 border-none rounded-md px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-gray-200 cursor-pointer outline-none"
            >
              <option value="peanuts">Peanuts 🥜</option>
              <option value="strawberries">Strawberries 🍓</option>
              <option value="eggs">Eggs 🥚</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Display Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl p-8 mt-16 mb-24">

        {mode === 'alphabet' ? (
          // Alphabet Display
          <span className="text-[12rem] md:text-[20rem] font-bold text-gray-500 leading-none animate-in zoom-in duration-300">
            {letters[currentIndex]}
          </span>
        ) : (
          // Numbers/Objects Display
          <div className="flex flex-col items-center gap-8 animate-in zoom-in duration-300">
            {/* The Count Number */}
            <span className="text-6xl font-bold text-gray-300">
              {currentIndex + 1}
            </span>

            {/* The Objects Grid - 5 columns ensures 6th is below 1st */}
            <div className="grid grid-cols-5 gap-2 md:gap-8 justify-items-center min-h-[7.5rem] md:min-h-[14rem] content-start">
              {Array.from({ length: currentIndex + 1 }).map((_, i) => (
                <div key={i} className="text-[3.5rem] md:text-[6rem] leading-none filter drop-shadow-lg transform transition-all hover:scale-110 duration-200">
                  {objectIcons[objectType]}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Visual Navigation Hints */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 md:px-8 pointer-events-none">
        <button
          onClick={goPrev}
          className="pointer-events-auto p-4 rounded-full hover:bg-gray-100 transition-colors opacity-20 hover:opacity-100 focus:outline-none"
          aria-label="Previous"
        >
          <ChevronLeft size={48} className="text-gray-400" />
        </button>

        <button
          onClick={goNext}
          className="pointer-events-auto p-4 rounded-full hover:bg-gray-100 transition-colors opacity-20 hover:opacity-100 focus:outline-none"
          aria-label="Next"
        >
          <ChevronRight size={48} className="text-gray-400" />
        </button>
      </div>

      {/* Progress Indicators */}
      <div className="absolute bottom-12 flex flex-wrap justify-center gap-2 max-w-[90%]">
        {Array.from({ length: currentLength }).map((_, idx) => (
          <div
            key={idx}
            className={`rounded-full transition-all duration-300 ${
              idx === currentIndex
                ? 'bg-gray-500 w-3 h-3'
                : 'bg-gray-200 w-2 h-2'
            }`}
          />
        ))}
      </div>

      <div className="absolute bottom-4 text-gray-300 text-xs md:text-sm">
        Use Left/Right Arrow Keys
      </div>
    </div>
  );
};

export default App;
