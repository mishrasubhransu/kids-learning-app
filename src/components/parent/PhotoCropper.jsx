import { useEffect, useRef, useState } from 'react';
import { ZoomIn } from 'lucide-react';

// Square crop frame for family photos: drag to move, pinch/wheel/slider to
// zoom, then the framed square is exported at a fixed resolution — so every
// upload is a face-filling, exactly-sized JPEG no matter what the camera
// produced. Pure pointer-events, no cropper library.
//
// View state: `scale` is CSS px per image px; (x, y) is the image's top-left
// in viewport coords. The image must always cover the viewport, so scale is
// clamped to [cover, cover * MAX_ZOOM] and (x, y) to keep edges outside.

const VP = 288; // viewport CSS px — matches w-72 below
const MAX_ZOOM = 5;

const initialView = (img) => {
  const scale = VP / Math.min(img.naturalWidth, img.naturalHeight);
  return {
    scale,
    x: (VP - img.naturalWidth * scale) / 2,
    y: (VP - img.naturalHeight * scale) / 2,
  };
};

const clampView = (v, img) => {
  const w = img.naturalWidth * v.scale;
  const h = img.naturalHeight * v.scale;
  return {
    scale: v.scale,
    x: Math.min(0, Math.max(VP - w, v.x)),
    y: Math.min(0, Math.max(VP - h, v.y)),
  };
};

// Zoom by `factor` keeping the viewport point (cx, cy) fixed on the image
const zoomView = (v, img, cx, cy, factor) => {
  const minScale = VP / Math.min(img.naturalWidth, img.naturalHeight);
  const scale = Math.min(minScale * MAX_ZOOM, Math.max(minScale, v.scale * factor));
  const k = scale / v.scale;
  return clampView(
    { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k },
    img
  );
};

const PhotoCropper = ({ source, onDone, onCancel, outputSize = 900 }) => {
  const [img, setImg] = useState(null);
  const [view, setView] = useState(null); // null until first interaction
  const [failed, setFailed] = useState(false);
  const viewportRef = useRef(null);
  const pointersRef = useRef(new Map()); // pointerId -> {x, y}

  // The URL stays alive while mounted — the viewport <img> below re-requests
  // it, so revoking at decode time would break the render
  useEffect(() => {
    const url = URL.createObjectURL(source);
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => setFailed(true);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [source]);

  const v = view ?? (img ? initialView(img) : null);

  // Wheel needs preventDefault, which React's synthetic handler can't
  // guarantee — attach non-passive on the node
  useEffect(() => {
    const node = viewportRef.current;
    if (!node || !img) return;
    const onWheel = (e) => {
      e.preventDefault();
      const rect = node.getBoundingClientRect();
      setView((prev) =>
        zoomView(
          prev ?? initialView(img),
          img,
          e.clientX - rect.left,
          e.clientY - rect.top,
          e.deltaY < 0 ? 1.12 : 1 / 1.12
        )
      );
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [img]);

  const localPoint = (e) => {
    const rect = viewportRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e) => {
    viewportRef.current.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, localPoint(e));
  };

  const onPointerMove = (e) => {
    const pointers = pointersRef.current;
    if (!pointers.has(e.pointerId) || !img || !v) return;
    const prev = pointers.get(e.pointerId);
    const next = localPoint(e);
    pointers.set(e.pointerId, next);

    if (pointers.size === 1) {
      setView(
        clampView({ ...v, x: v.x + next.x - prev.x, y: v.y + next.y - prev.y }, img)
      );
    } else if (pointers.size === 2) {
      // Pinch: zoom around the midpoint by the change in finger distance
      const [a, b] = [...pointers.values()];
      const other = a === next ? b : a;
      const distNow = Math.hypot(next.x - other.x, next.y - other.y);
      const distBefore = Math.hypot(prev.x - other.x, prev.y - other.y);
      if (distBefore > 0) {
        const mid = { x: (next.x + other.x) / 2, y: (next.y + other.y) / 2 };
        setView(zoomView(v, img, mid.x, mid.y, distNow / distBefore));
      }
    }
  };

  const onPointerEnd = (e) => {
    pointersRef.current.delete(e.pointerId);
  };

  const save = () => {
    if (!img || !v) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      img,
      -v.x / v.scale,
      -v.y / v.scale,
      VP / v.scale,
      VP / v.scale,
      0,
      0,
      outputSize,
      outputSize
    );
    canvas.toBlob(
      (blob) => (blob ? onDone(blob) : onCancel()),
      'image/jpeg',
      0.85
    );
  };

  const minScale = img ? VP / Math.min(img.naturalWidth, img.naturalHeight) : 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-4 flex flex-col gap-3 shadow-2xl">
        <div className="font-semibold text-gray-800">Frame the photo</div>

        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className="relative w-72 h-72 overflow-hidden rounded-xl bg-gray-900 touch-none cursor-move select-none"
        >
          {failed && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80 p-6 text-center">
              Couldn&apos;t read that photo — try a JPG or PNG.
            </div>
          )}
          {img && v && (
            <img
              src={img.src}
              alt=""
              draggable={false}
              className="absolute top-0 left-0 max-w-none origin-top-left pointer-events-none"
              style={{
                width: img.naturalWidth * v.scale,
                height: img.naturalHeight * v.scale,
                transform: `translate(${v.x}px, ${v.y}px)`,
              }}
            />
          )}
          {/* Hint of the round frame faces show in — purely decorative */}
          <div
            className="absolute inset-3 rounded-full border-2 border-white/50 pointer-events-none"
            aria-hidden="true"
          />
        </div>

        <label className="flex items-center gap-2 text-gray-500">
          <ZoomIn size={18} aria-hidden="true" />
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={v ? v.scale / minScale : 1}
            disabled={!img}
            onChange={(e) =>
              img &&
              setView((prev) =>
                zoomView(
                  prev ?? initialView(img),
                  img,
                  VP / 2,
                  VP / 2,
                  (minScale * Number(e.target.value)) /
                    (prev ?? initialView(img)).scale
                )
              )
            }
            aria-label="Zoom"
            className="flex-1 accent-indigo-600"
          />
        </label>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!img}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            Use photo
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoCropper;
