import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Volume2, Eraser } from 'lucide-react';
import useRecordedAudio from '../../hooks/useRecordedAudio';
import { recordingCategoryFor } from '../../lib/recordings';
import useAudioFeedback from '../../hooks/useAudioFeedback';
import ownedByFocusedControl from '../../utils/ownedByFocusedControl';

const brushColors = [
  '#e74c3c', '#3498db', '#2ecc71', '#f1c40f',
  '#9b59b6', '#e67e22', '#1abc9c', '#ff0066',
];

const TracingMode = ({ items, category }) => {
  // Two stacked canvases: the guide underlay and the child's strokes.
  // Keeping strokes separate lets a resize restore them without also
  // duplicating the old guide at the wrong scale.
  const canvasRef = useRef(null);
  const guideCanvasRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const brushColor = brushColors[currentIndex % brushColors.length];
  const isDrawing = useRef(false);
  const lastPos = useRef(null);
  // Parent-recorded voice when a recording exists, browser TTS otherwise —
  // same speech path as the sibling lesson modes (ScrollView etc.)
  const { speakItem } = useRecordedAudio(recordingCategoryFor(category));
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

  // Setup both canvases with retina support (assigning width also clears)
  const setupCanvas = useCallback(() => {
    const dpr = window.devicePixelRatio || 1;
    [guideCanvasRef.current, canvasRef.current].forEach((canvas) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 14;
    });
  }, []);

  // Draw guide character
  const drawGuide = useCallback(() => {
    const canvas = guideCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

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
  }, [currentItem]);

  useEffect(() => {
    setupCanvas();
    drawGuide();
    speakItem(currentItem.name);
  }, [currentIndex, setupCanvas, drawGuide, speakItem, currentItem]);

  // Resize handler — tablets fire this on rotation, so the child's
  // strokes are snapshotted and drawn back scaled instead of being lost
  useEffect(() => {
    let timer;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const snapshot = document.createElement('canvas');
        snapshot.width = canvas.width;
        snapshot.height = canvas.height;
        const hasStrokes = snapshot.width > 0 && snapshot.height > 0;
        if (hasStrokes) {
          snapshot.getContext('2d').drawImage(canvas, 0, 0);
        }
        setupCanvas();
        drawGuide();
        if (hasStrokes) {
          const rect = canvas.getBoundingClientRect();
          canvas
            .getContext('2d')
            .drawImage(
              snapshot,
              0, 0, snapshot.width, snapshot.height,
              0, 0, rect.width, rect.height
            );
        }
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
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

  // Clear only the strokes — the guide underlay stays put
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    hasChecked.current = false;
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
      if (e.repeat || ownedByFocusedControl(e)) return;
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === ' ') {
        e.preventDefault();
        speakItem(currentItem.name);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, items.length, speakItem, currentItem]);

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
          onClick={() => speakItem(currentItem.name)}
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

      {/* Canvas: guide underlay + transparent stroke layer on top */}
      <div className="relative w-full max-w-lg aspect-square">
        <canvas
          ref={guideCanvasRef}
          className="absolute inset-0 w-full h-full bg-white rounded-2xl shadow-lg"
          aria-hidden="true"
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded-2xl cursor-crosshair"
          style={{ touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>

      {/* Navigation arrows: below the canvas on narrow screens — floating
          at mid-height they'd overlap the canvas edges, so a child tracing
          near the border would trigger navigation and lose the drawing */}
      <div className="mt-4 w-full max-w-lg flex justify-between px-2 pointer-events-none md:absolute md:inset-x-0 md:top-1/2 md:-translate-y-1/2 md:mt-0 md:max-w-none md:px-8">
        <button
          onClick={goPrev}
          className="pointer-events-auto p-4 rounded-full opacity-70 md:opacity-40 hover:opacity-100 hover:bg-gray-200 motion-safe:active:scale-95 active:opacity-100 transition-all"
          aria-label="Previous"
        >
          <ChevronLeft size={48} className="text-gray-500" />
        </button>
        <button
          onClick={goNext}
          className="pointer-events-auto p-4 rounded-full opacity-70 md:opacity-40 hover:opacity-100 hover:bg-gray-200 motion-safe:active:scale-95 active:opacity-100 transition-all"
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
