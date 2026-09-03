// A wooden crate seen from the front and a little above, with up to ten
// objects inside: five across the front row, five along the back. The
// crate is two SVG layers around an HTML cell grid — the interior and rims
// go UNDER the objects, the front boards go OVER them, so the front row
// sits inside the crate instead of on top of it and the back row peeks out
// behind. Every crate reserves all ten cells from the start (reserve, don't
// reflow — same rule as the counting ten-frames), so nothing shifts as
// objects arrive.
//
// `cells` is an array of up to ten states: 'solid' (object here), 'ghost'
// (it left — the faded trace the child counts against), 'empty'. Cells are
// reported through onCell(index, el) so the page can measure where a flying
// object must land.
//
// Geometry lives in a 100 × 100 viewBox and the cells use the same numbers as
// percentages, so the two stay aligned at every size. Sizing comes from the
// --crate-w custom property set by the page.

const VB_W = 100;
const VB_H = 100;

// The crate is seen from well above the front edge, so the opening is a
// tall trapezoid (back edge narrower and higher) and the front face is
// foreshortened to a short band of planks. Both rows of five sit fully
// inside the opening — nothing hides behind anything.
//
// Two rows of five, front row (index 0–4, filled first) and back row
// (5–9), as centre y and object size (% of crate width — 95% of the
// first cut, the user's call). The x positions are not fixed: each row
// is spread evenly between the opening's inside edges measured a quarter
// of the way down the object (the leaning side rims come closest at the
// top, but an emoji's top quarter is only its thin crown), so nothing
// visibly crosses a rim whatever the crate's perspective lean — see
// cellsFor(). Neighbours overlap a little, as fruit in a crate does.
const ROWS = [
  { y: 43, size: 23.75 },
  { y: 26, size: 20 },
];
const ROW_MEASURE = 0.25; // fraction of the size below the top edge

const WOOD = '#D9A066';
const WOOD_DARK = '#A8703F';
const WOOD_EDGE = '#7A4C25';

// One-point perspective for the whole scene. The vanishing point sits on
// the scene's vertical centre line, high above the crates: for the centred
// crate the opening tapers symmetrically from a 96-wide front edge (y=62)
// to an 80-wide back edge (y=8), i.e. every point moves DEPTH_T of the way
// toward the vanishing point between the front and back edges. A crate
// whose centre is `offset` crate-widths from the scene centre has its back
// edge shifted toward the centre by that same fraction of the offset —
// which is what makes the facing edges of two neighbouring crates come out
// nearly parallel instead of splaying apart. The off-centre crate also
// shows the outer side wall that faces the viewer, and its object rows
// follow the opening (cellsFor).
const DEPTH_T = 8 / 48; // (back-edge inset 8) / (front-left to centre 48)
const dxFor = (offset) => -offset * VB_W * DEPTH_T;
// where the front-bottom corner (y=90) lands at the back — the wall's
// hidden bottom edge, same projection as the rim
const WALL_BACK_BOTTOM = 90 - (90 + 262) * DEPTH_T;

// Inside edges of the opening at height y (front edge y=57 spans 6..94,
// back edge y=13 spans 15+dx..85+dx)
const innerEdges = (dx, y) => {
  const f = Math.min(1, Math.max(0, (57 - y) / (57 - 13)));
  return [6 + (15 + dx - 6) * f, 94 + (85 + dx - 94) * f];
};

// Cell centres for a crate with back-edge shift dx: index 0–4 front row,
// 5–9 back row, left to right
const cellsFor = (dx) =>
  ROWS.flatMap(({ y, size }) => {
    const [left, right] = innerEdges(dx, y - size / 2 + size * ROW_MEASURE);
    const first = left + size / 2;
    const last = right - size / 2;
    return Array.from({ length: 5 }, (_, i) => ({
      x: first + ((last - first) * i) / 4,
      y,
      size,
    }));
  });

const Base = ({ dx }) => (
  <svg
    viewBox={`0 0 ${VB_W} ${VB_H}`}
    className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="crate-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5E351A" />
        <stop offset="0.35" stopColor="#7B4A26" />
        <stop offset="1" stopColor="#9A6134" />
      </linearGradient>
    </defs>
    {/* the outer side wall that faces the viewer, only off-centre */}
    {dx > 0.5 && (
      <polygon points={`98,62 ${90 + dx},8 ${90 + dx},${WALL_BACK_BOTTOM} 98,90`} fill={WOOD_DARK} stroke={WOOD_EDGE} strokeWidth="0.6" strokeLinejoin="round" />
    )}
    {dx < -0.5 && (
      <polygon points={`2,62 ${10 + dx},8 ${10 + dx},${WALL_BACK_BOTTOM} 2,90`} fill={WOOD_DARK} stroke={WOOD_EDGE} strokeWidth="0.6" strokeLinejoin="round" />
    )}
    {/* floor and inner walls */}
    <polygon points={`${15 + dx},13 ${85 + dx},13 94,57 6,57`} fill="url(#crate-floor)" />
    {/* floor slats, converging toward the back */}
    <g stroke="#5A331A" strokeWidth="0.7" opacity="0.6">
      <line x1={33 + dx} y1="13" x2="28" y2="57" />
      <line x1={50 + dx} y1="13" x2="50" y2="57" />
      <line x1={67 + dx} y1="13" x2="72" y2="57" />
    </g>
    {/* back and side rims */}
    <polygon points={`${10 + dx},8 ${90 + dx},8 ${85 + dx},13 ${15 + dx},13`} fill={WOOD_DARK} stroke={WOOD_EDGE} strokeWidth="0.6" strokeLinejoin="round" />
    <polygon points={`${10 + dx},8 ${15 + dx},13 6,57 2,62`} fill={WOOD} stroke={WOOD_EDGE} strokeWidth="0.6" strokeLinejoin="round" />
    <polygon points={`${90 + dx},8 ${85 + dx},13 94,57 98,62`} fill={WOOD} stroke={WOOD_EDGE} strokeWidth="0.6" strokeLinejoin="round" />
  </svg>
);

