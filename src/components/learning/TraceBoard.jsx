import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildTrace, pointsAttr } from '../../lib/traceGeometry';

// One character (or pair, "Aa" / "12") traced stroke by stroke.
//
// The child never draws freehand: each stroke is a grey road with a green
// start dot, an arrow and guide dots. Paint follows the finger only while it
// travels ALONG the road, in order, from the green dot — so the board always
// knows exactly how much has really been traced, and scribbling paints
// nothing. Lifting the finger keeps the progress; the green dot waits where
// the paint stopped. When a stroke is finished the next one's start lights up.
//
// All distances are in glyph units (a capital is 100 tall), so the tolerance
// scales with the letter on screen.
const ROAD = 15; // stroke thickness
const GRAB = 20; // finger lands this close to the green dot → it takes hold
const REGRAB = 11; // finger slides back onto the dot after wandering off
const FAR = 45; // a finger arriving from further away than this must pause on the dot
const DWELL_MS = 220; // …for this long — a scribble sweeping past never does
const FOLLOW = 15; // how far off the line the finger may be and still paint
const LOSE = 26; // further than this from the paint head → hold is lost
const KEEP = 9; // paint from a hold shorter than this is wiped if the finger wanders off
const LOOKAHEAD = 16; // paint can only advance this far per check — no skipping
const DEMO_SPEED = 75; // units per second for the "watch me" dot
const DEMO_DELAY = 700;

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const TraceBoard = ({ text, color, soundOn = true, onComplete }) => {
  const { strokes, viewBox } = useMemo(() => buildTrace(text), [text]);
  // Progress: strokes before `si` are finished, `head` is the last painted
  // point of stroke `si`. Mirrored in a ref for the pointer handlers.
  const [progress, setProgress] = useState({ si: 0, head: 0 });
  const progressRef = useRef(progress);
  const [touching, setTouching] = useState(false);
  const holdRef = useRef(false);
  const holdStartRef = useRef(null); // progress when the current hold began
  const farRef = useRef(false); // finger came from far away, not from a slip
  const dwellRef = useRef(null);
  const pointerRef = useRef(null);
  const lastPosRef = useRef(null);
  const svgRef = useRef(null);
  const demoRef = useRef(null);
  const audioRef = useRef(null);

  const done = progress.si >= strokes.length;
  const stroke = done ? null : strokes[progress.si];

  // Rising "pip" as each guide dot lights, a brighter one when a stroke ends
  const pip = useCallback(
    (freq, long = false) => {
      if (!soundOn) return;
      try {
        if (!audioRef.current) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return;
          audioRef.current = new Ctx();
        }
        const ctx = audioRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const now = ctx.currentTime;
        const length = long ? 0.3 : 0.09;
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + length);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + length);
      } catch {
        // No audio — the tracing still works
      }
    },
    [soundOn]
  );
  useEffect(
    () => () => {
      clearTimeout(dwellRef.current);
      audioRef.current?.close?.();
    },
    []
  );

  const commit = useCallback(
    (next) => {
      const prev = progressRef.current;
      progressRef.current = next;
      setProgress(next);
      if (next.si > prev.si) {
        pip(880, true);
        if (next.si >= strokes.length) onComplete?.();
      } else {
        const s = strokes[next.si];
        const lit = (h) => s.dots.filter((d) => d <= h).length;
        const now = lit(next.head);
        if (now > lit(prev.head)) pip(440 + now * 40);
      }
    },
    [strokes, pip, onComplete]
  );

  // Finger position → glyph units
  const toUnits = (e) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };

  const takeHold = () => {
    holdRef.current = true;
    holdStartRef.current = progressRef.current;
    setTouching(true);
  };

  // Move the paint head toward one finger position. Only points just ahead
  // of the head are considered, so the finger has to travel the stroke in
  // order — crossing a later part of the letter does nothing.
  // `move` is the finger's step that led to p; paint only advances when
  // that step points the way the stroke goes.
  const advance = (p, move) => {
    let { si, head } = progressRef.current;
    const s = strokes[si];
    if (!s) return;
    const headPt = s.points[head];
    const away = dist(p, headPt);

    if (!holdRef.current) {
      if (away > REGRAB) {
        clearTimeout(dwellRef.current);
        dwellRef.current = null;
        if (away > FAR) farRef.current = true;
        return;
      }
      if (farRef.current) {
        // Sliding in from across the card: only a finger that settles on
        // the dot takes hold. Fast scribbles cross it in a few milliseconds.
        if (!dwellRef.current) {
          dwellRef.current = setTimeout(() => {
            dwellRef.current = null;
            if (pointerRef.current !== null && !holdRef.current) takeHold();
          }, DWELL_MS);
        }
        return;
      }
      takeHold();
    } else if (away > LOSE) {
      // Wandered off. A hold that barely painted anything was a scribble
      // crossing the line by chance, not tracing — take that paint back.
      const start = holdStartRef.current;
      farRef.current = false;
      holdRef.current = false;
      setTouching(false);
      if (start && start.si === si && s.cum[head] - s.cum[start.head] < KEEP && head !== start.head) {
        commit(start);
      }
      return;
    }

    if (s.isDot) {
      commit({ si: si + 1, head: 0 });
      return;
    }

    let best = head;
    let bestDist = Infinity;
    for (let j = head; j < s.points.length && s.cum[j] - s.cum[head] <= LOOKAHEAD; j++) {
      const d = dist(p, s.points[j]);
      if (d < bestDist) {
        bestDist = d;
        best = j;
      }
    }
    if (bestDist > FOLLOW || best === head) return;
    if (!move) return;
    // Checked against the stroke's direction where the finger is heading
    // AND where the paint is — at a sharp corner (V, W, Z) only one agrees
    const cos = (from, to) =>
      (move.x * (to.x - from.x) + move.y * (to.y - from.y)) /
      ((Math.hypot(move.x, move.y) || 1) * (dist(from, to) || 1));
    const along = Math.max(
      cos(headPt, s.points[Math.min(head + 2, s.points.length - 1)]),
      cos(s.points[best - 1], s.points[best])
    );
    if (along < 0.35) return;
    head = best;
    // Close enough to the end counts — a toddler lifts a little early
    if (s.length - s.cum[head] <= 3) commit({ si: si + 1, head: 0 });
    else commit({ si, head });
  };

  const release = () => {
    clearTimeout(dwellRef.current);
    dwellRef.current = null;
    pointerRef.current = null;
    lastPosRef.current = null;
    holdRef.current = false;
    setTouching(false);
  };

  const onPointerDown = (e) => {
    if (done || pointerRef.current !== null) return; // one finger, palm ignored
    const p = toUnits(e);
    if (!p) return;
    pointerRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Capture is a nicety (keeps the stroke alive past the card edge)
    }
    lastPosRef.current = p;
    const s = strokes[progressRef.current.si];
    if (dist(p, s.points[progressRef.current.head]) <= GRAB) {
      farRef.current = false;
      takeHold();
      advance(p, null);
    } else {
      farRef.current = true;
    }
  };

  const onPointerMove = (e) => {
    if (e.pointerId !== pointerRef.current) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    (events.length ? events : [e]).forEach((ev) => {
      const p = toUnits(ev);
      const from = lastPosRef.current;
      if (!p || !from) return;
      // A fast swipe arrives as far-apart points; walk the gap in small
      // steps so quick-but-correct tracing isn't mistaken for a jump
      const steps = Math.max(1, Math.ceil(dist(p, from) / 3));
      for (let i = 1; i <= steps; i++) {
        if (progressRef.current.si >= strokes.length) break;
        advance(
          {
            x: from.x + ((p.x - from.x) * i) / steps,
            y: from.y + ((p.y - from.y) * i) / steps,
          },
          { x: p.x - from.x, y: p.y - from.y }
        );
      }
      lastPosRef.current = p;
    });
  };

  const onPointerUp = (e) => {
    if (e.pointerId === pointerRef.current) release();
  };

  // "Watch me": a dot glides along what is left of the stroke whenever the
  // finger isn't on it, showing where to start and which way to go.
  useEffect(() => {
    const el = demoRef.current;
    if (!el) return;
    el.setAttribute('opacity', '0');
    if (done || touching || !stroke || stroke.isDot) return;
    let raf;
    const startAt = performance.now() + DEMO_DELAY;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const head = progressRef.current.head;
      const remaining = stroke.length - stroke.cum[head];
      if (now < startAt || remaining <= 0) return;
      const loop = remaining + DEMO_SPEED * 0.8; // pause at the end
      const travelled = Math.min((((now - startAt) / 1000) * DEMO_SPEED) % loop, remaining);
      const target = stroke.cum[head] + travelled;
      let i = head;
      while (i < stroke.points.length - 1 && stroke.cum[i] < target) i++;
      el.setAttribute('cx', stroke.points[i].x);
      el.setAttribute('cy', stroke.points[i].y);
      el.setAttribute('opacity', travelled >= remaining ? '0' : '0.9');
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stroke, touching, done]);

  if (!strokes.length) return null;

  const headPt = stroke?.points[progress.head];
  // Direction arrow, a little ahead of the green dot
  let arrow = null;
  if (stroke && !stroke.isDot) {
    let i = progress.head;
    while (i < stroke.points.length - 1 && stroke.cum[i] - stroke.cum[progress.head] < 14) i++;
    if (stroke.length - stroke.cum[i] > 4) {
      const a = stroke.points[i - 1];
      const b = stroke.points[i];
      arrow = { ...b, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
    }
  }
  const nextStroke = strokes[progress.si + 1];
  const showNextStart =
    nextStroke && stroke && dist(nextStroke.points[0], stroke.points[0]) > 12;
  const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox.join(' ')}
      className={`absolute inset-0 w-full h-full select-none ${done ? 'opposites-pop' : ''}`}
      style={{ touchAction: 'none' }}
      role="img"
      aria-label={`Trace ${text}`}
      data-trace-stroke={progress.si}
      data-trace-done={done ? 'true' : 'false'}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* The whole character as a grey road */}
      {strokes.map((s, i) => (
        <polyline key={`road-${i}`} points={pointsAttr(s.points)} stroke="#e5e7eb" strokeWidth={ROAD} {...line} />
      ))}

      {/* Finished strokes, and the painted part of the current one */}
      {strokes.map((s, i) => {
        if (i > progress.si) return null;
        const to = i < progress.si ? s.points.length - 1 : progress.head;
        if (to === 0 && !(s.isDot && i < progress.si)) return null;
        return (
          <polyline key={`ink-${i}`} points={pointsAttr(s.points, 0, to)} stroke={color} strokeWidth={ROAD} {...line} />
        );
      })}

      {/* Guide dots on the current stroke — grey ahead, lit once passed */}
      {stroke?.dots.map((d) => {
        const lit = d <= progress.head;
        return (
          <circle
            key={`dot-${d}`}
            cx={stroke.points[d].x}
            cy={stroke.points[d].y}
            r={lit ? 2.8 : 2.2}
            fill={lit ? '#ffffff' : '#9ca3af'}
          />
        );
      })}

      {arrow && (
        <path
          d="M-3,-4.5 L3,0 L-3,4.5"
          transform={`translate(${arrow.x} ${arrow.y}) rotate(${arrow.angle})`}
          stroke="#4b5563"
          strokeWidth={2.4}
          {...line}
        />
      )}

      {/* Where the stroke after this one will start */}
      {showNextStart && (
        <g opacity={0.75}>
          <circle cx={nextStroke.points[0].x} cy={nextStroke.points[0].y} r={5.5} fill="#9ca3af" />
          <text
            x={nextStroke.points[0].x}
            y={nextStroke.points[0].y}
            dy="0.36em"
            textAnchor="middle"
            fontSize={7.5}
            fontWeight="700"
            fill="#ffffff"
          >
            {progress.si + 2}
          </text>
        </g>
      )}

      <circle ref={demoRef} r={5} fill={color} stroke="#ffffff" strokeWidth={2} opacity={0} pointerEvents="none" />

      {/* The green dot: start here / carry on from here */}
      {headPt && (
        <g pointerEvents="none">
          {!touching && (
            <circle
              cx={headPt.x}
              cy={headPt.y}
              r={8.5}
              fill="#22c55e"
              className="animate-ping"
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          )}
          <circle cx={headPt.x} cy={headPt.y} r={8.5} fill="#22c55e" stroke="#ffffff" strokeWidth={2.5} />
          {progress.head === 0 && strokes.length > 1 && (
            <text
              x={headPt.x}
              y={headPt.y}
              dy="0.36em"
              textAnchor="middle"
              fontSize={10}
              fontWeight="700"
              fill="#ffffff"
            >
              {progress.si + 1}
            </text>
          )}
        </g>
      )}
    </svg>
  );
};

export default TraceBoard;
