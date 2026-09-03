// Fixed spoken lines with pre-generated voice clips, keyed by the slug
// under lines/ in the voice bucket (see lib/voiceKeys.js linePart). Pure
// data so the clip generation script can import it outside the browser.
import { linePart } from '../lib/voiceKeys';
import { additionLines } from './addition';

export const FIXED_LINES = {
  'game-interstitial': 'Great job! Ready to play a game?',
  'this-is-my-family': 'This is my family!',
  'recap-0': 'Wow! Look at everything you learned! You earned a sticker!',
  'recap-1': 'Great job! Here is a shiny new sticker for you!',
  'recap-2': 'Hooray, you did it! A new sticker for your shelf!',
  // Addition lesson: "What is 2 plus 3?" / "So, 2 plus 3 is 5!" for every
  // sum to 10, plus "Let's count!" (data/addition.js)
  ...additionLines,
};

export const RECAP_LINE_SLUGS = ['recap-0', 'recap-1', 'recap-2'];

export const fixedLinePart = (slug) => linePart(slug, FIXED_LINES[slug]);
