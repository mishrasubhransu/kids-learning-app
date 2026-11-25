// A short test for each explainer film (Science), keyed by the film's slug.
// A question is SPOKEN — the children can't read — and answered by tapping
// one of three pictures: the right one and two wrong ones. Every answer is
// something its film showed and said; the wrong pictures come from the same
// film or a sister film.
//
// Pictures and question clips are made by
//   node scripts/generate_body_explainer.mjs quiz pictures | questions
// (the cut list is scripts/body-explainers/quiz.mjs). Like a film's
// narration, a question has one clip per language; a language without one
// falls back to the browser's voice.

// Every picture a question can show: id → the label under its card
export const quizPictures = {
  teeth: 'Teeth',
  tummy: 'Tummy',
  'small-intestine': 'Small intestine',
  potty: 'Potty',
  kitchen: 'Kitchen',
  park: 'Park',
  apple: 'Apple',
  heart: 'Heart',
  blood: 'Blood',
  'blood-vessels': 'Blood vessels',
  lungs: 'Lungs',
  brain: 'Brain',
  nerves: 'Nerves',
  'ice-cube': 'Ice cube',
  milk: 'Milk',
  eyes: 'Eyes',
  ears: 'Ears',
  nose: 'Nose',
  bones: 'Bones',
  'head-bone': 'Head bone',
  ribs: 'Ribs',
  backbone: 'Backbone',
  block: 'Block',
};

export const filmQuizzes = {
  'digestive-system': [
    { id: 'chomp', question: 'What chomps your food into tiny pieces?', answer: 'teeth', wrong: ['tummy', 'heart'] },
    { id: 'swallow', question: 'Where does your food go when you swallow?', answer: 'tummy', wrong: ['brain', 'heart'] },
    { id: 'wiggly', question: 'Which one is the long, wiggly tube?', answer: 'small-intestine', wrong: ['tummy', 'backbone'] },
    { id: 'poop', question: 'Where does the poop go?', answer: 'potty', wrong: ['kitchen', 'park'] },
  ],
  'circulatory-system': [
    { id: 'thump', question: 'What goes thump-thump in your chest?', answer: 'heart', wrong: ['brain', 'tummy'] },
    { id: 'push', question: 'What does your heart push all around your body?', answer: 'blood', wrong: ['apple', 'bones'] },
    { id: 'air', question: 'Where does your blood pick up fresh air?', answer: 'lungs', wrong: ['tummy', 'brain'] },
    { id: 'tubes', question: 'Which tubes carry your blood?', answer: 'blood-vessels', wrong: ['nerves', 'small-intestine'] },
  ],
  'nervous-system': [
    { id: 'boss', question: 'Who is the boss of your whole body?', answer: 'brain', wrong: ['heart', 'tummy'] },
    { id: 'wires', question: 'Which wires carry messages to your brain?', answer: 'nerves', wrong: ['blood-vessels', 'bones'] },
    { id: 'cold', question: 'What felt cold?', answer: 'ice-cube', wrong: ['apple', 'milk'] },
    { id: 'see', question: 'What do you see with?', answer: 'eyes', wrong: ['ears', 'nose'] },
  ],
  'skeletal-system': [
    { id: 'hold', question: 'What holds your body up?', answer: 'bones', wrong: ['heart', 'brain'] },
    { id: 'helmet', question: 'Which bone is like a helmet for your brain?', answer: 'head-bone', wrong: ['ribs', 'backbone'] },
    { id: 'hug', question: 'Which bones hug your heart and your lungs?', answer: 'ribs', wrong: ['head-bone', 'backbone'] },
    { id: 'grow', question: 'What helps your bones grow strong?', answer: 'milk', wrong: ['ice-cube', 'block'] },
  ],
};

export const quizPictureFile = (id) => `/science/body/quiz/${id}.webp`;
export const quizClipFile = (slug, id, locale = 'en') => `/films/body/quiz/${slug}-${id}.${locale}.mp3`;
// Languages whose question clips are recorded
const QUIZ_LOCALES = ['en'];

const picture = (id) => ({ id, name: quizPictures[id], image: quizPictureFile(id) });

// A film's questions, ready to play: each with its three pictures (the
// right one first — the game shuffles them) and its clip per language
export const quizFor = (slug) =>
  (filmQuizzes[slug] ?? []).map((q) => ({
    id: q.id,
    question: q.question,
    answer: q.answer,
    options: [q.answer, ...q.wrong].map(picture),
    audio: Object.fromEntries(QUIZ_LOCALES.map((l) => [l, quizClipFile(slug, q.id, l)])),
  }));
