import {
  IMAGE_STYLES,
  stylesForCategory,
  resolveImageStyle,
  nextImageStyle,
} from '../../lib/imageStyles';
import useChildSetting from '../../hooks/useChildSetting';

// Small pill button that cycles through the image styles available for a
// category (see CATEGORY_IMAGE_STYLES). Safe to render inside a Link —
// clicks don't navigate. Renders nothing for single-style categories.
// The choice is saved per child (falls back to this device pre-profile).
const StyleToggle = ({ category, className }) => {
  const [saved, setSaved] = useChildSetting(`imageStyle-${category}`, null);

  if (!stylesForCategory(category)) return null;

  const style = resolveImageStyle(category, saved);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSaved(nextImageStyle(category, style));
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
