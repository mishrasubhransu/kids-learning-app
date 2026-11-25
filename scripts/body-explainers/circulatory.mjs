// Circulatory system explainer: shot list (film order) and narration.
//
// The story, in toddler words: your heart is a pump → it pushes bright red
// blood out along tubes to every part of you → the blood hands out fresh air
// and food → tired, darker blood comes back along other tubes → the lungs
// make it bright red again → round and round, even while you sleep.
import { KID, INSIDE_BG } from './shared.mjs';

export const name = 'circulatory-explainer';
// the lesson item's slug: the film is published under this name
export const slug = 'circulatory-system';

// Pictures from the digestive film, so this one stars the same boy with the
// same see-through look (paths inside fal-creations/out/toddlearn-body).
const LOOK = 'digestive-explainer/08-outro-frame-v4.png'; // see-through body, warm backdrop
const PARK = 'digestive-explainer/06-energy-frame-v2.png'; // full body in the park

// Two tube colours, worded the same way in every shot. Blood coming back is
// drawn DARKER, not blue (the user's ask, and it is what blood really does).
const RED = 'bright cherry red';
const DARK = 'dark plum (a deep, dark purplish wine-red)';

const WARM_BG = 'The background is the same soft, warm cream gradient as in the reference. ';

export const shots = [
  // Not film shots: the two checked pictures every organ shot is an edit of.
  // `master` = the whole-body map of heart and tubes; `chest` = the close-up
  // of heart and lungs. Front view, as if facing the child, so HIS left is
  // the RIGHT side of the picture.
  {
    id: 'master',
    tag: '00-master',
    asset: true,
    ref: [LOOK, PARK],
    frame:
      'The same toddler boy as in the reference pictures (same face, same soft straight black hair, same warm brown ' +
      'skin), drawn in the see-through style of the FIRST reference picture. Full body from head to toes, strict ' +
      'front view, standing straight with his feet a little apart and both arms held out and down, away from his ' +
      'sides, palms open and facing forward, fingers spread. Calm happy smile, looking at the camera. His head and ' +
      'face are normal. From the neck down his whole body — chest, tummy, arms, hands, legs and feet — is smooth, ' +
      'see-through frosted glass with a pale warm peach tint, and his blue shorts are see-through pale-blue glass ' +
      'too, so we can see everything inside him. Inside is a simple, tidy map of his heart and blood tubes, like a ' +
      'clear diagram — a few smooth lines, NOT a dense realistic web: ' +
      '(1) HEART: one glossy red heart about the size of his fist, with a rounded real-heart shape (not a valentine ' +
      'heart), in the middle of the chest, sitting slightly toward the RIGHT side of the picture, its pointed bottom ' +
      'tilted toward the lower right. ' +
      `(2) RED TUBES, ${RED}, smooth and glossy: one thick tube arches out of the top of the heart and branches: one ` +
      'thin branch up each side of the neck to just under the ears; one branch across each shoulder and all the way ' +
      'down each arm into the hand, with fine twigs into the fingers; and one thick tube straight down the middle of ' +
      'the tummy that splits in two at the hips, one branch all the way down each leg into the foot, with fine twigs ' +
      'into the toes. ' +
      `(3) DARK TUBES, ${DARK}, the same thickness: one runs right beside every red tube, like a twin — along both ` +
      'arms, both legs, the neck and the tummy — and they all join back into the heart. ' +
      'The two colours are clearly different at a glance: one bright, one dark. No other organs, no bones, no lungs. ' +
      WARM_BG,
  },
  {
    id: 'chest',
    tag: '00-chest',
    asset: true,
    ref: 'master',
    frame:
      'Redraw ONLY the heart from inside the chest of the child in the reference picture, together with his two ' +
      'lungs, as one big, detailed close-up that fills the frame: organs only, floating — no child, no body, no skin. ' +
      'Front view, in the same glossy style and exactly the same two tube colours as the reference. Make every part ' +
      'clear and correct: ' +
      '(1) HEART: large, in the centre, a rounded real-heart shape (not a valentine heart), glossy red, its pointed ' +
      'bottom tilted toward the lower RIGHT of the picture. ' +
      '(2) LUNGS: two big, soft, pale-pink spongy lungs, one on each side of the heart and a little behind it, each ' +
      'with a rounded top and a wide base. The lung on the right side of the picture is a little smaller, with a ' +
      'gentle notch where the heart sits. ' +
      `(3) RED TUBES, ${RED}: one thick tube rises out of the top of the heart, arches over to the right like a ` +
      'walking-stick handle and goes down behind the heart, leaving through the bottom edge of the picture. Two thin ' +
      'branches go from the top of the arch up to the top edge of the picture. ' +
      `(4) DARK TUBES, ${DARK}: one thick tube comes straight down from the top edge of the picture into the upper ` +
      'LEFT of the heart, and one thick tube comes straight up from the bottom edge into the lower LEFT of the heart. ' +
      `(5) HEART TO LUNGS: one short ${DARK} tube leaves the top front of the heart and forks like a letter T, one ` +
      `arm going into each lung. From each lung, one short ${RED} tube comes back into the upper back of the heart. ` +
      'The two colours NEVER blend or join into each other: where a dark tube and a red tube cross, one simply ' +
      'passes behind the other, and every tube is one single colour from end to end. The only places they meet are ' +
      'the heart and the lungs. Nothing else in the picture: no windpipe, no ribs, no other organs. ' + INSIDE_BG,
  },
  {
    id: 'feel',
    tag: '01-feel',
    ref: PARK,
    narration: 'Phew, what a run! Put your hand on your chest. Thump-thump, thump-thump! What is that? It’s your heart!',
    frame:
      `${KID}, standing on the green grass in the same sunny park as the reference image, front view, framed from ` +
      'the knees up. He has just stopped running: rosy cheeks, a little out of breath, mouth open in a happy smile. ' +
      'One hand is pressed flat on the middle of his chest and he looks down at it with wide, curious eyes. A very ' +
      'soft red glow shines from under his hand. Soft blurred trees and blue sky behind. Only the boy, no other people.',
    motion:
      'The child catches his breath, his chest rising and falling. Under his hand a soft red glow pulses in a steady ' +
      'double beat — thump-thump, thump-thump — and his hand bounces a tiny bit with each beat. He looks down at his ' +
      'chest in surprise, then looks up at the camera with a big delighted smile. Very slow, gentle camera push-in.',
  },
  {
    id: 'fist',
    tag: '02-fist',
    ref: [LOOK, 'master'],
    narration: 'Your heart sits in the middle of your chest. It is about as big as your fist, and it is a super strong pump!',
    frame:
      'The same child as in the FIRST reference picture, in the same see-through style and on the same warm ' +
      'background, framed from the waist up, strict front view. His chest is see-through and shows his heart ' +
      'exactly as in the SECOND reference picture: one glossy red heart in the middle of the chest, slightly toward ' +
      'the right side of the picture, with the start of its thick bright-red tube and dark-plum tube on top. No ' +
      'stomach and no intestines — only the heart. He holds one closed fist up in front of his shoulder on the LEFT ' +
      'side of the picture, at the same height as the heart, not covering it, so we can compare them: the heart is ' +
      'just the same size as his fist. His other arm hangs relaxed. He looks at the camera with a proud smile.',
    motion:
      'The heart beats in a steady double rhythm, squeezing smaller and relaxing bigger: thump-thump, thump-thump. ' +
      'The child looks at his fist, squeezes it gently in time with the heart, then looks at the camera and smiles ' +
      'proudly. Fixed camera, no zoom.',
  },
  {
    id: 'pump',
    tag: '03-pump',
    ref: 'chest',
    narration: 'Every time your heart squeezes, whoosh! It pushes blood out, into tubes called blood vessels.',
    frame:
      'Keep the reference picture exactly: the same heart, lungs and tubes in the same places, the same framing and ' +
      'the same colors. Do NOT darken or recolour anything. Change only this: the thick bright-red tube that arches ' +
      'out of the top of the heart becomes the star — its wall is see-through like red-tinted glass, with a soft ' +
      'glow, so we can see bright red blood filling it.',
    motion:
      'The heart squeezes hard and relaxes in a steady, strong double beat. With every squeeze, a bright, glowing ' +
      'wave of red blood surges out of the top of the heart and rushes along INSIDE the thick red tube, over the ' +
      'arch and away. The tubes pulse gently with each wave. The lungs stay still. Fixed camera, no zoom.',
  },
  {
    id: 'out',
    tag: '04-out',
    ref: 'master',
    seconds: 8,
    narration: 'The blood zooms to every part of you: up to your head, out to your fingers, and all the way down to your toes!',
    frame:
      'Keep the reference picture exactly: the same child, the same pose, the same heart and tubes in the same ' +
      'places, the same framing and the same colors. Do NOT darken or recolour anything. Change only this: the ' +
      'bright-red tubes are the star, with a soft warm glow along their whole length. The dark tubes stay exactly as ' +
      'they are, without a glow.',
    endFrame:
      'Keep this picture exactly the same: same child, same pose, same heart, same tubes, same colors and ' +
      'background. Change only one thing: his hands, his feet and his cheeks now have a soft, warm, rosy-golden glow, ' +
      'as if they have just been warmed up.',
    motion:
      'The heart beats steadily. With each beat, bright glowing pulses of red light travel OUTWARD from the heart ' +
      'along the bright-red tubes, always staying inside them: up the neck to the head, out along both arms to the ' +
      'fingertips, and down both legs to the toes. When the pulses arrive, the hands, the feet and the cheeks begin ' +
      'to glow warmly. The child stands still, smiling. Fixed camera, no zoom.',
  },
  {
    id: 'deliver',
    tag: '05-deliver',
    ref: 'chest', // for the look and the two colours only
    seconds: 8,
    narration: 'The bright red blood carries fresh air, and the good stuff from your food. It hands them out to every part of you!',
    frame:
      'A NEW picture in the same glossy 3D style and the same colours as the reference: an extreme close-up deep ' +
      'inside the body. One wide, see-through tube, like clear glass with a faint red tint, runs straight across the ' +
      'middle of the picture from the left edge to the right edge. Above and below it is soft, pink, pillowy body ' +
      'tissue. Inside the tube float about twelve blood cells, all the same shape: smooth, plump, round discs with a ' +
      'soft dimple in the middle, like tiny cushions — no faces, no eyes. On the LEFT half of the tube the cells are ' +
      `${RED} and each one carries a tiny glowing golden sparkle. In the MIDDLE, several golden sparkles are drifting ` +
      'out through the tube wall into the pink tissue, which glows warmly where they land. On the RIGHT half of the ' +
      `tube the cells carry no sparkle and are ${DARK}. No heart and no lungs in this picture.`,
    motion:
      'The round blood cells drift slowly along inside the glass tube from left to right, tumbling gently, never ' +
      'leaving the tube. In the middle, their tiny golden sparkles float out through the tube wall into the soft pink ' +
      'tissue, which glows warmly as it receives them. Bright red cells keep arriving from the left carrying ' +
      'sparkles, and dark cells without sparkles keep leaving on the right. Fixed camera, no zoom.',
  },
  {
    id: 'back',
    tag: '06-back',
    ref: 'master',
    seconds: 8,
    narration: 'Now the blood is tired, and a little darker. It flows all the way back to your heart, along other tubes.',
    frame:
      'Keep the reference picture exactly: the same child, the same pose, the same heart and tubes in the same ' +
      'places and the same framing. Change only this: the DARK tubes are the star — a little thicker and glossier, ' +
      'in exactly their deep, dark plum colour. No glow on them, and do NOT lighten them: not lilac, not violet, not ' +
      'blue. The bright-red tubes step back: thinner, paler and half see-through, still in the same places. The ' +
      'heart and the child stay exactly the same.',
    // take 1: "pulses of dark plum light" came out as bright red glows, with
    // stray red dots on the hair. take 2: "bulges like beads on a string"
    // came out as strings of dark spheres — the user found them creepy and
    // asked for the `out` shot's look, darker and running the other way.
    motion:
      'The heart beats slowly and steadily. With each beat, soft glowing pulses travel INWARD along the dark tubes, ' +
      'always staying inside them: from the fingertips up both arms to the heart, from the toes up both legs and up ' +
      'the middle of the tummy to the heart, and down both sides of the neck to the heart. The pulses are a dim, ' +
      'deep, dark wine-red glow — clearly darker than bright red, like dark cherry juice — never bright red, never ' +
      'pink, never white. They flow smoothly, like light sliding through the tubes: no balls, no beads, no bubbles, ' +
      'no separate objects. Nothing glows on the hair, on the face or outside the body. Nothing travels outward. ' +
      'The child stands still, smiling. Fixed camera, no zoom.',
  },
  {
    id: 'lungs',
    tag: '07-lungs',
    ref: 'chest',
    seconds: 9,
    narration: 'Then your heart sends it to your lungs. Breathe in! The blood picks up fresh air, and turns bright red again.',
    frame:
      'Keep the reference picture exactly: the same heart, lungs and tubes in the same places, the same framing and ' +
      'the same colors. Do NOT darken or recolour the heart or the tubes. Change only this: the two lungs become the ' +
      'star — a little see-through, with a soft, fresh, pale sky-blue glow inside them and a few tiny white sparkles ' +
      'of air. Inside each lung we can now see the dark plum tube from the heart branching into a few fine dark ' +
      'twigs, which turn into fine bright-red twigs that gather into the bright-red tube going back to the heart.',
    motion:
      'The two lungs slowly swell bigger as they breathe in, glowing with fresh pale-blue air and tiny white ' +
      'sparkles, then gently shrink again. The heart beats steadily. Dark pulses travel from the heart along the dark ' +
      'tube into both lungs; inside the lungs they turn bright red, and bright red pulses travel back from the lungs ' +
      'into the heart. Only the fine twigs inside the lungs change colour. The thick tubes that run off the top and ' +
      'bottom edges of the picture never change: the dark ones stay dark plum and the red ones stay red, with no ' +
      'glow travelling along them. Fixed camera, no zoom.', // take 1 flashed the thick dark tube red
  },
  {
    id: 'sleep',
    tag: '08-sleep',
    ref: ['public/concepts/routine/sleep.webp', 'fist'],
    narration: 'Round and round it goes, all day and all night, even when you are fast asleep.',
    frame:
      'The same toddler boy as in the reference pictures, fast asleep in his cosy bed at night, lying on his back ' +
      'with his head on a soft pillow, eyes closed, a peaceful little smile, the blanket pulled up to his tummy and ' +
      'his arms resting on top of it. Seen from above at a gentle angle, the boy large in the frame. He wears ' +
      'pyjamas, but the middle of his chest is softly see-through, like in the SECOND reference picture, and shows ' +
      'his heart glowing gently: exactly the same heart as in the SECOND reference picture — the same rounded ' +
      'real-heart shape with its tubes on top, NOT a valentine heart, not a love-heart symbol. Dim, warm bedroom: ' +
      'soft blue moonlight from a window, a small warm night-light, a teddy bear beside him. Calm and cosy, not dark ' +
      'or spooky.',
    motion:
      'The child sleeps peacefully, his chest rising and falling slowly as he breathes. His heart glows softly and ' +
      'beats in a slow, calm double rhythm — thump-thump… thump-thump. Small soft pulses of red light spread gently ' +
      'out from the heart with each beat. Nothing else moves. Very slow, gentle camera push-in.',
  },
  {
    id: 'outro',
    tag: '09-outro',
    ref: 'master',
    narration: 'That’s your circulatory system. Thump-thump! Great job, heart!',
    frame:
      'Keep the reference picture: the same child, the same see-through body, the same heart and the same bright ' +
      'and dark tubes in the same places, the same colors and background. Change only this: frame him closer, from ' +
      'the knees up, with a big, proud, open-mouthed smile; one arm is raised with the hand giving a thumbs up, the ' +
      'other arm stays out and down as before. The tubes inside the raised arm follow the arm. The heart and all the ' +
      'tubes glow softly.',
    motion:
      'The child holds his thumbs up and smiles proudly, bouncing happily on the spot. His heart beats in a steady ' +
      'double rhythm, and with each beat all the tubes glow a little brighter, then softer. Very slow, gentle camera ' +
      'push-in.',
  },
];
