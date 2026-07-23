import { useState } from 'react';
import {
  IMAGE_STYLES,
  stylesForCategory,
  getImageStyle,
  setImageStyle,
  nextImageStyle,
} from '../../lib/imageStyles';

// Small pill button that cycles through the image styles available for a
// category (see CATEGORY_IMAGE_STYLES). Safe to render inside a Link —
// clicks don't navigate. Renders nothing for single-style categories.
const StyleToggle = ({ category, className }) => {
  const [style, setStyle] = useState(() => getImageStyle(category));

  if (!stylesForCategory(category)) return null;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = nextImageStyle(category, style);
    setStyle(next);
    setImageStyle(category, next);
  };

  const { label, icon } = IMAGE_STYLES[style];

  return (
    <button
      onClick={handleClick}
      className={
        className ||
        'text-sm bg-white/20 hover:bg-white/30 rounded-full px-3 py-1 transition-colors'
      }
    >
      {icon} {label}
    </button>
  );
};

export default StyleToggle;
