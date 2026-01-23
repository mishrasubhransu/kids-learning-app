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
];

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
