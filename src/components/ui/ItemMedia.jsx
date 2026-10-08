import { useEffect, useRef, useState } from 'react';

// Renders an item's picture, or a silent looping clip when the item has a
// `video` instead (e.g. the actions lesson). Drop-in replacement for the
// <img> tags in the lesson views — same className contract.
// `playing: false` holds the clip on its first frame (opposites pairs:
// only the spotlighted side animates — both moving at once splits the
// child's attention); flipping back to true replays from the start so the
// clip's little story lands whole.
// An item with a `playlist` plays its clips in order and loops the whole
// set (actions' paying: cash, then card, then coins).
const ItemMedia = ({ item, alt, className, playing = true }) => {
  const videoRef = useRef(null);
  const clips = item.playlist ?? (item.video ? [item.video] : null);
  const listKey = clips?.join('|');
  // The clip index belongs to one list — a new item starts at its first clip
  const [clipState, setClipState] = useState({ listKey, index: 0 });
  const clipIndex = clipState.listKey === listKey ? clipState.index : 0;
  const src = clips?.[clipIndex];
  const advance = () =>
    setClipState({ listKey, index: (clipIndex + 1) % clips.length });

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
  }, [playing, src]);

  return src ? (
    <video
      ref={videoRef}
      src={src}
      className={className}
      autoPlay={playing}
      loop={clips.length === 1}
      onEnded={clips.length > 1 ? advance : undefined}
      muted
      playsInline
      aria-label={alt}
    />
  ) : (
    <img src={item.image} alt={alt} className={className} />
  );
};

export default ItemMedia;
