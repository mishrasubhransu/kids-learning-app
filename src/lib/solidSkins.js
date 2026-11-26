// "Real" skins for the 3D shapes: the surface of a thing that has that shape
// (a pyramid in sandstone blocks, a hemisphere as half an orange). Every
// texture is DRAWN IN CODE on a 2D canvas — no image files — so a skin costs
// nothing to ship. If this gets limiting, a slot can later point at a photo
// texture instead of a painter.
//
// SKINS[kind] is a list of skins; a skin names its slots (the builder in
// lib/solids3d.js asks for 'side', 'cap', …; `all` is the fallback). A slot
// is { size: [w, h], repeat: [u, v], paint(ctx, w, h, color, faceIndex) }.
// `color` is the lesson's random shape color, for skins that wear it (gift
// box, party hat). Canvas top is v = 1.
//
// Round shapes must show that they are turning, so their skins always carry
// something that goes AROUND the axis: panels, laces, a label, sprinkles.

const TAU = Math.PI * 2;

// Seeded so a skin looks the same every time it comes round
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const mix = (a, b, t) => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift) =>
    Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
};
const lighten = (c, t) => mix(c, '#ffffff', t);
const darken = (c, t) => mix(c, '#000000', t);

// The page behind the shapes is white, so nothing that can reach a shape's
// outline is painted white (or nearly white): there it reads as a hole.
// Small white details inside a coloured area — dots, a kiwi's core — are fine.
// Where a real object would be colour-and-white (tent, swim ring), the
// second colour is this instead — sunny yellow, or blue beside a yellow.
const partner = (c) => {
  const p = parseInt(c.slice(1), 16);
  const [r, g, b] = [(p >> 16) & 255, (p >> 8) & 255, p & 255];
  return r > 180 && g > 140 && b < 140 ? '#3b82f6' : '#facc15';
};

const fill = (ctx, w, h, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
};

const dot = (ctx, x, y, r, color) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
};

// Evenly spaced diagonal lines; `turns` whole crossings per width keeps the
// pattern continuous round a wrapped surface
const diagonals = (ctx, w, h, { color, width, count, down = false }) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  const step = w / count;
  for (let i = -count; i <= count * 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * step, down ? 0 : h);
    ctx.lineTo(i * step + h, down ? h : 0);
    ctx.stroke();
  }
};

// Vertical bands of alternating colors (beach ball panels, swim ring)
const panels = (ctx, w, h, colors, count = colors.length) => {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect((i * w) / count, 0, w / count + 1, h);
  }
};

const solid = (color) => ({
  size: [8, 8],
  paint: (ctx, w, h, shapeColor) => fill(ctx, w, h, typeof color === 'function' ? color(shapeColor) : color),
});

const WOOD = { base: '#dba869', dark: '#9a6534' };
const WOOD_END = { base: '#e6bf85', dark: '#a9743c' };

const DICE_PIPS = {
  1: [[0.5, 0.5]],
  2: [[0.27, 0.27], [0.73, 0.73]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]],
  5: [[0.27, 0.27], [0.73, 0.27], [0.5, 0.5], [0.27, 0.73], [0.73, 0.73]],
  6: [[0.27, 0.25], [0.73, 0.25], [0.27, 0.5], [0.73, 0.5], [0.27, 0.75], [0.73, 0.75]],
};
// Box faces arrive as +x, −x, +y, −y, +z, −z; opposite faces sum to seven
const DICE_FACES = [1, 6, 2, 5, 3, 4];

// Markings drawn on top of a ball's leather, whether that leather is
// painted or a photo. Sizes are in 1024-wide units so they scale with it.
const basketballLines = (ctx, w, h) => {
  ctx.strokeStyle = '#1f1a17';
  ctx.lineWidth = (10 * w) / 1024;
  const line = (path) => {
    ctx.beginPath();
    path();
    ctx.stroke();
  };
  line(() => { ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); });
  [0, w / 2, w].forEach((x) => line(() => { ctx.moveTo(x, 0); ctx.lineTo(x, h); }));
  [0.25, 0.75].forEach((s) =>
    line(() => {
      for (let y = 0; y <= h; y += 8) {
        ctx.lineTo(w * (s + 0.11 * Math.cos((TAU * y) / h)), y);
      }
    })
  );
};

