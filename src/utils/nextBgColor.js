// Pick a random color that differs from the one currently showing — a
// repeat reads as "nothing happened" when a child advances to the next item.
export default function nextBgColor(colors, current) {
  const options = colors.filter((c) => c !== current);
  return options[Math.floor(Math.random() * options.length)];
}
