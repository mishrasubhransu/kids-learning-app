export const objectIcons = {
  peanuts: '🥜',
  strawberries: '🍓',
  eggs: '🥚',
  apples: '🍎',
  stars: '⭐',
};

export const numbers = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  name: String(i + 1),
  display: String(i + 1),
  value: i + 1,
}));

export default numbers;