const footballMarks = (ctx, w, h) => {
  const k = w / 1024;
  ctx.fillStyle = '#ead9b0';
  ctx.fillRect(0, h * 0.13, w, h * 0.045);
  ctx.fillRect(0, h * 0.825, w, h * 0.045);
  // Laces: one seam tip-to-tip with cross stitches
  ctx.fillRect(w * 0.5 - 6 * k, h * 0.34, 12 * k, h * 0.32);
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(w * 0.5 - 30 * k, h * (0.355 + i * 0.041), 60 * k, 9 * k);
  }
};

// ---- Photo textures ------------------------------------------------------
// Materials (wood, leather, peel, stone…) are photographs: image files in
// public/textures/solids. Patterns (dice, beach ball, drum…) stay painted.
// Painting is synchronous, so a skin's files are fetched first — see
// prepareSkin — and a slot then just draws them.
const photos = new Map(); // name → loaded <img>
const loading = new Map(); // name → promise

const loadPhoto = (name) => {
  if (!loading.has(name)) {
    loading.set(
      name,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          photos.set(name, img);
          resolve();
        };
        // A missing file just leaves that surface a flat colour
        img.onerror = () => resolve();
        img.src = `/textures/solids/${name}.webp`;
      })
    );
  }
  return loading.get(name);
};

// Tile a photo across the canvas, every other tile mirrored so neighbours
// (and the wrap-around seam) always match.
//   zoom — crop in a little (cut fruit: loses the white studio corners)
//   turn — quarter turn, for a photo whose stripes run the wrong way
//   crop — [x, y, w, h] as fractions: use only that part of the photo
const drawPhoto = (ctx, name, w, h, { tiles = [1, 1], zoom = 1, turn = false, crop } = {}) => {
  const img = photos.get(name);
  if (!img) return fill(ctx, w, h, '#c9a36b');
  const [sx, sy, sw, sh] = (crop ?? [0, 0, 1, 1]).map((f, i) => f * (i % 2 ? img.height : img.width));
  const [tx, ty] = tiles;
  const [tw, th] = [w / tx, h / ty];
  for (let i = 0; i < tx; i++) {
    for (let j = 0; j < ty; j++) {
      ctx.save();
      ctx.translate(i * tw + tw / 2, j * th + th / 2);
      ctx.scale((i % 2 ? -1 : 1) * zoom, (j % 2 ? -1 : 1) * zoom);
      if (turn) {
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, sx, sy, sw, sh, -th / 2 - 0.5, -tw / 2 - 0.5, th + 1, tw + 1);
      } else {
        ctx.drawImage(img, sx, sy, sw, sh, -tw / 2 - 0.5, -th / 2 - 0.5, tw + 1, th + 1);
      }
      ctx.restore();
    }
  }
};

// A slot that is one photo, optionally with markings painted `over` it
const photo = (name, { size = [1024, 1024], repeat, over, ...how } = {}) => ({
  size,
  repeat,
  photos: [name],
  paint: (ctx, w, h, color, faceIndex) => {
    drawPhoto(ctx, name, w, h, how);
    over?.(ctx, w, h, color, faceIndex);
  },
});

// A toy block's faces: a darker rim so its edges still read once every face
// is the same wood
const blockEdge = (ctx, w, h) => {
  ctx.strokeStyle = 'rgba(70, 35, 5, 0.4)';
  ctx.lineWidth = w * 0.035;
  ctx.strokeRect(0, 0, w, h);
};

// Ribbon cross on each face of a present, with a bow on the lid
const giftRibbon = (ctx, w, h, _color, i = 0) => {
  const band = w * 0.18;
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect((w - band) / 2, 0, band, h);
  ctx.fillRect(0, (h - band) / 2, w, band);
  ctx.fillStyle = 'rgba(180, 110, 0, 0.35)';
  ctx.fillRect((w - band) / 2, 0, band * 0.14, h);
  ctx.fillRect(0, (h - band) / 2, w, band * 0.14);
  if (i === 2) {
    ctx.fillStyle = '#f59e0b';
    [-1, 1].forEach((side) => {
      ctx.beginPath();
      ctx.ellipse(w / 2 + side * w * 0.14, h / 2, w * 0.14, h * 0.085, side * 0.5, 0, TAU);
      ctx.fill();
    });
    dot(ctx, w / 2, h / 2, w * 0.055, '#fde68a');
  }
};

