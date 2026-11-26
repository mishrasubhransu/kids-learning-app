import { SolidSnapshot } from '../components/ui/Solid3D.jsx';

// Three turns of an evenly widening (Archimedean) spiral, centre outwards
const SPIRAL_PATH = Array.from({ length: 145 }, (_, i) => {
  const angle = (i / 144) * Math.PI * 6;
  const radius = 3 + (i / 144) * 41;
  const x = (50 + Math.cos(angle) * radius).toFixed(1);
  const y = (50 + Math.sin(angle) * radius).toFixed(1);
  return `${i ? 'L' : 'M'}${x},${y}`;
}).join(' ');

// SVG paths for shapes
export const shapes = [
  {
    id: 0,
    name: 'Circle',
    display: 'Circle',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="45" fill={color} />
      </svg>
    ),
  },
  {
    id: 1,
    name: 'Triangle',
    display: 'Triangle',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <polygon points="50,5 95,95 5,95" fill={color} />
      </svg>
    ),
  },
  {
    id: 2,
    name: 'Square',
    display: 'Square',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect x="10" y="10" width="80" height="80" fill={color} />
      </svg>
    ),
  },
  {
    id: 3,
    name: 'Star',
    display: 'Star',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <polygon
          points="50,5 61,40 98,40 68,62 79,97 50,75 21,97 32,62 2,40 39,40"
          fill={color}
        />
      </svg>
    ),
  },
  {
    id: 4,
    name: 'Plus',
    display: 'Plus',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path
          d="M40,10 L60,10 L60,40 L90,40 L90,60 L60,60 L60,90 L40,90 L40,60 L10,60 L10,40 L40,40 Z"
          fill={color}
        />
      </svg>
    ),
  },
  {
    id: 5,
    name: 'Rectangle',
    display: 'Rectangle',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <rect x="5" y="20" width="90" height="60" fill={color} />
      </svg>
    ),
  },
  {
    id: 6,
    name: 'Trapezoid',
    display: 'Trapezoid',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <polygon points="25,20 75,20 95,80 5,80" fill={color} />
      </svg>
    ),
  },
  {
    id: 7,
    name: 'Pentagon',
    display: 'Pentagon',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <polygon points="50,5 97,36 79,91 21,91 3,36" fill={color} />
      </svg>
    ),
  },
  {
    id: 8,
    name: 'Hexagon',
    display: 'Hexagon',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <polygon points="50,5 93,27 93,73 50,95 7,73 7,27" fill={color} />
      </svg>
    ),
  },
  {
    id: 9,
    name: 'Rhombus',
    display: 'Rhombus',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <polygon points="50,10 73,50 50,90 27,50" fill={color} />
      </svg>
    ),
  },
  {
    id: 10,
    name: 'Heart',
    display: 'Heart',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path
          d="M50,88 C25,65 5,50 5,30 C5,15 17,5 30,5 C40,5 47,10 50,18 C53,10 60,5 70,5 C83,5 95,15 95,30 C95,50 75,65 50,88Z"
          fill={color}
        />
      </svg>
    ),
  },
  {
    id: 11,
    name: 'Ellipse',
    display: 'Ellipse',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <ellipse cx="50" cy="50" rx="30" ry="45" fill={color} />
      </svg>
    ),
  },
  {
    id: 12,
    name: 'Crescent',
    display: 'Crescent',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <mask id="crescent-mask">
            <rect width="100" height="100" fill="white" />
            <circle cx="62" cy="50" r="35" fill="black" />
          </mask>
        </defs>
        <circle cx="45" cy="50" r="40" fill={color} mask="url(#crescent-mask)" />
      </svg>
    ),
  },
  {
    id: 13,
    name: 'Ring',
    display: 'Ring',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <mask id="ring-mask">
            <rect width="100" height="100" fill="white" />
            <circle cx="50" cy="50" r="33" fill="black" />
          </mask>
        </defs>
        <circle cx="50" cy="50" r="45" fill={color} mask="url(#ring-mask)" />
      </svg>
    ),
  },
  {
    id: 14,
    name: 'Semicircle',
    display: 'Semicircle',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path d="M5,60 A45,45 0 0,1 95,60 Z" fill={color} />
      </svg>
    ),
  },
  {
    // A flat swirl that widens as it winds — the 2D cousin of the 3D helix,
    // which climbs at a constant width instead
    id: 15,
    name: 'Spiral',
    display: 'Spiral',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <path
          d={SPIRAL_PATH}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

// 3D shapes (the "3D" side of the Shapes pill). `solid` names the builder in
// lib/solids3d.js: the lesson's hero renders it live and draggable
// (ui/Solid3D SolidViewer); everywhere else — tiles, quiz cards, recap —
// `svg` paints a still, so the 2D render paths work unchanged.
const solid = (id, name, kind) => ({
  id,
  name,
  display: name,
  solid: kind,
  svg: (color = '#3B82F6') => <SolidSnapshot kind={kind} color={color} />,
});

export const solids = [
  solid(100, 'Sphere', 'sphere'),
  solid(101, 'Cube', 'cube'),
  solid(102, 'Cuboid', 'cuboid'),
  solid(103, 'Cylinder', 'cylinder'),
  solid(104, 'Cone', 'cone'),
  solid(105, 'Pyramid', 'pyramid'),
  solid(106, 'Prism', 'prism'),
  solid(107, 'Ellipsoid', 'ellipsoid'),
  solid(108, 'Hemisphere', 'hemisphere'),
  solid(109, 'Tube', 'tube'),
  solid(110, 'Torus', 'torus'),
  solid(111, 'Helix', 'helix'),
];

// The same solids in real-world skins (the "Real" side of the Plain/Real
// pill): `real` tells the live viewer and the stills to pick a skin from
// lib/solidSkins.js instead of the checker. Names, slugs and clips are the
// plain solids' own.
export const realSolids = solids.map((item) => ({
  ...item,
  real: true,
  svg: (color = '#3B82F6') => <SolidSnapshot kind={item.solid} color={color} real />,
}));

// The Shapes pills: 2D/3D, and for 3D the look. Anything else saved reads
// as 2D / plain.
export const shapesForDim = (dim, look) =>
  dim !== '3d' ? shapes : look === 'real' ? realSolids : solids;

// Nice colors for shapes
export const shapeColors = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

export const getRandomShapeColor = () => {
  return shapeColors[Math.floor(Math.random() * shapeColors.length)];
};

export default shapes;
