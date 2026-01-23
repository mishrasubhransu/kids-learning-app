export const alphabets = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  name: String.fromCharCode(65 + i),
  display: String.fromCharCode(65 + i),
}));

export default alphabets;
