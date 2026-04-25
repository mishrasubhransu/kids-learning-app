export const phonicsFamilies = [
  { id: 'at', name: '-at words', emoji: '🐱', color: 'bg-orange-500', hoverColor: 'hover:bg-orange-600' },
  { id: 'an', name: '-an words', emoji: '🥫', color: 'bg-blue-500', hoverColor: 'hover:bg-blue-600' },
  { id: 'ap', name: '-ap words', emoji: '🧢', color: 'bg-green-500', hoverColor: 'hover:bg-green-600' },
];

const buildWords = (rime, onsets) =>
  onsets.map((onset, id) => ({
    id,
    name: onset + rime,
    onset,
    rime,
  }));

export const phonicsWords = {
  at: buildWords('at', ['b', 'c', 'h', 'm', 'r', 's', 'f', 'p']),
  an: buildWords('an', ['c', 'f', 'm', 'p', 'r', 't', 'v', 'b']),
  ap: buildWords('ap', ['c', 'l', 'm', 'n', 'r', 't', 'g', 'z']),
};
