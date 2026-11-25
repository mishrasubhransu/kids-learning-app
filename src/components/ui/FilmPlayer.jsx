import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';

// A narrated explainer film (Human Body). Unlike ItemMedia's silent looping
// clips, a film plays ONCE, with its own sound, and only when asked: the
// poster shows until the lesson starts it. The lesson owns `state`
// ('idle' | 'playing' | 'paused') so the arrows, a tap and autoplay all
// drive the same player; `watched` swaps the play badge for a replay one.
// Nothing downloads until the first play (preload="none") — a film is
// several MB, and a child may flip past it.
const FilmPlayer = ({ src, poster, alt, state, watched, onEnded, onBlocked, className }) => {
  const videoRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (state === 'playing') {
      // Sound-on play needs a user gesture somewhere on the page; if the
      // browser still refuses, hand the decision back to the lesson
      video.play().catch(() => onBlocked?.());
    } else {
      video.pause();
      if (state === 'idle') video.currentTime = 0;
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Replay only once it has run and is back on its poster; paused = play
  const replay = watched && state === 'idle';
  const Badge = replay ? RotateCcw : Play;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        preload="none"
        playsInline
        onEnded={onEnded}
        onTimeUpdate={(e) => {
          const { currentTime, duration } = e.currentTarget;
          setProgress(duration ? currentTime / duration : 0);
        }}
        aria-label={alt}
      />
      {state === 'idle' && (
        <img
          src={poster}
          alt={alt}
          className="absolute inset-0 w-full h-full object-contain bg-white"
        />
      )}
      {state !== 'playing' && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="rounded-full bg-black/45 text-white p-5 md:p-7 shadow-lg">
            <Badge className="w-10 h-10 md:w-14 md:h-14" fill={replay ? 'none' : 'currentColor'} />
          </span>
        </span>
      )}
      {state !== 'idle' && (
        <span className="absolute inset-x-0 bottom-0 h-1.5 bg-black/20">
          <span
            className="block h-full bg-white/90"
            style={{ width: `${progress * 100}%` }}
          />
        </span>
      )}
    </div>
  );
};

export default FilmPlayer;
