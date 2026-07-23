// Warm the browser cache for upcoming lesson/game images so they appear
// the moment they're shown instead of loading while the narration plays.
export default function preloadImages(srcs) {
  srcs.filter(Boolean).forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}
