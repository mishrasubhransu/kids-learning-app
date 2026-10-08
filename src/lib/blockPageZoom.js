// Page zoom is off everywhere: a toddler's stray two-finger touch shouldn't
// leave the app stuck zoomed in. CSS (touch-action: pan-x pan-y in
// index.css) covers Chrome/Android; iOS Safari ignores both that and the
// viewport's user-scalable=no for pinch, so its gesture events and
// multi-touch moves are cancelled here, and desktop trackpad pinch (which
// arrives as ctrl+wheel) likewise. The family PhotoCropper keeps its own
// pinch: it works from pointer events and its own wheel listener, which
// cancelling the page default doesn't touch.
export default function blockPageZoom() {
  const cancel = (e) => e.preventDefault();
  document.addEventListener('gesturestart', cancel, { passive: false });
  document.addEventListener('gesturechange', cancel, { passive: false });
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) e.preventDefault();
    },
    { passive: false }
  );
}
