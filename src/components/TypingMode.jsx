import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Home, Volume2, Music, Gamepad2, Play } from 'lucide-react';
import useSpeech from '../hooks/useSpeech';
import useAudioFeedback from '../hooks/useAudioFeedback';

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

const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const TypingMode = () => {
  const [currentLetter, setCurrentLetter] = useState(null);
  const [bgColor, setBgColor] = useState('#2c3e50');
  const [mode, setMode] = useState('read'); // 'read' | 'music' | 'test'
  const { speak } = useSpeech();
  const { playPositive, playEncouragement } = useAudioFeedback();
  const audioCtxRef = useRef(null);

  // Test mode state
  const [testTarget, setTestTarget] = useState(null);
  const [testResult, setTestResult] = useState(null); // 'correct' | 'wrong' | null
  const [testOrder, setTestOrder] = useState('random'); // 'random' | 'sequential'
  const [testIndex, setTestIndex] = useState(0);
  const [testCorrectCount, setTestCorrectCount] = useState(0);
  const testResultTimerRef = useRef(null);

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

  // Generate a test target letter
  const generateTestTarget = useCallback((order, index) => {
    let target;
    if (order === 'sequential') {
      target = allLetters[index % allLetters.length];
    } else {
      target = allLetters[Math.floor(Math.random() * allLetters.length)];
    }
    setTestTarget(target);
    setTestResult(null);
    setTimeout(() => speak(`Type the letter ${target}`), 300);
    return target;
  }, [speak]);

  // Start the typing test
  const startTest = useCallback(() => {
    setTestCorrectCount(0);
    setTestIndex(0);
    setTestResult(null);
    generateTestTarget(testOrder, 0);
  }, [testOrder, generateTestTarget]);

  // Reset test state when leaving test mode
  useEffect(() => {
    if (mode !== 'test') {
      setTestTarget(null);
      setTestResult(null);
      setTestCorrectCount(0);
      setTestIndex(0);
      clearTimeout(testResultTimerRef.current);
    }
  }, [mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(testResultTimerRef.current);
  }, []);

  const handleKeyPress = useCallback((event) => {
    // Ignore key repeats (holding down)
    if (event.repeat) return;

    // Check if key is a letter (A-Z) or number (0-9)
    if (event.key.length !== 1 || !event.key.match(/[a-z0-9]/i)) return;

    const char = event.key.toUpperCase();

    // Test mode handling
    if (mode === 'test') {
      if (!testTarget || testResult !== null) return;

      if (char === testTarget) {
        setTestResult('correct');
        const newCount = testCorrectCount + 1;
        setTestCorrectCount(newCount);
        setBgColor('#2ecc71');
        playPositive(newCount);

        clearTimeout(testResultTimerRef.current);
        testResultTimerRef.current = setTimeout(() => {
          const nextIndex = testIndex + 1;
          setTestIndex(nextIndex);
          setBgColor('#2c3e50');
          generateTestTarget(testOrder, nextIndex);
        }, 1500);
      } else {
        setTestResult('wrong');
        setBgColor('#e74c3c');
        playEncouragement().then(() => {
          speak(`That was ${char}. Try to find ${testTarget}.`);
        });

        clearTimeout(testResultTimerRef.current);
        testResultTimerRef.current = setTimeout(() => {
          setTestResult(null);
          setBgColor('#2c3e50');
        }, 1500);
      }
      return;
    }

    // Read/Music mode handling
    setCurrentLetter(char);
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setBgColor(randomColor);

    if (mode === 'music' && char.match(/[A-Z]/)) {
      const freq = melodyMap[char] || notes.C4;
      playTone(freq);
    } else {
      speak(char);
    }
  }, [mode, testTarget, testResult, testCorrectCount, testIndex, testOrder, speak, playTone, playPositive, playEncouragement, generateTestTarget]);

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

  // Render test mode content
  const renderTestContent = () => {
    if (!testTarget) {
      // Start screen
      return (
        <div className="text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">Typing Test</h2>
          <p className="text-xl text-white/70 mb-8">Type the letter shown on screen!</p>
          <div className="flex justify-center mb-8">
            <select
              value={testOrder}
              onChange={(e) => setTestOrder(e.target.value)}
              className="bg-white/20 text-white rounded-lg px-4 py-2 text-sm cursor-pointer outline-none border border-white/20"
            >
              <option value="random" className="text-gray-800">Random</option>
              <option value="sequential" className="text-gray-800">A to Z</option>
            </select>
          </div>
          <button
            onClick={startTest}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold text-xl transition-colors"
          >
            <Play size={28} />
            Start Test
          </button>
          <p className="text-white/40 text-sm mt-4">Works best with a physical keyboard</p>
        </div>
      );
    }

    // Active test
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-2xl text-white/60">Type this letter:</p>
        <div className="text-white font-bold select-none" style={{
          fontSize: 'min(25vw, 40vh)',
          textShadow: '4px 4px 10px rgba(0,0,0,0.3)',
          fontFamily: 'Arial, sans-serif'
        }}>
          {testTarget}
        </div>
        {testResult === 'correct' && (
          <div className="text-4xl md:text-6xl">🎉</div>
        )}
        {testResult === 'wrong' && (
          <div className="text-2xl text-white/80 font-medium">Try again!</div>
        )}
        <div className="text-white/50 text-lg">Score: {testCorrectCount}</div>
      </div>
    );
  };

  return (
    <div
      className="h-full flex flex-col items-center justify-center transition-colors duration-300 relative overflow-hidden"
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

      {/* Mode selector */}
      <div className="absolute top-4 right-4 flex bg-white/15 p-1 rounded-full">
        <button
          onClick={() => setMode('read')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            mode === 'read' ? 'bg-white/25 text-white' : 'text-white/50 hover:text-white/80'
          }`}
        >
          <Volume2 size={16} />
          <span className="hidden md:inline">Read</span>
        </button>
        <button
          onClick={() => { initAudio(); setMode('music'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            mode === 'music' ? 'bg-white/25 text-white' : 'text-white/50 hover:text-white/80'
          }`}
        >
          <Music size={16} />
          <span className="hidden md:inline">Music</span>
        </button>
        <button
          onClick={() => setMode('test')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            mode === 'test' ? 'bg-white/25 text-white' : 'text-white/50 hover:text-white/80'
          }`}
        >
          <Gamepad2 size={16} />
          <span className="hidden md:inline">Test</span>
        </button>
      </div>

      {/* Main content */}
      {mode === 'test' ? (
        renderTestContent()
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};

export default TypingMode;
