// Reusable image-style support for lessons that offer more than one art
// style (e.g. cartoon vs. real photos). To opt a lesson in:
//   1. Put the variant images in a sibling folder named after the style:
//      /emotions/happy.webp -> /emotions/real/happy.webp
//   2. List the style ids for the category in CATEGORY_IMAGE_STYLES below
//      (first entry is the default and uses the original image path).
// The Home tile then shows a StyleToggle automatically and CategoryPage
// resolves item images through applyImageStyle.

export const IMAGE_STYLES = {
  cartoon: { label: 'Cartoon', icon: '🎨' },
  real: { label: 'Real', icon: '📷' },
};

export const CATEGORY_IMAGE_STYLES = {
  emotions: ['cartoon', 'real'],
};

export const stylesForCategory = (category) =>
  CATEGORY_IMAGE_STYLES[category] || null;

const storageKey = (category) => `imageStyle-${category}`;

export const getImageStyle = (category) => {
  const styles = stylesForCategory(category);
  if (!styles) return null;
  const saved = localStorage.getItem(storageKey(category));
  return styles.includes(saved) ? saved : styles[0];
};

export const setImageStyle = (category, style) => {
  localStorage.setItem(storageKey(category), style);
};

export const nextImageStyle = (category, current) => {
  const styles = stylesForCategory(category);
  if (!styles) return current;
  return styles[(styles.indexOf(current) + 1) % styles.length];
};

// The default style keeps the original path; other styles live in a
// sibling folder named after the style id.
export const imagePathForStyle = (path, category, style) => {
  const styles = stylesForCategory(category);
  if (!path || !styles || !style || style === styles[0]) return path;
  const slash = path.lastIndexOf('/');
  return `${path.slice(0, slash)}/${style}${path.slice(slash)}`;
};

export const applyImageStyle = (items, category, style) => {
  if (!stylesForCategory(category) || !style) return items;
  return items.map((item) =>
    item.image
      ? { ...item, image: imagePathForStyle(item.image, category, style) }
      : item
  );
};
