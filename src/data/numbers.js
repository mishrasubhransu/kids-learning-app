export const objectIcons = {
  peanuts: '🥜',
  strawberries: '🍓',
  eggs: '🥚',
  apples: '🍎',
  stars: '⭐',
};

export const numbers = // The home-card pill picks the range (1–10 … 1–40); the lesson slices this
Array.from({ length: 40 }, (_, i) => ({
  id: i,
  name: String(i + 1),
  display: String(i + 1),
  value: i + 1,
}));

export default numbers;
