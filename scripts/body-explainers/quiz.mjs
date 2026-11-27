// Pictures for the film tests (src/data/filmQuizzes.js). Almost all are
// cut from stills the films already have — `pictures` below; three (eyes,
// ears, nose) had no clean still, so they are drawn here as `shots`:
//   node scripts/generate_body_explainer.mjs quiz frames      # draw the three
//   node scripts/generate_body_explainer.mjs quiz pictures    # cut all → public/science/body/quiz
//   node scripts/generate_body_explainer.mjs quiz questions   # record the question clips
export const name = 'quiz-pictures';
export const slug = null;

// The boy as he looks in the films, with nothing see-through
const KID = 'skeletal-explainer/01-floppy-frame-v1.png';
const CLOSE =
  'The same toddler boy as in the reference image: same face, same warm brown skin, same soft black hair, same ' +
  '3D art style. Plain, soft cream studio background, soft even light. ';

export const shots = [
  {
    id: 'eyes',
    tag: 'eyes',
    asset: true,
    ref: KID,
    frame:
      CLOSE +
      'An extreme close-up of only his two big, shiny brown eyes and his eyebrows, side by side, looking straight ' +
      'at the camera and filling the whole picture from left to right. The picture is cropped tight: it ends just ' +
      'under the eyes, so his nose, his mouth and his ears are NOT in the picture.',
  },
  {
    id: 'ears',
    tag: 'ears',
    asset: true,
    ref: KID,
    frame:
      CLOSE +
      'A close-up of the side of his head, seen exactly from the side, with one ear large in the very middle of ' +
      'the picture. His hair is tucked behind the ear so the whole ear shows. The picture is cropped tight around ' +
      'the ear: his eyes, his nose and his mouth are NOT in the picture.',
  },
  {
    id: 'nose',
    tag: 'nose',
    asset: true,
    ref: KID,
    frame:
      CLOSE +
      'An extreme close-up of only his small, round button nose, seen from the front, large in the very middle of ' +
      'the picture, with a little of his rosy cheeks on each side. The picture is cropped tight: it starts under ' +
      'his eyes and ends above his mouth, so his eyes, his mouth and his ears are NOT in the picture.',
  },
];

// id → the still it is cut from (under fal-creations/out/toddlearn-body;
// `shot` = one of the drawings above, newest version) and the square to
// keep, as fractions of the still: [left, top, size]. No crop = all of it.
export const pictures = {
  teeth: { from: 'digestive-explainer/02-chew-frame-v2.png', crop: [0.32, 0.3, 0.6] },
  stomach: { from: 'digestive-explainer/04-stomach-frame-v3.png' },
  'small-intestine': { from: 'digestive-explainer/00-master-frame-v1.png', crop: [0.17, 0.33, 0.66] },
  potty: { from: 'digestive-explainer/07-potty-frame-v2.png' },
  kitchen: { from: 'digestive-explainer/01-bite-frame-v3.png' },
  park: { from: 'digestive-explainer/06-energy-frame-v2.png' },
  apple: { from: 'digestive-explainer/01-bite-frame-v3.png', crop: [0.31, 0.46, 0.38] },
  heart: { from: 'circulatory-explainer/00-chest-frame-v2.png', crop: [0.2, 0.2, 0.58] },
  blood: { from: 'circulatory-explainer/05-deliver-frame-v1.png' },
  'blood-vessels': { from: 'circulatory-explainer/04-out-frame-v1.png' },
  lungs: { from: 'circulatory-explainer/07-lungs-frame-v1.png' },
  brain: { from: 'nervous-explainer/02-brain-frame-v1.png', crop: [0.19, 0.04, 0.62] },
  nerves: { from: 'nervous-explainer/03-nerves-frame-v1.png' },
  'ice-cube': { from: 'nervous-explainer/01-touch-frame-v2.png', crop: [0.27, 0.6, 0.4] },
  milk: { from: 'skeletal-explainer/09-grow-frame-v2.png', crop: [0.26, 0.56, 0.4] },
  eyes: { shot: 'eyes' },
  ears: { shot: 'ears' },
  nose: { shot: 'nose' },
  bones: { from: 'skeletal-explainer/02-skeleton-frame-v1.png' },
  'head-bone': { from: 'skeletal-explainer/04-helmet-frame-v3.png' },
  ribs: { from: 'skeletal-explainer/05-ribs-frame-v1.png' },
  backbone: { from: 'skeletal-explainer/06-spine-frame-v1.png', crop: [0.24, 0.2, 0.52] },
  block: { from: 'skeletal-explainer/08-lift-frame-v1.png', crop: [0.31, 0.5, 0.38] },
};
