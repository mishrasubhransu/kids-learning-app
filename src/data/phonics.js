export const phonicsFamilies = [
  { id: 'a', group: '2-letter', name: '_A sounds', color: 'bg-red-500', hoverColor: 'hover:bg-red-600' },
  { id: 'e', group: '2-letter', name: '_E sounds', color: 'bg-yellow-500', hoverColor: 'hover:bg-yellow-600' },
  { id: 'i', group: '2-letter', name: '_I sounds', color: 'bg-pink-500', hoverColor: 'hover:bg-pink-600' },
  { id: 'o', group: '2-letter', name: '_O sounds', color: 'bg-purple-500', hoverColor: 'hover:bg-purple-600' },
  { id: 'u', group: '2-letter', name: '_U sounds', color: 'bg-teal-500', hoverColor: 'hover:bg-teal-600' },
  { id: 'at', group: '3-letter', name: '-at words', emoji: '🐱', color: 'bg-orange-500', hoverColor: 'hover:bg-orange-600' },
  { id: 'an', group: '3-letter', name: '-an words', emoji: '🥫', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600' },
  { id: 'ap', group: '3-letter', name: '-ap words', emoji: '🧢', color: 'bg-green-500', hoverColor: 'hover:bg-green-600' },
];

const buildWords = (rime, onsets, { images = false } = {}) =>
  onsets.map((onset, id) => ({
    id,
    name: onset + rime,
    onset,
    rime,
    ...(images && { image: `/phonics/words/${onset + rime}.webp` }),
  }));

const cvConsonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't'];

// 3-letter lists only keep words a 2-4 year old knows, each with a
// generated picture (public/phonics/words/) revealed after the word.
export const phonicsWords = {
  a: buildWords('a', cvConsonants),
  e: buildWords('e', cvConsonants),
  i: buildWords('i', cvConsonants),
  o: buildWords('o', cvConsonants),
  u: buildWords('u', cvConsonants),
  at: buildWords('at', ['b', 'c', 'h', 'm', 'r'], { images: true }),
  an: buildWords('an', ['c', 'f', 'm', 'p', 'v'], { images: true }),
  ap: buildWords('ap', ['c', 'l', 'm', 'n', 't'], { images: true }),
};
