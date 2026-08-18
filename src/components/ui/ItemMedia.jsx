import { useEffect, useRef } from 'react';

// Renders an item's picture, or a silent looping clip when the item has a
// `video` instead (e.g. the actions lesson). Drop-in replacement for the
// <img> tags in the lesson views — same className contract.
// `playing: false` holds the clip on its first frame (opposites pairs:
// only the spotlighted side animates — both moving at once splits the
// child's attention); flipping back to true replays from the start so the
// clip's little story lands whole.
const ItemMedia = ({ item, alt, className, playing = true }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    if (playing) {
      // play() can reject on a not-yet-loaded source; the autoPlay
      // attribute covers that first load
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing, item.video]);

  return item.video ? (
    <video
      ref={videoRef}
      src={item.video}
      className={className}
      autoPlay={playing}
      loop
      muted
      playsInline
      aria-label={alt}
    />
  ) : (
    <img src={item.image} alt={alt} className={className} />
  );
};

export default ItemMedia;
