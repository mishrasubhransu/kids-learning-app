// Category intro lines — spoken over the collage page when a lesson opens,
// replacing the old bare category-name callout. Three hand-written lines per
// category so the phrasing fits ("Splash!" belongs to sea creatures, not
// tools); a generic template covers categories added before their copy.
//
// [tags] are eleven_v3 audio tags for the pre-generated clips
// (scripts/generate-intro-audio.mjs → public/audio/intros/<key>/<i>.mp3);
// stripAudioTags() removes them for on-screen text and the TTS fallback.
// Keys match CategoryPage keys (concepts-<id>, opposites).
import { getPack } from '../lib/locale';

export const intros = {
  'concepts-animals': [
    "Let's learn about animals!",
    "[gasps] Who's hiding in the wild? Let's find out!",
    'Time to meet some amazing animals!',
  ],
  'concepts-birds': [
    "Let's learn about birds!",
    "Tweet tweet! Who's up in the sky?",
    "Look up! It's bird time!",
  ],
  'concepts-food': [
    "Let's learn about food!",
    'Yum yum! What are we eating today?',
    "Are you hungry? Let's look at some food!",
  ],
  'concepts-transportation': [
    "Let's learn about transportation!",
    "Vroom vroom! Let's see how we get around!",
    "Planes, trains, and cars — let's go!",
  ],
  'concepts-profession': [
    "Let's learn about professions!",
    "What do you want to be? Let's find out!",
    "Let's meet people at work!",
  ],
  'concepts-fruits': [
    "Let's learn about fruits!",
    "Sweet and juicy — it's fruit time!",
    '[gasps] Look at all these yummy fruits!',
  ],
  'concepts-vegetables': [
    "Let's learn about vegetables!",
    "Crunch crunch! Let's meet some veggies!",
    "What's growing in the garden? Let's see!",
  ],
  'concepts-tools': [
    "Let's learn about tools!",
    "Time to build! Let's look at some tools!",
    'Tap tap tap! What can we fix today?',
  ],
  'concepts-bodyparts': [
    "Let's learn about body parts!",
    "Heads, shoulders, knees and toes — let's go!",
    "Let's see what our bodies can do!",
  ],
  'concepts-household': [
    "Let's learn about things at home!",
    "What's inside the house? Let's look!",
    "Let's explore our home!",
  ],
  'concepts-sea-creatures': [
    "Let's dive under the sea!",
    "Splash! Let's meet some sea creatures!",
    "[gasps] What's swimming down there? Let's see!",
  ],
  'concepts-traffic': [
    "Let's learn about traffic!",
    "Red light, green light — let's go!",
    "Beep beep! Let's look at the road!",
  ],
  'concepts-emotions': [
    "Let's learn about feelings!",
    "Happy, sad, silly — let's talk about feelings!",
    "How do you feel today? Let's find out!",
  ],
  'concepts-nature': [
    "Let's explore nature!",
    "Let's go on a nature adventure!",
    '[gasps] Look how beautiful nature is!',
  ],
  'concepts-bugs': [
    "Let's check out some bugs and insects!",
    'Creepy crawlies, here we come!',
    "[gasps] What's that buzzing? Let's find out!",
  ],
  'concepts-space': [
    "Three, two, one — blast off to space!",
    "Let's zoom into outer space!",
    "Let's learn about space!",
  ],
  'concepts-actions': [
    "Let's learn some actions!",
    "Run, jump, dance — let's move!",
    "Ready to wiggle? Let's learn actions!",
  ],
  'concepts-weather': [
    "Let's look at the weather!",
    "Sun, rain, or snow — what's it like today?",
    "[gasps] Look at the sky! What's the weather doing?",
  ],
  'concepts-construction': [
    "Let's meet the construction vehicles!",
    'Beep beep! Big machines at work!',
    "Diggers and cranes — let's build something big!",
  ],
  'concepts-gadgets': [
    "Let's learn about gadgets!",
    'Beep boop! Time for some cool gadgets!',
    "What does this button do? [laughs] Let's find out!",
  ],
  'concepts-outside': [
    "Let's go outside!",
    'So much to see on our street!',
    "[gasps] Look around! What can we spot outside?",
  ],
  'concepts-prepositions': [
    "Let's learn where things are!",
    "Inside, outside, over, under — let's play!",
    "[gasps] Where is the kitty hiding? Let's find out!",
  ],
  'concepts-routine': [
    "Let's see what we do all day!",
    'Good morning! Rise and shine!',
    "[gasps] From wake up to sleep — what a busy day!",
  ],
  // Fixed-language lesson: the SCREEN text follows the app language (this
  // table / the or pack), but the CLIP plays in the child's chosen Indian
  // Food language — CategoryIntro resolves it via the speech locale.
  'concepts-indian-food': [
    "Let's learn about Indian food!",
    '[gasps] Something smells yummy! What are we eating today?',
    "Dosa, roti, idli — let's eat!",
  ],
  opposites: [
    "Let's learn about opposites!",
    "Big and small, up and down — let's play with opposites!",
    "Let's find things that are opposite!",
  ],
};

// The active locale pack overrides line-for-line (same keys, same line
// count, so clip indexes stay aligned with the English ones).
export const introLines = (categoryKey, title) => {
  const pack = getPack();
  return (
    pack?.intros?.[categoryKey] ||
    intros[categoryKey] ||
    [pack?.intros?.generic?.replace('{title}', title) || `Let's learn about ${title}!`]
  );
};

export const stripAudioTags = (text) =>
  text.replace(/\[[^\]]*\]\s*/g, '').trim();

// Random line, but never the same one twice in a row for a category
// (same rule as praise clips). Session-scoped on purpose.
const lastPick = new Map();

export const pickIntro = (categoryKey, title) => {
  const lines = introLines(categoryKey, title);
  let index = Math.floor(Math.random() * lines.length);
  if (lines.length > 1 && index === lastPick.get(categoryKey)) {
    index = (index + 1) % lines.length;
  }
  lastPick.set(categoryKey, index);
  return { index, text: lines[index] };
};
