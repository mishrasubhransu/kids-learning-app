import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Home, Volume2, Music } from 'lucide-react';
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

// Musical note frequencies
const notes = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.00,
  A4: 440.00
};

// Twinkle Twinkle Little Star melody mapped to A-Z
const melodyMap = {
  // "Twin-kle Twin-kle Lit-tle Star"
  'A': notes.C4, 'B': notes.C4,
  'C': notes.G4, 'D': notes.G4,
  'E': notes.A4, 'F': notes.A4,
  'G': notes.G4,
  // "How I won-der what you are"
  'H': notes.F4, 'I': notes.F4,
  'J': notes.E4, 'K': notes.E4,
  'L': notes.D4, 'M': notes.D4, 'N': notes.D4, 'O': notes.D4,
  'P': notes.C4,
  // "Up a-bove the world so high"
  'Q': notes.G4, 'R': notes.G4,
  'S': notes.F4, 'T': notes.E4,
  'U': notes.E4, 'V': notes.D4,
  // "Like a dia-mond in the sky"
  'W': notes.G4, 'X': notes.F4,
  'Y': notes.E4, 'Z': notes.D4
};

const TypingMode = () => {
  const [currentLetter, setCurrentLetter] = useState(null);
  const [bgColor, setBgColor] = useState('#2c3e50');
  const [mode, setMode] = useState('read'); // 'read' or 'music'
  const { speak } = useSpeech();
  const audioCtxRef = useRef(null);

  // Initialize audio context on first interaction
  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  }, []);

  // Play a musical tone
  const playTone = useCallback((frequency) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audioCtx = audioCtxRef.current;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    oscillator.start(now);
    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1);
    oscillator.stop(now + 1);
  }, []);

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

      // Play sound based on mode
      if (mode === 'music' && char.match(/[A-Z]/)) {
        const freq = melodyMap[char] || notes.C4;
        playTone(freq);
      } else {
        speak(char);
      }
    }
  }, [mode, speak, playTone]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Initialize audio on click (required for browsers)
  useEffect(() => {
    const handleClick = () => initAudio();
    window.addEventListener('click', handleClick, { once: true });
    return () => window.removeEventListener('click', handleClick);
  }, [initAudio]);

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

      {/* Mode toggle button */}
      <button
        onClick={() => {
          initAudio();
          setMode(mode === 'read' ? 'music' : 'read');
        }}
        className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors text-white"
      >
        {mode === 'read' ? (
          <>
            <Volume2 size={20} />
            <span className="text-sm font-medium">Read</span>
          </>
        ) : (
          <>
            <Music size={20} />
            <span className="text-sm font-medium">Music</span>
          </>
        )}
      </button>

      {/* Letter display */}
      <div className="text-white font-bold select-none" style={{ 
        fontSize: 'min(25vw, 40vh)',
        textShadow: '4px 4px 10px rgba(0,0,0,0.3)',
        fontFamily: 'Arial, sans-serif'
      }}>
        {currentLetter || (mode === 'music' ? '♫' : 'Hi!')}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-8 text-white/50 text-lg md:text-xl text-center px-4">
        {mode === 'music' 
          ? 'Type A-Z to play Twinkle Twinkle Little Star!'
          : currentLetter 
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