export const SKINS = {
  sphere: [
    {
      id: 'beach-ball',
      slots: {
        all: {
          size: [1024, 512],
          paint: (ctx, w, h) => {
            panels(ctx, w, h, ['#ef4444', '#fb923c', '#facc15', '#22c55e', '#3b82f6', '#a855f7']);
            ctx.fillStyle = '#ec4899';
            ctx.fillRect(0, 0, w, h * 0.07);
            ctx.fillRect(0, h * 0.93, w, h * 0.07);
          },
        },
      },
    },
    {
      id: 'basketball',
      slots: {
        all: photo('leather-ball', { size: [2048, 1024], tiles: [4, 2], over: basketballLines }),
      },
    },
    {
      id: 'globe',
      slots: {
        all: {
          size: [1024, 512],
          paint: (ctx, w, h) => {
            const r = rng(11);
            fill(ctx, w, h, '#2b7fd9');
            for (let land = 0; land < 8; land++) {
              const cx = r() * w;
              const cy = h * (0.2 + r() * 0.6);
              for (let i = 0; i < 16; i++) {
                const x = cx + (r() - 0.5) * 190;
                const y = cy + (r() - 0.5) * 130;
                const rad = 18 + r() * 44;
                const tone = r() < 0.3 ? '#8bc34a' : '#4caf50';
                [-w, 0, w].forEach((dx) => dot(ctx, x + dx, y, rad, tone));
              }
            }
            ctx.fillStyle = '#bfe3f5';
            ctx.fillRect(0, 0, w, h * 0.07);
            ctx.fillRect(0, h * 0.92, w, h * 0.08);
          },
        },
      },
    },
  ],

  // The ellipsoid's poles are the tips of its long axis, so "vertical" on
  // the canvas runs tip to tip and "horizontal" goes round the fat middle
  ellipsoid: [
    {
      id: 'football',
      slots: {
        all: photo('leather-brown', { size: [2048, 1024], tiles: [4, 2], over: footballMarks }),
      },
    },
    {
      id: 'watermelon',
      slots: { all: photo('watermelon-rind', { size: [2048, 1024], tiles: [2, 1] }) },
    },
    {
      id: 'easter-egg',
      slots: {
        all: {
          size: [1024, 512],
          paint: (ctx, w, h, color) => {
            fill(ctx, w, h, lighten(color, 0.5));
            const zigzag = (y, amp, stroke, width) => {
              ctx.strokeStyle = stroke;
              ctx.lineWidth = width;
              ctx.lineJoin = 'round';
              ctx.beginPath();
              for (let i = 0; i <= 32; i++) ctx.lineTo((i / 32) * w, y + (i % 2 ? amp : -amp));
              ctx.stroke();
            };
            zigzag(h * 0.26, 16, color, 14);
            zigzag(h * 0.74, 16, color, 14);
            zigzag(h * 0.5, 22, '#facc15', 16);
            for (let i = 0; i < 16; i++) {
              dot(ctx, ((i + 0.5) / 16) * w, h * 0.38, 9, '#ffffff');
              dot(ctx, ((i + 0.5) / 16) * w, h * 0.62, 9, '#ffffff');
            }
          },
        },
      },
    },
  ],

  cube: [
    { id: 'wood-block', slots: { all: photo('wood-oak', { over: blockEdge }) } },
    {
      id: 'dice',
      slots: {
        all: {
          size: [384, 384],
          paint: (ctx, w, h, _color, i = 0) => {
            fill(ctx, w, h, '#f3e2b3');
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
            ctx.lineWidth = 14;
            ctx.strokeRect(0, 0, w, h);
            const value = DICE_FACES[i] ?? 1;
            DICE_PIPS[value].forEach(([x, y]) =>
              dot(ctx, x * w, y * h, value === 1 ? w * 0.13 : w * 0.085, value === 1 ? '#dc2626' : '#1f2937')
            );
          },
        },
      },
    },
    { id: 'gift-box', slots: { all: photo('gift-wrap', { size: [512, 512], over: giftRibbon }) } },
  ],

  cuboid: [
    { id: 'brick', slots: { all: photo('brick') } },
    { id: 'plank', slots: { all: photo('wood-oak', { over: blockEdge }) } },
  ],

  cylinder: [
    {
      id: 'log',
      slots: {
        side: photo('bark', { size: [2048, 1024], tiles: [2, 1] }),
        cap: photo('log-end', { zoom: 1.06 }),
      },
    },
    {
      id: 'soup-can',
      slots: {
        side: {
          size: [1024, 384],
          paint: (ctx, w, h, color) => {
            fill(ctx, w, h, '#c9ccd1');
            ctx.strokeStyle = '#8f959c';
            ctx.lineWidth = 3;
            [0.03, 0.07, 0.93, 0.97].forEach((y) => {
              ctx.beginPath();
              ctx.moveTo(0, h * y);
              ctx.lineTo(w, h * y);
              ctx.stroke();
            });
            // The label, with a picture on two sides so the turn shows
            ctx.fillStyle = color;
            ctx.fillRect(0, h * 0.12, w, h * 0.76);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(0, h * 0.12, w, h * 0.035);
            ctx.fillRect(0, h * 0.845, w, h * 0.035);
            [0.25, 0.75].forEach((x) => {
              dot(ctx, w * x, h * 0.5, h * 0.27, '#ffffff');
              dot(ctx, w * x, h * 0.52, h * 0.17, '#e53935');
              ctx.fillStyle = '#43a047';
              ctx.beginPath();
              ctx.ellipse(w * x, h * 0.36, h * 0.07, h * 0.03, 0.4, 0, TAU);
              ctx.fill();
            });
          },
        },
        cap: {
          size: [256, 256],
          paint: (ctx, w, h) => {
            fill(ctx, w, h, '#c9ccd1');
            ctx.strokeStyle = '#8f959c';
            ctx.lineWidth = 4;
            [0.45, 0.36, 0.2].forEach((rad) => {
              ctx.beginPath();
              ctx.arc(w / 2, h / 2, w * rad, 0, TAU);
              ctx.stroke();
            });
            // Ring pull
            ctx.beginPath();
            ctx.ellipse(w * 0.5, h * 0.33, w * 0.07, h * 0.1, 0, 0, TAU);
            ctx.stroke();
          },
        },
      },
    },
    {
      id: 'drum',
      slots: {
        side: {
          size: [1024, 384],
          paint: (ctx, w, h, color) => {
            fill(ctx, w, h, color);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 9;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (let i = 0; i <= 16; i++) ctx.lineTo((i / 16) * w, i % 2 ? h * 0.86 : h * 0.14);
            ctx.stroke();
            ctx.fillStyle = '#e0b84a';
            ctx.fillRect(0, 0, w, h * 0.12);
            ctx.fillRect(0, h * 0.88, w, h * 0.12);
            for (let i = 0; i < 16; i++) {
              dot(ctx, ((i + 0.5) / 16) * w, h * 0.06, 9, '#8a6a1c');
              dot(ctx, ((i + 0.5) / 16) * w, h * 0.94, 9, '#8a6a1c');
            }
          },
        },
        cap: {
          size: [256, 256],
          paint: (ctx, w, h) => {
            fill(ctx, w, h, '#e0b84a');
            dot(ctx, w / 2, h / 2, w * 0.44, '#f3e9d2');
            dot(ctx, w / 2, h / 2, w * 0.12, '#e7dabb');
          },
        },
      },
    },
  ],

  cone: [
    {
      id: 'traffic-cone',
      slots: {
        side: {
          size: [1024, 512],
          paint: (ctx, w, h) => {
            fill(ctx, w, h, '#ff6a13');
            [[0.3, 0.16], [0.58, 0.11]].forEach(([y, height]) => {
              ctx.save();
              ctx.beginPath();
              ctx.rect(0, h * y, w, h * height);
              ctx.clip();
              fill(ctx, w, h, '#cbd5e1');
              // Reflective hatching — also what shows the cone turning
              diagonals(ctx, w, h, { color: '#94a3b8', width: 10, count: 24 });
              ctx.restore();
            });
            ctx.fillStyle = '#2b2b2b';
            ctx.fillRect(0, h * 0.93, w, h * 0.07);
          },
        },
        cap: solid('#2b2b2b'),
      },
    },
    {
      id: 'waffle-cone',
      slots: {
        side: photo('waffle', { size: [2048, 1024], tiles: [4, 2] }),
        // Strawberry scoop
        cap: photo('ice-cream'),
      },
    },
    {
      id: 'party-hat',
      slots: {
        side: {
          size: [1024, 512],
          paint: (ctx, w, h, color) => {
            fill(ctx, w, h, color);
            for (let row = 0; row < 5; row++) {
              for (let col = 0; col < 10; col++) {
                dot(ctx, ((col + (row % 2 ? 0.5 : 0)) / 10) * w, h * (0.12 + row * 0.15), 17, '#ffffff');
              }
            }
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.moveTo(0, h);
            for (let i = 0; i <= 40; i++) ctx.lineTo((i / 40) * w, i % 2 ? h * 0.86 : h * 0.93);
            ctx.lineTo(w, h);
            ctx.fill();
          },
        },
        cap: solid('#e2c9a0'),
      },
    },
  ],

  pyramid: [
    { id: 'sandstone', slots: { all: photo('sandstone') } },
    { id: 'jungle-temple', slots: { all: photo('mossy-stone') } },
    { id: 'wood-block', slots: { all: photo('wood-oak') } },
  ],

  prism: [
    {
      id: 'tent',
      slots: {
        // The photo's stripes run up the picture; turned, they run ridge to ground
        side: photo('tent-canvas', { turn: true }),
        end: {
          size: [512, 512],
          // The end triangle sits sideways in its texture: ground along
          // x = w/4, ridge at the right edge, so "up the door" runs left to
          // right along the middle row.
          paint: (ctx, w, h) => {
            const color = '#d62828'; // the canvas photo's red
            fill(ctx, w, h, lighten(color, 0.35));
            const y = h / 2;
            const x0 = w * 0.25;
            const x1 = w * 0.86;
            // Fabric tape either side of the zip
            ctx.fillStyle = darken(color, 0.3);
            ctx.fillRect(x0, y - h * 0.035, x1 - x0, h * 0.07);
            // Teeth, alternating from each side so they mesh
            const step = w * 0.022;
            ctx.fillStyle = '#e5e7eb';
            for (let x = x0 + step / 2, i = 0; x < x1; x += step, i++) {
              ctx.fillRect(x, i % 2 ? y - h * 0.02 : y - h * 0.004, step * 0.6, h * 0.024);
            }
            // Stop at the top, slider and pull tab near the ground
            ctx.fillStyle = '#9ca3af';
            ctx.fillRect(x1, y - h * 0.035, w * 0.02, h * 0.07);
            const sx = x0 + w * 0.1;
            ctx.fillStyle = '#6b7280';
            ctx.fillRect(sx, y - h * 0.045, w * 0.05, h * 0.09);
            ctx.fillStyle = '#d1d5db';
            ctx.fillRect(sx - w * 0.075, y - h * 0.022, w * 0.075, h * 0.044);
            dot(ctx, sx - w * 0.05, y, w * 0.01, '#6b7280');
          },
        },
      },
    },
    // The side texture goes round all three faces, so it repeats three
    // times: each face gets one whole picture instead of a stretched third
    { id: 'cheese', slots: { side: photo('cheese', { repeat: [3, 1] }), end: photo('cheese') } },
    {
      id: 'wood-block',
      slots: { side: photo('wood-oak', { repeat: [3, 1] }), end: photo('wood-oak') },
    },
  ],

  hemisphere: [
    {
      id: 'orange',
      slots: {
        dome: photo('orange-peel', { size: [2048, 512], tiles: [4, 1] }),
        flat: photo('orange-cut', { zoom: 1.06 }),
      },
    },
    {
      id: 'watermelon',
      slots: {
        dome: photo('watermelon-rind', { size: [2048, 512], tiles: [4, 1] }),
        flat: photo('watermelon-cut', { zoom: 1.06 }),
      },
    },
    {
      id: 'kiwi',
      slots: {
        dome: photo('kiwi-skin', { size: [2048, 512], tiles: [4, 1] }),
        flat: photo('kiwi-cut', { zoom: 1.06 }),
      },
    },
  ],

  tube: [
    {
      id: 'copper-pipe',
      slots: {
        outer: photo('copper', { size: [1024, 512], tiles: [2, 1] }),
        inner: solid('#6e4420'),
        rim: solid('#d9955a'),
      },
    },
    {
      id: 'cardboard-roll',
      slots: {
        outer: photo('cardboard', { size: [1024, 512], tiles: [2, 1] }),
        inner: solid('#a9854f'),
        rim: solid('#e3cba0'),
      },
    },
  ],

  // u runs round the ring; v round the tube, with the canvas's top half on
  // the upper side of the ring and the canvas's middle at the hole
  torus: [
    {
      id: 'donut',
      slots: {
        all: {
          size: [2048, 1024],
          photos: ['dough', 'icing'],
          paint: (ctx, w, h) => {
            drawPhoto(ctx, 'dough', w, h, { tiles: [4, 2] });
            // Icing over the top, dripping down both sides
            ctx.save();
            ctx.beginPath();
            for (let x = 0; x <= w; x += 8) {
              ctx.lineTo(x, h * 0.07 + Math.sin((x / w) * TAU * 7) * h * 0.03);
            }
            for (let x = w; x >= 0; x -= 8) {
              ctx.lineTo(x, h * 0.52 + Math.sin((x / w) * TAU * 9 + 1) * h * 0.035);
            }
            ctx.clip();
            drawPhoto(ctx, 'icing', w, h, { tiles: [4, 2] });
            ctx.restore();
          },
        },
      },
    },
    {
      id: 'swim-ring',
      slots: {
        all: {
          size: [1024, 512],
          paint: (ctx, w, h, color) => {
            panels(ctx, w, h, [color, partner(color)], 8);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.fillRect(0, h * 0.2, w, h * 0.05);
          },
        },
      },
    },
    {
      id: 'tyre',
      slots: {
        // Tread on the outside (the canvas's top and bottom edges), smooth
        // sidewalls round the hole (its middle)
        all: photo('tyre', {
          size: [2048, 512],
          tiles: [4, 1],
          turn: true,
          over: (ctx, w, h) => {
            ctx.fillStyle = '#26262a';
            ctx.fillRect(0, h * 0.2, w, h * 0.6);
            ctx.fillStyle = '#4b4b52';
            ctx.fillRect(0, h * 0.34, w, h * 0.02);
            ctx.fillRect(0, h * 0.64, w, h * 0.02);
          },
        }),
      },
    },
  ],

  // u runs along the coil, v round the wire
  helix: [
    {
      id: 'spring',
      slots: { body: photo('steel', { size: [256, 256], repeat: [6, 1] }), tip: solid('#9aa2ab') },
    },
    {
      id: 'rainbow-slinky',
      slots: {
        body: {
          size: [1024, 32],
          paint: (ctx, w, h) => {
            for (let x = 0; x < w; x += 4) {
              ctx.fillStyle = `hsl(${(x / w) * 720}, 90%, 58%)`;
              ctx.fillRect(x, 0, 4, h);
            }
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.fillRect(0, h * 0.25, w, h * 0.2);
          },
        },
        tip: solid('#ef4444'),
      },
    },
    {
      id: 'rope',
      slots: {
        // Three rows of the photo's rope go round the cord, so it reads as
        // three twisted strands
        body: photo('rope', { size: [512, 256], crop: [0, 0, 1, 0.24], repeat: [14, 1] }),
        tip: solid('#c9a877'),
      },
    },
  ],
};

// Fetch the image files a skin draws from. Resolves at once for a painted
// skin (or no skin); call it before mounting or snapshotting a real look.
export const prepareSkin = (kind, id) => {
  const skin = id && SKINS[kind]?.find((entry) => entry.id === id);
  if (!skin) return Promise.resolve();
  const names = Object.values(skin.slots).flatMap((slot) => slot.photos ?? []);
  return Promise.all(names.map(loadPhoto));
};
