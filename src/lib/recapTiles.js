import shuffle from '../utils/shuffle';

// Collage tiles for the SessionRecap overlay. TestingMode covers every card
// type in the app, so the per-category mapping lives here; games with
// image-only rounds (opposites) build {images} tiles themselves. Tile shapes
// SessionRecap renders: {video} | {images: []} | {swatch, outlined} |
// {svg} | {text, accent?}.
export const recapTilesForItems = (category, items, { shapeColor } = {}) =>
  shuffle(items)
    .slice(0, 8)
    .map((item) => {
      switch (category) {
        case 'alphabets':
          return { text: item.display };
        case 'numbers':
          return { text: String(item.value) };
        case 'colors':
          return { swatch: item.hex, outlined: item.name === 'White' };
        case 'shapes':
          return { svg: item.svg(shapeColor) };
        default:
          if (category?.startsWith('phonics-')) {
            return { text: item.onset, accent: item.rime };
          }
          if (item.video) return { video: item.video };
          if (item.image) return { images: [item.image] };
          return { text: item.name };
      }
    });
