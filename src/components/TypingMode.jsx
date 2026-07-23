import { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, Music, Gamepad2, Play } from 'lucide-react';
import HomeButton from './ui/HomeButton';
import useSpeech from '../hooks/useSpeech';
import useAudioFeedback from '../hooks/useAudioFeedback';
import ownedByFocusedControl from '../utils/ownedByFocusedControl';

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

// On-screen keyboard for tablets/phones — letters first (the point of the
// lesson), digits after. flex-wrap re-flows the rows to the screen width
// while every key keeps a >=44px touch target.
const keyboardChars = [...allLetters, ...'0123456789'];

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
  const [testComplete, setTestComplete] = useState(false);
  const [testSeenLetters, setTestSeenLetters] = useState(() => new Set());
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
    setTestComplete(false);
    setTestSeenLetters(new Set());
    generateTestTarget(testOrder, 0);
  }, [testOrder, generateTestTarget]);

  // Reset test state when leaving test mode
  useEffect(() => {
    if (mode !== 'test') {
      setTestTarget(null);
      setTestResult(null);
      setTestCorrectCount(0);
      setTestIndex(0);
      setTestComplete(false);
      setTestSeenLetters(new Set());
      clearTimeout(testResultTimerRef.current);
    }
  }, [mode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimeout(testResultTimerRef.current);
  }, []);

  // Shared by physical keys and the on-screen keyboard; char is uppercase
  const handleChar = useCallback((char) => {
    // Test mode handling
    if (mode === 'test') {
      if (!testTarget || testResult !== null || testComplete) return;

      if (char === testTarget) {
        setTestResult('correct');
        const newCount = testCorrectCount + 1;
        setTestCorrectCount(newCount);
        setBgColor('#2ecc71');
        playPositive(newCount);

        clearTimeout(testResultTimerRef.current);
        testResultTimerRef.current = setTimeout(() => {
          const nextIndex = testIndex + 1;
          const nextSeen = new Set(testSeenLetters);
          nextSeen.add(testTarget);
          setTestSeenLetters(nextSeen);
          setTestIndex(nextIndex);
          setBgColor('#2c3e50');
          if (nextSeen.size >= allLetters.length) {
            setTestComplete(true);
            setTestTarget(null);
          } else {
            generateTestTarget(testOrder, nextIndex);
          }
        }, 1500);
      } else {
        setTestResult('wrong');
        setBgColor('#e74c3c');
        playEncouragement().then(() => {
          speak(`That was ${char}, try to find ${testTarget}.`);
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
  }, [mode, testTarget, testResult, testCorrectCount, testIndex, testOrder, testComplete, testSeenLetters, speak, playTone, playPositive, playEncouragement, generateTestTarget]);

  const handleKeyPress = useCallback((event) => {
    // Ignore key repeats (holding down)
    if (event.repeat || ownedByFocusedControl(event)) return;

    // Check if key is a letter (A-Z) or number (0-9)
    if (event.key.length !== 1 || !event.key.match(/[a-z0-9]/i)) return;

    handleChar(event.key.toUpperCase());
  }, [handleChar]);

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
    if (testComplete) {
      return (
        <div className="text-center">
          <div className="text-6xl md:text-8xl mb-6">🏆</div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-4">Test Complete!</h2>
          <p className="text-xl text-white/70 mb-8">
            You typed all {allLetters.length} letters. Great job!
          </p>
          <button
            onClick={startTest}
            className="inline-flex items-center gap-3 px-8 py-4 bg-white/20 hover:bg-white/30 text-white rounded-xl font-semibold text-xl transition-colors"
          >
            <Play size={28} />
            Start Again
          </button>
        </div>
      );
    }

    if (!testTarget) {
      // Start screen
      return (
        <div className="text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">Typing Test</h2>
          <p className="text-xl text-white/70 mb-8">Tap or type the letter shown on screen!</p>
          <div className="flex justify-center mb-8">
            <select
              value={testOrder}
              onChange={(e) => setTestOrder(e.target.value)}
              className="bg-white/20 text-white rounded-lg px-4 py-2 text-sm cursor-pointer border border-white/20 focus-visible:outline-white/70"
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
        </div>
      );
    }

    // Active test
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-2xl text-white/60">Tap or type this letter:</p>
        <div className="text-white font-bold select-none" style={{
          fontSize: 'min(20vw, 28vh)',
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
      className="h-full flex flex-col transition-colors duration-300 relative overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Home button */}
      <div className="absolute top-4 left-4">
        <HomeButton />
      </div>

      {/* Mode selector */}
      <div className="absolute top-4 right-4 flex bg-white/15 p-1 rounded-full">
        <button
          onClick={() => setMode('read')}
          aria-label="Read mode"
          aria-pressed={mode === 'read'}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-sm font-medium transition-all focus-visible:outline-white/70 ${
            mode === 'read' ? 'bg-white/25 text-white' : 'text-white/50 hover:text-white/80'
          }`}
        >
          <Volume2 size={18} />
          <span className="hidden md:inline">Read</span>
        </button>
        <button
          onClick={() => { initAudio(); setMode('music'); }}
          aria-label="Music mode"
          aria-pressed={mode === 'music'}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-sm font-medium transition-all focus-visible:outline-white/70 ${
            mode === 'music' ? 'bg-white/25 text-white' : 'text-white/50 hover:text-white/80'
          }`}
        >
          <Music size={18} />
          <span className="hidden md:inline">Music</span>
        </button>
        <button
          onClick={() => setMode('test')}
          aria-label="Test mode"
          aria-pressed={mode === 'test'}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-sm font-medium transition-all focus-visible:outline-white/70 ${
            mode === 'test' ? 'bg-white/25 text-white' : 'text-white/50 hover:text-white/80'
          }`}
        >
          <Gamepad2 size={18} />
          <span className="hidden md:inline">Test</span>
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 pt-20">
        {mode === 'test' ? (
          renderTestContent()
        ) : (
          <>
            {/* Letter display */}
            <div className="text-white font-bold select-none" style={{
              fontSize: 'min(22vw, 32vh)',
              textShadow: '4px 4px 10px rgba(0,0,0,0.3)',
              fontFamily: 'Arial, sans-serif'
            }}>
              {currentLetter || (mode === 'music' ? '♫' : 'Hi!')}
            </div>

            {/* Instructions */}
            <div className="text-white/50 text-base md:text-xl text-center px-4">
              {mode === 'music'
                ? 'Tap or type A-Z to play Twinkle Twinkle Little Star!'
                : currentLetter
                  ? 'Keep going! Each letter will be spoken.'
                  : 'Tap or type any letter or number!'
              }
            </div>
          </>
        )}
      </div>

      {/* On-screen keyboard — tablets have no physical keys */}
      <div className="w-full max-w-2xl lg:max-w-4xl mx-auto px-2 pb-3 md:pb-5 flex flex-wrap justify-center gap-1.5 md:gap-2">
        {keyboardChars.map((ch) => (
          <button
            key={ch}
            onClick={() => handleChar(ch)}
            className="w-11 h-11 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/40 active:scale-90 text-white text-2xl md:text-3xl font-bold transition-all focus-visible:outline-white/70"
          >
            {ch}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TypingMode;
