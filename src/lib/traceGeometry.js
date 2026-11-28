import TRACE_GLYPHS from '../data/traceStrokes';

// Turns the stroke definitions in data/traceStrokes.js into evenly spaced
// points a finger can be checked against, and lays several characters out
// side by side ("Aa", "12").

const STEP = 1.5; // spacing of the sampled points, in glyph units
const DOT_GAP = 12; // spacing of the guide dots along a stroke
const GLYPH_GAP = 16;
const PAD = 22; // room around the glyphs for the fat stroke and start dots

const rad = (deg) => (deg * Math.PI) / 180;

// Expand one stroke's segments into a dense raw polyline
const rawPolyline = (segments) => {
  const pts = [];
  const push = (x, y) => pts.push({ x, y });
  segments.forEach((seg) => {
    if (Array.isArray(seg)) {
      push(seg[0], seg[1]);
    } else if (seg.arc) {
      const [cx, cy, rx, ry, a0, a1] = seg.arc;
      const steps = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 4));
      for (let i = 0; i <= steps; i++) {
        const a = rad(a0 + ((a1 - a0) * i) / steps);
        push(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
      }
    } else if (seg.q) {
      const [cx, cy, x, y] = seg.q;
      const from = pts[pts.length - 1];
      for (let i = 1; i <= 16; i++) {
        const t = i / 16;
        const u = 1 - t;
        push(
          u * u * from.x + 2 * u * t * cx + t * t * x,
          u * u * from.y + 2 * u * t * cy + t * t * y
        );
      }
    }
  });
  return pts;
};

// Walk the raw polyline and drop a point every STEP units
const resample = (raw) => {
  const out = [raw[0]];
  let carry = 0;
  for (let i = 1; i < raw.length; i++) {
    const a = raw[i - 1];
    const b = raw[i];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (segLen === 0) continue;
    let d = STEP - carry;
    while (d <= segLen) {
      const t = d / segLen;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      d += STEP;
    }
    carry = segLen - (d - STEP);
  }
  const last = raw[raw.length - 1];
  const tail = out[out.length - 1];
  if (Math.hypot(last.x - tail.x, last.y - tail.y) > 0.01) out.push(last);
  return out;
};

const buildStroke = (segments, dx) => {
  const points = resample(rawPolyline(segments)).map((p) => ({ x: p.x + dx, y: p.y }));
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(
      cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    );
  }
  const length = cum[cum.length - 1];
  // Guide dots, spread evenly so the last one lands exactly on the end
  const dots = [];
  const count = Math.round(length / DOT_GAP);
  for (let k = 1; k <= count; k++) {
    const target = (length * k) / count;
    let i = 0;
    while (i < cum.length - 1 && cum[i] < target) i++;
    dots.push(i);
  }
  return { points, cum, length, dots, isDot: length < 3 };
};

/**
 * Strokes for a display string, in writing order, plus the viewBox that
 * frames them. Characters without stroke data are skipped; `strokes` is
 * empty when none of them can be traced.
 */
export const buildTrace = (text) => {
  const strokes = [];
  let x = 0;
  let maxY = 100;
  [...String(text)].forEach((ch) => {
    const glyph = TRACE_GLYPHS[ch];
    if (!glyph) return;
    if (x > 0) x += GLYPH_GAP;
    glyph.strokes.forEach((segments) => {
      const stroke = buildStroke(segments, x);
      stroke.points.forEach((p) => {
        if (p.y > maxY) maxY = p.y;
      });
      strokes.push(stroke);
    });
    x += glyph.w;
  });
  // Square frame, glyphs centred — the card they sit in is square too
  const side = Math.max(x, maxY) + PAD * 2;
  const viewBox = [-(side - x) / 2, -(side - maxY) / 2, side, side];
  return { strokes, viewBox };
};

export const pointsAttr = (points, from = 0, to = points.length - 1) => {
  let out = '';
  for (let i = from; i <= to; i++) {
    out += `${points[i].x.toFixed(1)},${points[i].y.toFixed(1)} `;
  }
  return out;
};
