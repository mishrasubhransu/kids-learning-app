// Digestive system explainer: shot list (film order) and narration.
import { KID, KID_REF, INSIDE_BG } from './shared.mjs';

export const name = 'digestive-explainer';

// ref: which shot's frame the image edit takes as its reference (the hero
// kid, or an earlier organ shot so pinks and shapes match across shots).
export const shots = [
  // Not a film shot: the ONE anatomically checked picture of the whole
  // system (front view, as if facing the child). Every organ shot is an edit
  // of it, so the parts sit in the same place in every shot.
  {
    id: 'master',
    tag: '00-master',
    asset: true,
    ref: 'outro@3', // layout there was already right; this is its close-up
    frame:
      'Redraw ONLY the organs from inside the belly of the child in the reference picture as one big, detailed ' +
      'close-up that fills the frame: organs only, floating — no child, no body, no skin. Front view. Make every part ' +
      'clear and correct: ' +
      '(1) FOOD PIPE: a smooth pink tube coming straight down from the top edge of the picture, near the centre. ' +
      '(2) STOMACH, rosy pink, in the upper RIGHT part of the picture: a J-shaped bean bag. The food pipe enters its ' +
      'top left; its big rounded side bulges toward the RIGHT edge of the picture; its narrow lower end points down ' +
      'and to the LEFT. ' +
      '(3) SMALL INTESTINE, light peach-pink and clearly THIN (about one third as thick as the large intestine): it ' +
      'starts at the narrow lower-left end of the stomach and becomes a big bundle of many small wiggly coils filling ' +
      'the middle of the lower two-thirds of the picture. ' +
      '(4) LARGE INTESTINE, a deeper rose-mauve pink, THICK and bumpy with rounded pouches: it frames the bundle of ' +
      'small coils on three sides like an upside-down U. It begins at the lower LEFT with a rounded pouch that has a ' +
      'tiny tail, goes UP the left side, ACROSS the top of the bundle (passing just below the stomach), DOWN the right ' +
      'side, then curves inward along the bottom to the bottom centre, where its end points straight down. ' +
      '(5) The last coil of the small intestine joins the large intestine at the rounded pouch in the lower left. ' +
      'The food pipe connects ONLY to the stomach, and the stomach connects ONLY to the small intestine. Nothing else ' +
      'in the picture: no liver, no other organs, no blood vessels. ' + INSIDE_BG,
  },
  {
    id: 'bite',
    tag: '01-bite',
    refImage: KID_REF,
    narration: 'Yum! A big bite of apple. But where does your food go? Let’s follow it!',
    frame:
      `${KID}, sitting on a wooden chair at a kitchen table in a bright sunny kitchen, framed from the waist up so ` +
      'his legs and feet are out of the picture, holding a shiny red apple in both hands ' +
      'right in front of the open mouth, about to take a big bite, eyes wide with delight. Medium shot from the waist ' +
      'up, the child facing the camera. The kitchen behind is softly blurred. Only the boy: no other people in the ' +
      'picture, no bowl, no high chair.',
    motion:
      'The child takes a big crunchy bite of the red apple, then chews happily with puffed cheeks and smiling eyes, ' +
      'still holding the apple in both hands. Very slow, gentle camera push-in.',
  },
  {
    id: 'chew',
    tag: '02-chew',
    ref: 'bite',
    narration: 'First, your teeth chomp the food into tiny pieces. Chomp, chomp, chomp! Your spit makes it soft and squishy.',
    frame:
      'Big close-up of the head of the same child from the reference image, seen in strict side profile facing LEFT. ' +
      'The cheek is a clean cutaway window, so we see inside the mouth: two neat rows of rounded white cartoon teeth, ' +
      'a soft pink tongue, and several chunky pieces of apple (white flesh, red skin) sitting between the teeth, with ' +
      'a few shiny clear droplets of spit. The eye is open and happy. ' + INSIDE_BG,
    motion:
      'The jaw opens and closes in a steady chewing rhythm. The white teeth chomp the apple chunks into smaller and ' +
      'smaller pieces until they are a soft pale mush. The pink tongue pushes the food around and shiny droplets of ' +
      'spit mix into it. The head stays in side profile. Fixed camera, no zoom.',
  },
  {
    id: 'swallow',
    tag: '03-swallow',
    ref: ['swallow@3', 'master'],
    narration: 'Gulp! You swallow, and the food slides down a long tube, all the way to your tummy.',
    // History: take 1 failed at the stomach (pipe thinner than the food, so
    // it left the tube, and the closed stomach morphed into a bowl) — fixed
    // by an evenly wide pipe, an already-open stomach and an END frame.
    // Then the user asked for food that isn't a neat ball, and for the rest
    // of the system to be there too.
    frame:
      'Keep the FIRST reference picture: the same child in side profile facing left, the same framing, the same ' +
      'see-through body, the same wide pink food pipe joining the top of the stomach, and the same stomach with its ' +
      'cutaway window and pool of yellow juice. Make only these changes: ' +
      '(1) The food is no longer a neat round ball. It is a soft, lumpy, slightly stretched blob of chewed apple mush ' +
      '(pale cream with tiny flecks of red skin), sitting INSIDE the top of the food pipe in the throat, and the pipe ' +
      'wall bulges gently around it. ' +
      '(2) Below the stomach, add the rest of the digestive system, in the colours of the SECOND reference picture ' +
      'and a little dimmer than the stomach: a bundle of thin, wiggly, light peach-pink small-intestine coils filling ' +
      'the lower belly, joined to the narrow end of the stomach, with the thicker, bumpy, deeper-pink large intestine ' +
      'around the bundle. The food pipe stays as wide as it is now, all the way down.',
    endFrame:
      // (worded without "child"/"throat": the image checker refused that)
      'Keep this picture exactly the same: same pose, same pink food pipe, same stomach with its cutaway window, same ' +
      'intestines, same colors and background. Change only one thing: move the lump of chewed apple. It is no longer ' +
      'at the top of the pink food pipe. It now sits INSIDE the stomach, in the pool of yellow juice, clearly visible ' +
      'through the cutaway window. The food pipe is now empty and smooth, with no bulge.',
    motion:
      'The child swallows. The soft lump of chewed food travels down INSIDE the pink tube the whole way, never leaving ' +
      'it: the tube bulges gently around the lump and its walls squeeze in just behind it, pushing it along like ' +
      'toothpaste in a tube, down through the chest. The lump passes through the opening at the top of the stomach and ' +
      'plops into the yellow juice inside the stomach with a little splash, then bobs gently. The stomach, the tube ' +
      'and the intestines keep their shape. The child stays still in side profile. Fixed camera, no zoom.',
  },
  {
    id: 'stomach',
    tag: '04-stomach',
    ref: 'master',
    narration: 'Your tummy is like a squishy bag. It squeezes and mixes the food with special juices, until it turns into soup!',
    // v1 was mirrored (bulge and exit on the wrong sides) and held crisp
    // apple slices with seeds — after chewing it should be mush.
    frame:
      'Big close-up of ONLY the stomach from the reference picture, in exactly the same orientation as there: the ' +
      'pink food pipe comes in at the top LEFT of the stomach, the big rounded side of the stomach bulges to the ' +
      'RIGHT, and the narrow end leaves at the lower LEFT as a thin light peach-pink tube. The stomach is large and ' +
      'centered, a rounded J-shaped bag in the same rosy pink and glossy look as the reference. Its front wall is a ' +
      'clean cutaway window so we see inside: a pool of light-yellow juice with several soft, lumpy blobs of chewed ' +
      'apple mush (pale cream with tiny flecks of red skin) floating in it, and a few bubbles. No whole apple slices, ' +
      'no seeds. No other organs in the picture. ' + INSIDE_BG,
    motion:
      'The stomach walls squeeze and relax in slow waves, like a squishy bag. Inside, the yellow juice sloshes and ' +
      'swirls round and round, bubbles rise, and the soft lumps of chewed food tumble, break apart and melt, until ' +
      'everything becomes one smooth, creamy yellow soup. Fixed camera, no zoom.',
  },
  // The hand-over the user asked for: the soup leaves the stomach and enters
  // the small intestine, so the absorption shot has somewhere to start from.
  {
    id: 'pass',
    tag: '10-pass',
    ref: 'master',
    seconds: 8,
    narration: 'When the soup is ready, your tummy squeezes it out, a little at a time, into the small intestine.',
    frame:
      'Keep the reference picture exactly: the same organs in the same places, the same framing and the same colors. ' +
      'Do NOT darken or recolour anything. Change only this: the front wall of the STOMACH is a clean cutaway window ' +
      'showing that it is full of smooth, creamy yellow soup. The thin small-intestine tube that leaves the narrow ' +
      'lower-left end of the stomach, and the first few wiggly coils it leads into, are see-through like tinted glass ' +
      'and EMPTY inside.',
    endFrame:
      'Keep this picture exactly the same: same organs, same layout, same colors and background. Change only one ' +
      'thing: the creamy yellow soup has moved. The stomach is now almost empty, with only a little soup left at the ' +
      'bottom of its cutaway window, and the see-through thin tube leaving the stomach and the first few wiggly coils ' +
      'are now FILLED with the creamy yellow soup.',
    motion:
      'The stomach squeezes gently in slow waves. With each squeeze, a little creamy yellow soup is pushed out through ' +
      'the narrow opening at the lower-left end of the stomach into the thin tube. The soup flows along inside the ' +
      'thin see-through tube and on into the first wiggly coils, filling them, while the level of soup in the stomach ' +
      'goes down. Everything else stays still. Fixed camera, no zoom.',
  },
  {
    id: 'intestine',
    tag: '05-intestine',
    ref: 'master',
    narration: 'The small intestine is a long, wiggly tube. Here, the good stuff from your food goes into your blood.',
    // v2 had no stomach, a small intestine as fat as the large one, and the
    // pipe from above plugged into the LARGE intestine.
    frame:
      'Keep the reference picture exactly: the same organs in the same places, the same framing and the same colors, ' +
      'with the stomach still visible at the top. Do NOT darken or recolour anything: the stomach and the large ' +
      'intestine keep exactly their bright pinks from the reference. Change only this: the SMALL intestine — the ' +
      'bundle of thin wiggly coils in the middle — becomes the star, with a soft warm golden glow around it. Two ' +
      'neighbouring coils near the centre share one large, clean cutaway window showing creamy yellow soup flowing ' +
      'inside, with tiny glowing golden sparkles in the soup. A few thin, smooth red tubes (blood vessels) run ' +
      'along the small-intestine coils and lead away toward the upper left corner.',
    motion:
      'Creamy yellow soup flows slowly along inside the thin wiggly tube in the middle, while its walls squeeze in ' +
      'gentle waves. Tiny glowing golden sparkles drift out of the soup, pass through the tube wall, and travel away ' +
      'along the thin red tubes, glowing as they go. The stomach and the thick outer tube stay still. Fixed camera, ' +
      'no zoom.',
  },
  {
    id: 'energy',
    tag: '06-energy',
    ref: 'bite',
    narration: 'Your blood carries the good stuff all around your body. It gives you energy to run, jump, and grow big and strong!',
    frame:
      'The same child from the reference image, full body, standing on green grass in a sunny park, front view, ' +
      'both arms raised and bent to show off little muscles, with a big proud smile. A warm golden glow shines softly ' +
      'from the belly, and thin streams of tiny golden sparkles flow from the belly out along the arms, down the ' +
      'legs and up to the head. Soft blurred trees and blue sky behind.',
    motion:
      'Streams of golden sparkles flow from the belly out to the arms, the legs and the head, glowing warmly. The ' +
      'child flexes both arms proudly, then jumps up and down with joy, full of energy. Fixed camera, no zoom.',
  },
  {
    id: 'large',
    tag: '09-large',
    ref: 'master',
    seconds: 10, // a long way round: give the lumps time to travel
    narration: 'The leftover bits go into a bigger tube: the large intestine. Up, across, and down they go, and turn into poop.',
    frame:
      'Keep the reference picture exactly: the same organs in the same places, the same framing and the same colors, ' +
      'with the stomach still visible at the top and the small intestine still in the middle. Do NOT darken or ' +
      'recolour anything: the stomach stays its bright rosy pink and the small intestine stays its bright light ' +
      'peach-pink, both solid, exactly as in the reference. Change only this: the LARGE intestine — the thick, bumpy ' +
      'outer tube — becomes the star: its wall is see-through like tinted pink glass along its whole length, with a ' +
      'soft glow, so we can see inside. Inside it, in the rounded pouch at the lower left where it begins, sit three ' +
      'or four small soft lumps of poop: short, plump, rounded nuggets, each a slightly different size and a little ' +
      'uneven, in a warm medium brown like milk chocolate, matte and smooth like modelling clay. Gently natural, but ' +
      'cute and clean — not dark, not shiny, not coiled, not gross, no faces. The rest of the large intestine is empty.',
    endFrame:
      'Keep this picture exactly the same — same organs, same layout, same colors and background. Change only one ' +
      'thing: the soft brown lumps are no longer in the pouch at the lower left. They are now at the very END of the ' +
      'large intestine, at the bottom centre of the picture, inside the last straight piece of the tube that points ' +
      'down. The pouch at the lower left is now empty.',
    motion:
      'The soft brown lumps travel slowly, one behind the other, INSIDE the thick outer tube: up the left side, across ' +
      'the top from left to right, down the right side, and round to the bottom centre, where they stop at the end of ' +
      'the tube. The tube walls squeeze gently behind them and push them along. The lumps never leave the tube. ' +
      'Nothing else moves. Fixed camera, no zoom.',
  },
  {
    id: 'potty',
    tag: '07-potty',
    ref: 'bite',
    narration: 'Then out it comes, when you go potty. Bye-bye, poop!',
    frame:
      'The same child from the reference image, full body, fully dressed, standing in a bright, clean, cheerful ' +
      'bathroom beside a small white toilet with the lid open, one hand raised, waving bye-bye at the toilet. Big ' +
      'cheeky smile. Medium-wide shot, side-on so both the child and the toilet ' +
      'are clearly visible.',
    motion:
      'The child waves bye-bye at the toilet with one hand, giggles, and does a happy little wiggle. Fixed camera, ' +
      'no zoom.',
  },
  {
    id: 'outro',
    tag: '08-outro',
    ref: ['outro@3', 'master'],
    narration: 'That’s your digestive system. Great job, tummy!',
    frame:
      'Keep the FIRST reference picture exactly: the same child, the same pose with both hands on the belly, the same ' +
      'framing and the same warm background. Change only the organs inside the see-through belly: redraw them to ' +
      'match the SECOND reference picture — the same layout and the same three colours: the food pipe coming down ' +
      'from the throat, the rosy stomach on the RIGHT side of the picture, the bundle of thin, light, wiggly ' +
      'small-intestine coils in the middle, and the thicker, bumpy, deeper-pink large intestine framing it — all ' +
      'softly glowing.',
    motion:
      'The child gently pats the tummy with both hands, then gives a big thumbs up with one hand and a happy smile. ' +
      'The pink organs inside glow softly, pulsing gently. Very slow, gentle camera push-in.',
  },
];
