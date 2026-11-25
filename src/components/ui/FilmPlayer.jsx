import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';

// A narrated explainer film (Science). Unlike ItemMedia's silent looping
// clips, a film plays ONCE, with sound, and only when asked: the poster
// shows until the lesson starts it. The lesson owns `state`
// ('idle' | 'playing' | 'paused') so the arrows, a tap and autoplay all
// drive the same player; `watched` swaps the play badge for a replay one.
//
// A film is two files: one silent picture (`src`) and the narration track
// of the child's language (`audioSrc`). The picture is the clock — the
// narration starts with it, stops with it, and is nudged back whenever the
// two drift apart. It is a voice-over (nobody's lips move), so a nudge of a
// few tenths of a second is inaudible.
//
// Nothing downloads until the first play (preload="none") — a film is
// several MB, and a child may flip past it.
const MAX_DRIFT = 0.3;

const FilmPlayer = ({ src, audioSrc, poster, alt, state, watched, onEnded, onBlocked, className }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [progress, setProgress] = useState(0);
  // The poster stays up until picture AND narration are really running, so
  // a slow connection shows the poster, not a black box
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    const audio = audioRef.current;
    if (!video || !audio) return undefined;
    if (state !== 'playing') {
      video.pause();
      audio.pause();
      if (state === 'idle') {
        video.currentTime = 0;
        audio.currentTime = 0;
      }
      return undefined;
    }
    let cancelled = false;
    // Both play() calls go out at once, still inside the tap that asked for
    // them (sound needs that). On a first play whichever file arrives first
    // would run ahead, so the narration starts muted and, once both are
    // moving, both jump back to the top together.
    const fresh = video.currentTime === 0;
    audio.muted = fresh;
    if (!fresh) audio.currentTime = video.currentTime;
    Promise.all([video.play(), audio.play()])
      .then(() => {
        if (cancelled) return;
        if (fresh) {
          video.currentTime = 0;
          audio.currentTime = 0;
          audio.muted = false;
        }
        setRolling(true);
      })
      .catch(() => {
        // Paused or left mid-load is not a refusal; a blocked or missing
        // track is — hand the decision back to the lesson
        if (!cancelled) onBlocked?.();
      });
    return () => {
      cancelled = true;
    };
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const keepInStep = (e) => {
    const video = e.currentTarget;
    const audio = audioRef.current;
    setProgress(video.duration ? video.currentTime / video.duration : 0);
    if (audio && !audio.muted && Math.abs(audio.currentTime - video.currentTime) > MAX_DRIFT) {
      audio.currentTime = video.currentTime;
    }
  };

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
        muted
        playsInline
        onEnded={onEnded}
        onTimeUpdate={keepInStep}
        // The picture stalled on the network mid-film: the voice waits for
        // it. Not during the first load — pausing there would cancel the
        // narration's own start, which the effect above is waiting on.
        onWaiting={() => {
          if (rolling) audioRef.current?.pause();
        }}
        onPlaying={() => {
          if (rolling && state === 'playing') audioRef.current?.play().catch(() => {});
        }}
        aria-label={alt}
      />
      <audio ref={audioRef} src={audioSrc} preload="none" />
      {(state === 'idle' || !rolling) && (
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
