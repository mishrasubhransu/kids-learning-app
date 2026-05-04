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

const buildWords = (rime, onsets) =>
  onsets.map((onset, id) => ({
    id,
    name: onset + rime,
    onset,
    rime,
  }));

const cvConsonants = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't'];

export const phonicsWords = {
  a: buildWords('a', cvConsonants),
  e: buildWords('e', cvConsonants),
  i: buildWords('i', cvConsonants),
  o: buildWords('o', cvConsonants),
  u: buildWords('u', cvConsonants),
  at: buildWords('at', ['b', 'c', 'h', 'm', 'r', 's', 'f', 'p']),
  an: buildWords('an', ['c', 'f', 'm', 'p', 'r', 't', 'v', 'b']),
  ap: buildWords('ap', ['c', 'l', 'm', 'n', 'r', 't', 'g', 'z']),
};
