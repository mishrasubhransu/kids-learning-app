import useShortViewport from '../../hooks/useShortViewport';

// Ten-frame counting display for the numbers lesson and its quiz.
//
// Objects fill frames of ten (5 across × 2 down). Every frame the range can
// ever need is laid out from the start — as `capacity` decides, not `count`
// — so stepping from 9 to 10 to 11 never shifts anything; the icons simply
// appear in cells that were already reserved. A frame earns its rounded
// rectangle the moment its tenth object lands, which is what makes "twenty"
// read as two tens rather than a pile.
//
// The cell size is a CSS length (`cell`); quiz choices pass a small fixed
// size, the hero view leaves it out and gets the height-fitted size below.

const FRAME_SIZE = 10;
const COLS = 5;

// Hero cell size: capped at today's 10/20 icon size, narrowed to the
// viewport width, and shrunk so the stacked frame rows (plus their
// padding/gaps) fit in the height left under the header, the numeral and
// the page counter (--count-area, index.css). Floor keeps 40 on a tiny
// screen legible rather than microscopic — that case clips a little.
const heroCellSize = (frames, perRow) => {
  const rows = Math.ceil(frames / perRow);
  // per frame row: 2 cells, 0.25rem row gap, 0.375rem padding ×2, 3px
  // border ×2 (≈0.4rem); 0.5rem between frame rows
  const overhead = `${rows * 1.55 + (rows - 1) * 0.5}rem`;
  // width: page padding, plus the numeral alongside when frames sit beside
  // it (phone landscape puts every frame in one row)
  const widthBudget = perRow > 1 ? '(100vw - 14rem)' : '(100vw - 5rem)';
  return `max(1.25rem, min(var(--count-cell-max), ${widthBudget} / ${COLS * perRow + perRow - 1}, (var(--count-area) - ${overhead}) / ${rows * 2}))`;
};

const CountingFrames = ({
  count,
  capacity = count,
  icon,
  cell,
  hero = false,
  className = '',
}) => {
  const short = useShortViewport();
  const reserved = Math.max(capacity, count);
  const frameCount = Math.max(1, Math.ceil(reserved / FRAME_SIZE));
  // phone landscape: all frames in one row beside the numeral
  const perRow = hero && short ? frameCount : 1;
  const cellSize = cell ?? heroCellSize(frameCount, perRow);

  return (
    <div
      className={`grid justify-items-center ${hero ? 'gap-2' : 'gap-1'} ${className}`}
      style={{
        '--cell': cellSize,
        gridTemplateColumns: `repeat(${perRow}, auto)`,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: frameCount }).map((_, f) => {
        const start = f * FRAME_SIZE;
        const complete = count >= start + FRAME_SIZE;
        return (
          <div
            key={f}
            className={`grid rounded-2xl border-[3px] transition-colors duration-500 ${
              hero ? 'p-1.5 gap-x-2 gap-y-1' : 'p-0.5 gap-x-1 gap-y-0.5'
            } ${
              complete
                ? 'border-gray-400 bg-white/70 shadow-sm'
                : 'border-transparent'
            }`}
            style={{ gridTemplateColumns: `repeat(${COLS}, var(--cell))` }}
          >
            {Array.from({ length: FRAME_SIZE }).map((_, i) => {
              const n = start + i;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-center leading-none select-none ${
                    hero
                      ? 'filter drop-shadow-lg transform transition-all motion-safe:hover:scale-110 duration-200'
                      : ''
                  }`}
                  style={{
                    width: 'var(--cell)',
                    height: 'var(--cell)',
                    fontSize: 'calc(var(--cell) * 0.82)',
                  }}
                >
                  {n < count ? icon : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default CountingFrames;
