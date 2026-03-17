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
        <circle cx="45" cy="50" r="40" fill={color} />
        <circle cx="62" cy="50" r="35" fill="white" />
      </svg>
    ),
  },
  {
    id: 13,
    name: 'Ring',
    display: 'Ring',
    svg: (color = '#3B82F6') => (
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="45" fill={color} />
        <circle cx="50" cy="50" r="33" fill="white" />
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
