// images[word] may be a single image path or an array of interchangeable
// examples; an example is an image path string or { video: path }.
export const wordExamples = (item, word) => {
  const entry = item.images[word];
  return Array.isArray(entry) ? entry : [entry];
};

// Image-only examples — the match/quiz games stay image-based, so a word
// with video examples must also keep at least one image example.
export const wordImages = (item, word) =>
  wordExamples(item, word).filter((e) => typeof e === 'string');

export const pickRandom = (list) => list[Math.floor(Math.random() * list.length)];

// One example per word of a pair, with both words drawn from the SAME slot
// so the two cards differ only along the dimension being taught (cartoon
// with cartoon, video with video — never a video paired with a still).
// listFor picks the example pool: wordExamples, or wordImages for the
// image-only games. A shorter list clamps to its last example.
export const pickPairExamples = (item, listFor = wordExamples) => {
  const lists = item.pair.map((w) => listFor(item, w));
  const slot = Math.floor(Math.random() * Math.max(...lists.map((l) => l.length)));
  return Object.fromEntries(
    item.pair.map((w, i) => [w, lists[i][Math.min(slot, lists[i].length - 1)]])
  );
};

const opposites = [
  {
    id: 0,
    name: 'Big and Small',
    pair: ['Big', 'Small'],
    images: {
      Big: '/opposites/big.webp',
      Small: '/opposites/small.webp',
    },
    tests: [
      { question: 'Which one is big?', correctAnswer: 'Big', sceneImage: '/opposites/scenes/big-small-scene.webp' },
    ],
  },
  {
    id: 1,
    name: 'Hot and Cold',
    pair: ['Hot', 'Cold'],
    images: {
      Hot: '/opposites/hot.webp',
      Cold: '/opposites/cold.webp',
    },
    tests: [
      { question: 'Which one is hot?', correctAnswer: 'Hot', sceneImage: '/opposites/scenes/hot-cold-scene.webp' },
    ],
  },
  {
    id: 2,
    name: 'Up and Down',
    pair: ['Up', 'Down'],
    images: {
      Up: '/opposites/up.webp',
      Down: '/opposites/down.webp',
    },
    tests: [
      { question: 'Which one is up?', correctAnswer: 'Up', sceneImage: '/opposites/scenes/up-down-scene.webp' },
    ],
  },
  {
    id: 3,
    name: 'Happy and Sad',
    pair: ['Happy', 'Sad'],
    images: {
      Happy: '/opposites/happy.webp',
      Sad: '/opposites/sad.webp',
    },
    tests: [
      { question: 'Which one is happy?', correctAnswer: 'Happy', sceneImage: '/opposites/scenes/happy-sad-scene.webp' },
    ],
  },
  {
    id: 4,
    name: 'Light and Dark',
    pair: ['Light', 'Dark'],
    images: {
      Light: '/opposites/light.webp',
      Dark: '/opposites/dark.webp',
    },
    tests: [
      { question: 'Which one is light?', correctAnswer: 'Light', sceneImage: '/opposites/scenes/light-dark-scene.webp' },
    ],
  },
  {
    id: 5,
    name: 'Open and Close',
    pair: ['Open', 'Close'],
    images: {
      Open: '/opposites/open.webp',
      Close: '/opposites/close.webp',
    },
    tests: [
      { question: 'Which one is open?', correctAnswer: 'Open', sceneImage: '/opposites/scenes/open-close-scene.webp' },
    ],
  },
  {
    id: 6,
    name: 'Full and Empty',
    pair: ['Full', 'Empty'],
    images: {
      Full: '/opposites/full.webp',
      Empty: '/opposites/empty.webp',
    },
    tests: [
      { question: 'Which one is full?', correctAnswer: 'Full', sceneImage: '/opposites/scenes/full-empty-scene.webp' },
    ],
  },
  {
    id: 7,
    name: 'Wet and Dry',
    pair: ['Wet', 'Dry'],
    images: {
      Wet: '/opposites/wet.webp',
      Dry: '/opposites/dry.webp',
    },
    tests: [
      { question: 'Which one is wet?', correctAnswer: 'Wet', sceneImage: '/opposites/scenes/wet-dry-scene.webp' },
    ],
  },
  {
    id: 8,
    name: 'Long and Short',
    pair: ['Long', 'Short'],
    images: {
      Long: '/opposites/long.webp',
      Short: '/opposites/short.webp',
    },
    tests: [
      { question: 'Which one is long?', correctAnswer: 'Long', sceneImage: '/opposites/scenes/long-short-scene.webp' },
    ],
  },
  {
    id: 9,
    name: 'Loud and Quiet',
    pair: ['Loud', 'Quiet'],
    images: {
      Loud: '/opposites/loud.webp',
      Quiet: '/opposites/quiet.webp',
    },
    tests: [
      { question: 'Which one is loud?', correctAnswer: 'Loud', sceneImage: '/opposites/scenes/loud-quiet-scene.webp' },
    ],
  },
  {
    id: 10,
    name: 'Soft and Hard',
    pair: ['Soft', 'Hard'],
    images: {
      Soft: '/opposites/soft.webp',
      Hard: '/opposites/hard.webp',
    },
    tests: [
      { question: 'Which one is soft?', correctAnswer: 'Soft', sceneImage: '/opposites/scenes/soft-hard-scene.webp' },
    ],
  },
  {
    id: 11,
    name: 'Clean and Dirty',
    pair: ['Clean', 'Dirty'],
    images: {
      Clean: '/opposites/clean.webp',
      Dirty: '/opposites/dirty.webp',
    },
    tests: [
      { question: 'Which one is clean?', correctAnswer: 'Clean', sceneImage: '/opposites/scenes/clean-dirty-scene.webp' },
    ],
  },
  {
    id: 12,
    name: 'Old and New',
    pair: ['Old', 'New'],
    images: {
      Old: '/opposites/old.webp',
      New: '/opposites/new.webp',
    },
    tests: [
      { question: 'Which one is old?', correctAnswer: 'Old', sceneImage: '/opposites/scenes/old-new-scene.webp' },
    ],
  },
  {
    id: 13,
    name: 'Day and Night',
    pair: ['Day', 'Night'],
    images: {
      Day: '/opposites/day.webp',
      Night: '/opposites/night.webp',
    },
    tests: [
      { question: 'Which one is day?', correctAnswer: 'Day', sceneImage: '/opposites/scenes/day-night-scene.webp' },
    ],
  },
  {
    id: 14,
    name: 'Running and Walking',
    pair: ['Running', 'Walking'],
    images: {
      Running: '/opposites/running.webp',
      Walking: '/opposites/walking.webp',
    },
    tests: [
      { question: 'Which one is running?', correctAnswer: 'Running', sceneImage: '/opposites/scenes/running-walking-scene.webp' },
    ],
  },
  {
    id: 15,
    name: 'Fast and Slow',
    pair: ['Fast', 'Slow'],
    images: {
      Fast: ['/opposites/fast.webp', { video: '/opposites/fast-drive.mp4' }],
      Slow: ['/opposites/slow.webp', { video: '/opposites/slow-drive.mp4' }],
    },
    tests: [
      { question: 'Which one is fast?', correctAnswer: 'Fast', sceneImage: '/opposites/scenes/fast-slow-scene.webp' },
    ],
  },
  // Beautiful/ugly is deliberately anchored to gardens — a place whose state
  // is fixable — never to people, bodies, or creatures, so the pair teaches
  // an aesthetic word without teaching appearance judgment of beings.
  {
    id: 16,
    name: 'Beautiful and Ugly',
    pair: ['Beautiful', 'Ugly'],
    // Second examples are real buildings (St. Basil's cathedral vs a
    // brutalist bank) — still places, not people or creatures
    images: {
      Beautiful: ['/opposites/beautiful.webp', '/opposites/beautiful-2.webp'],
      Ugly: ['/opposites/ugly.webp', '/opposites/ugly-2.webp'],
    },
    tests: [
      { question: 'Which one is beautiful?', correctAnswer: 'Beautiful', sceneImage: '/opposites/scenes/beautiful-ugly-scene.webp' },
    ],
  },
  {
    id: 17,
    name: 'Inside and Outside',
    pair: ['Inside', 'Outside'],
    images: {
      Inside: '/opposites/inside.webp',
      Outside: '/opposites/outside.webp',
    },
    tests: [
      { question: 'Which one is inside?', correctAnswer: 'Inside', sceneImage: '/opposites/scenes/inside-outside-scene.webp' },
    ],
  },
  {
    id: 18,
    name: 'Here and There',
    pair: ['Here', 'There'],
    images: {
      Here: '/opposites/here.webp',
      There: '/opposites/there.webp',
    },
    tests: [
      { question: 'Which one is here?', correctAnswer: 'Here', sceneImage: '/opposites/scenes/here-there-scene.webp' },
    ],
  },
  {
    id: 19,
    name: 'Near and Far',
    pair: ['Near', 'Far'],
    images: {
      Near: '/opposites/near.webp',
      Far: '/opposites/far.webp',
    },
    tests: [
      { question: 'Which one is near?', correctAnswer: 'Near', sceneImage: '/opposites/scenes/near-far-scene.webp' },
    ],
  },
  // Both sides share the same pond-cross-section framing so the only
  // difference is where the object ends up: on the surface vs the bottom.
  {
    id: 20,
    name: 'Float and Sink',
    pair: ['Float', 'Sink'],
    images: {
      Float: ['/opposites/float.webp', { video: '/opposites/float.mp4' }],
      Sink: ['/opposites/sink.webp', { video: '/opposites/sink.mp4' }],
    },
    tests: [
      { question: 'Which one is floating?', correctAnswer: 'Float', sceneImage: '/opposites/scenes/float-sink-scene.webp' },
    ],
  },
  // Easy/difficult is abstract, so it rotates through four concrete
  // scenarios (weights, bead maze, puzzle, book stack) — one random slot
  // per visit, like the phonics example words. Each slot is the same
  // activity where only the effort changes: relaxed smile vs straining
  // face.
  {
    id: 21,
    name: 'Easy and Difficult',
    pair: ['Easy', 'Difficult'],
    images: {
      Easy: [
        '/opposites/easy.webp',
        '/opposites/easy-2.webp',
        '/opposites/easy-3.webp',
        '/opposites/easy-4.webp',
      ],
      Difficult: [
        '/opposites/difficult.webp',
        '/opposites/difficult-2.webp',
        '/opposites/difficult-3.webp',
        '/opposites/difficult-4.webp',
      ],
    },
    tests: [
      { question: 'Which one is easy?', correctAnswer: 'Easy', sceneImage: '/opposites/scenes/easy-difficult-scene.webp' },
    ],
  },
];

export default opposites;
