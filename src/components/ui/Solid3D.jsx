import { useEffect, useRef, useState } from 'react';

// React faces of lib/solids3d.js (three.js). Both load it lazily, so three
// only downloads once a child actually opens the 3D shapes.
const loadSolids = () => import('../../lib/solids3d.js');

// A still picture of a solid — tiles, quiz cards, recap. Painted once by a
// shared offscreen renderer and cached, so a grid of them costs no WebGL
// contexts.
export const SolidSnapshot = ({ kind, color, alt = '' }) => {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let live = true;
    loadSolids()
      .then((m) => live && setSrc(m.snapshot(kind, color)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [kind, color]);

  return src ? (
    <img src={src} alt={alt} draggable={false} className="w-full h-full object-contain" />
  ) : (
    <div className="w-full h-full" aria-hidden="true" />
  );
};

// The live shape: drag to turn it about its centroid. A press that never
// moved is a tap and falls through to the parent's click (say the name); a
// drag swallows that click so turning the shape doesn't also speak.
export const SolidViewer = ({ kind, color, label }) => {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const latest = useRef({ kind, color });
  const [failed, setFailed] = useState(false);

  // Next item: same canvas and GL context, new solid. Declared before the
  // mount effect so a viewer that finishes loading late still starts on the
  // item now showing.
  useEffect(() => {
    latest.current = { kind, color };
    viewerRef.current?.setShape(kind, color);
  }, [kind, color]);

  useEffect(() => {
    let live = true;
    loadSolids()
      .then((m) => {
        if (!live || !canvasRef.current) return;
        viewerRef.current = m.createViewer(canvasRef.current, {
          ...latest.current,
          reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
        });
      })
      // No WebGL (or the chunk failed to load): fall back to nothing fancy
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      viewerRef.current?.dispose();
      viewerRef.current = null;
    };
  }, []);

  if (failed) return <div className="w-full h-full" aria-hidden="true" />;

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      onClickCapture={(e) => {
        if (viewerRef.current?.wasDragged()) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
      // touch-action: none — the drag turns the shape, never scrolls the page
      className="w-full h-full block cursor-grab active:cursor-grabbing touch-none select-none"
    />
  );
};
