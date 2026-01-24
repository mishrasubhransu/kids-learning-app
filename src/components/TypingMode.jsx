import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import useSpeech from '../hooks/useSpeech';

const colors = [
  '#e74c3c', // Red
  '#8e44ad', // Purple
  '#3498db', // Blue
  '#1abc9c', // Teal
  '#f1c40f', // Yellow
  '#e67e22', // Orange
  '#2ecc71', // Green
  '#ff0066', // Pink
  '#34495e', // Dark gray
];

const TypingMode = () => {
  const [currentLetter, setCurrentLetter] = useState(null);
  const [bgColor, setBgColor] = useState('#2c3e50');
  const { speak } = useSpeech();

  const handleKeyPress = useCallback((event) => {
    // Ignore key repeats (holding down)
    if (event.repeat) return;

    // Check if key is a letter (A-Z) or number (0-9)
    if (event.key.length === 1 && event.key.match(/[a-z0-9]/i)) {
      const char = event.key.toUpperCase();

      // Update display
      setCurrentLetter(char);

      // Change background color
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      setBgColor(randomColor);

      // Speak the character
      speak(char);
    }
  }, [speak]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center transition-colors duration-300 relative"
      style={{ backgroundColor: bgColor }}
    >
      {/* Home button */}
      <Link
        to="/"
        className="absolute top-4 left-4 p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
        aria-label="Go home"
      >
        <Home size={24} className="text-white" />
      </Link>

      {/* Letter display */}
      <div className="text-white font-bold select-none" style={{ 
        fontSize: 'min(25vw, 40vh)',
        textShadow: '4px 4px 10px rgba(0,0,0,0.3)',
        fontFamily: 'Arial, sans-serif'
      }}>
        {currentLetter || 'Hi!'}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-8 text-white/50 text-lg md:text-xl text-center px-4">
        {currentLetter 
          ? 'Keep typing! Each letter will be spoken.'
          : 'Press any letter or number on your keyboard!'
        }
      </div>

      {/* Visual keyboard hint for mobile */}
      <div className="absolute bottom-20 text-white/30 text-sm">
        Works best with a physical keyboard
      </div>
    </div>
  );
};

export default TypingMode;
