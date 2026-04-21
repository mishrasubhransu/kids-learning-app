import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Volume2, Eraser } from 'lucide-react';
import useSpeech from '../../hooks/useSpeech';
import useAudioFeedback from '../../hooks/useAudioFeedback';

const brushColors = [
  '#e74c3c', '#3498db', '#2ecc71', '#f1c40f',
  '#9b59b6', '#e67e22', '#1abc9c', '#ff0066',
];

const TracingMode = ({ items, category }) => {
  const canvasRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [brushColor, setBrushColor] = useState(brushColors[0]);
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  const { speak } = useSpeech();
  const { playPositive } = useAudioFeedback();
  const hasChecked = useRef(false);

  const currentItem = items[currentIndex];

  const getCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas;
  }, []);

  const getCtx = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, [getCanvas]);

  // Setup canvas with retina support
  const setupCanvas = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 14;
  }, [getCanvas]);

  // Draw guide character
  const drawGuide = useCallback(() => {
    const canvas = getCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Clear
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw guide character
    const displayText = currentItem.display || currentItem.name;
    const fontSize = Math.min(rect.width, rect.height) * 0.6;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.fillText(displayText, rect.width / 2, rect.height / 2);

    // Draw dashed outline for tracing guidance
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.strokeText(displayText, rect.width / 2, rect.height / 2);
    ctx.setLineDash([]);
    ctx.lineWidth = 14;

    hasChecked.current = false;
  }, [getCanvas, currentItem]);

  useEffect(() => {
    setupCanvas();
    drawGuide();
    const newColor = brushColors[currentIndex % brushColors.length];
    setBrushColor(newColor);
    speak(currentItem.name);
  }, [currentIndex, setupCanvas, drawGuide, speak, currentItem]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      setupCanvas();
      drawGuide();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas, drawGuide]);

  const getPos = (e) => {
    const canvas = getCanvas();
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    const ctx = getCtx();
    if (ctx && pos) {
      ctx.strokeStyle = brushColor;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const pos = getPos(e);
    const ctx = getCtx();
    if (ctx && pos && lastPos.current) {
      ctx.strokeStyle = brushColor;
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
    }
  };

  const endDraw = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPos.current = null;
    checkCompletion();
  };

  const checkCompletion = () => {
    if (hasChecked.current) return;
    const canvas = getCanvas();
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let drawnPixels = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 100) drawnPixels++;
    }
    const total = canvas.width * canvas.height;
    const ratio = drawnPixels / total;
    // Threshold: if user has drawn on at least 3% of the canvas
    if (ratio > 0.03) {
      hasChecked.current = true;
      playPositive(1);
    }
  };

  const handleClear = () => {
    setupCanvas();
    drawGuide();
  };

  const goNext = () => {
    setCurrentIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
  };

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === ' ') {
        e.preventDefault();
        speak(currentItem.name);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, items.length, speak, currentItem]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
      {/* Top controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={handleClear}
          className="p-3 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          aria-label="Clear"
        >
          <Eraser size={24} />
        </button>
        <button
          onClick={() => speak(currentItem.name)}
          className="p-3 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
          aria-label="Speak"
        >
          <Volume2 size={24} />
        </button>
      </div>

      {/* Label */}
      <div className="mb-4 text-center">
        <span className="text-2xl md:text-3xl font-bold text-gray-600">
          Trace: {currentItem.display || currentItem.name}
        </span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full max-w-lg aspect-square bg-white rounded-2xl shadow-lg cursor-crosshair"
        style={{ touchAction: 'none' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />

      {/* Navigation arrows */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 md:px-8 pointer-events-none">
        <button
          onClick={goPrev}
          className="pointer-events-auto p-4 rounded-full opacity-40 hover:opacity-100 hover:bg-gray-200 transition-all"
          aria-label="Previous"
        >
          <ChevronLeft size={48} className="text-gray-500" />
        </button>
        <button
          onClick={goNext}
          className="pointer-events-auto p-4 rounded-full opacity-40 hover:opacity-100 hover:bg-gray-200 transition-all"
          aria-label="Next"
        >
          <ChevronRight size={48} className="text-gray-500" />
        </button>
      </div>

      {/* Progress */}
      <div className="mt-4 text-gray-400 text-sm">
        {currentIndex + 1} / {items.length} — Use arrow keys to navigate
      </div>
    </div>
  );
};

export default TracingMode;