const Front = () => (
  <svg
    viewBox={`0 0 ${VB_W} ${VB_H}`}
    className="absolute inset-0 w-full h-full pointer-events-none"
    aria-hidden="true"
  >
    <ellipse cx="50" cy="92" rx="49" ry="3" fill="rgba(0,0,0,0.16)" />
    {/* front rim */}
    <polygon points="2,62 98,62 94,57 6,57" fill={WOOD} stroke={WOOD_EDGE} strokeWidth="0.6" strokeLinejoin="round" />
    {/* foreshortened front face: three planks with dark gaps */}
    <rect x="2" y="62" width="96" height="28" fill={WOOD_EDGE} />
    <rect x="3" y="63" width="94" height="8" rx="0.8" fill={WOOD} />
    <rect x="3" y="72" width="94" height="8" rx="0.8" fill={WOOD} />
    <rect x="3" y="81" width="94" height="8" rx="0.8" fill={WOOD} />
    <g stroke={WOOD_DARK} strokeWidth="0.5" opacity="0.5">
      <path d="M10 67 Q 40 65 70 68 T 94 67" fill="none" />
      <path d="M8 76 Q 35 74 60 77 T 96 75" fill="none" />
      <path d="M12 85 Q 45 83 90 86" fill="none" />
    </g>
    {/* corner battens */}
    <rect x="5" y="61" width="5" height="29" rx="1" fill={WOOD_DARK} stroke={WOOD_EDGE} strokeWidth="0.6" />
    <rect x="90" y="61" width="5" height="29" rx="1" fill={WOOD_DARK} stroke={WOOD_EDGE} strokeWidth="0.6" />
  </svg>
);

// One object glyph — shared by crate cells and the page's flying layer so
// they look identical mid-flight and at rest
export const ObjectGlyph = ({ object, className = '' }) =>
  object.image ? (
    <img src={object.image} alt="" draggable="false" className={`w-full h-full object-contain ${className}`} />
  ) : (
    <span className={`leading-none select-none ${className}`}>
      {object.emoji}
    </span>
  );

// offset: the crate centre's distance from the scene centre, in crate
// widths (negative = left of centre); sets the perspective lean
const Crate = ({
  cells,
  object,
  onCell,
  offset = 0,
  highlight = false,
  label,
  labelClassName = '',
  className = '',
}) => {
  const dx = dxFor(offset);
  const cellGeometry = cellsFor(dx);
  return (
  <div className={`flex flex-col items-center gap-2 ${className}`}>
    <div
      className={`relative transition-transform duration-300 ${highlight ? 'addition-crate-glow' : ''}`}
      style={{ width: 'var(--crate-w)', aspectRatio: `${VB_W} / ${VB_H}` }}
    >
      <Base dx={dx} />
      {/* back row first so the front row paints over it */}
      {[...cellGeometry.keys()].reverse().map((i) => {
        const { x, y, size } = cellGeometry[i];
        const state = cells[i] ?? 'empty';
        return (
          <div
            key={i}
            ref={(el) => onCell?.(i, el)}
            className={`absolute flex items-center justify-center transition-opacity duration-500 ${
              state === 'ghost' ? 'opacity-55' : state === 'solid' ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              left: `${x}%`,
              top: `${(y / VB_H) * 100}%`,
              width: `${size}%`,
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              fontSize: `calc(var(--crate-w) * ${size / 100})`,
              // the ghost keeps some of its colour — it's still "the
              // pineapple that was here", just faded
              filter: state === 'ghost' ? 'grayscale(45%)' : undefined,
            }}
          >
            {state !== 'empty' && <ObjectGlyph object={object} />}
          </div>
        );
      })}
      <Front />
    </div>
    {label !== undefined && (
      <div
        className={`font-black tabular-nums leading-none text-[calc(var(--crate-w)*0.3)] ${labelClassName}`}
      >
        {label}
      </div>
    )}
  </div>
  );
};

export default Crate;
