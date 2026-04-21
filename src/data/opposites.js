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
];

export default opposites;
