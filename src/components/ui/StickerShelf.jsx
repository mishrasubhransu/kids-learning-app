import useChildSetting from '../../hooks/useChildSetting';
import { parseStickers } from '../../lib/stickers';

// The active child's sticker shelf on Home — every completed test/game adds
// one (SessionRecap). Pure payoff display: no dates, no streaks, just the
// growing pile a toddler can point at. Hidden until the first sticker so
// new profiles don't open on an empty promise.
const SHELF_SIZE = 14;

const StickerShelf = () => {
  const [raw] = useChildSetting('stickers', null);
  const stickers = parseStickers(raw);
  if (stickers.length === 0) return null;

  const recent = stickers.slice(-SHELF_SIZE);
  const older = stickers.length - recent.length;

  return (
    <div className="mt-8 w-full max-w-2xl bg-white/70 rounded-2xl shadow-lg px-6 py-4 flex flex-col items-center gap-2">
      <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
        My Sticker Shelf · {stickers.length}
      </span>
      <div className="flex flex-wrap justify-center gap-1.5 text-3xl md:text-4xl">
        {older > 0 && (
          <span className="self-center text-sm text-gray-400 mr-1">
            +{older}
          </span>
        )}
        {recent.map((s, i) => (
          <span
            key={`${stickers.length - recent.length + i}`}
            title={s.c}
            // The newest sticker pops in, echoing the recap award moment
            className={i === recent.length - 1 ? 'recap-sticker' : undefined}
          >
            {s.e}
          </span>
        ))}
      </div>
    </div>
  );
};

export default StickerShelf;
