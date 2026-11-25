// Skeletal system explainer: shot list (film order) and narration.
//
// The story, in toddler words: a floppy toy can't stand up, you can —
// because you have bones → all together they are your skeleton → bones are
// hard and hold you up → some keep you safe (head like a helmet, ribs like
// a cage) → the backbone bends → joints bend like hinges → muscles pull the
// bones, and up goes the block → bones grow with you.
import { KID } from './shared.mjs';

export const name = 'skeletal-explainer';
// the lesson item's slug: the film is published under this name
export const slug = 'skeletal-system';

// Pictures from the earlier films, so this one stars the same boy in the
// same see-through look (paths inside fal-creations/out/toddlearn-body).
const BODY = 'circulatory-explainer/00-master-frame-v1.png'; // see-through body, pose, warm backdrop
const PARK = 'digestive-explainer/06-energy-frame-v2.png'; // full body in the park
const KITCHEN = 'digestive-explainer/01-bite-frame-v3.png'; // the boy at the kitchen table
const HEAD = 'nervous-explainer/02-brain-frame-v1.png'; // close-up, brain in the see-through top of the head

// Worded the same way in every shot. The head never shows a skeleton face:
// the face stays a normal cartoon face, so nothing is spooky.
const BONE =
  'smooth, rounded, creamy ivory-white, with soft pale-peach shading — chunky, clean and friendly, like polished ' +
  'toy bones, never realistic, cracked or scary';
const MUSCLE = 'a soft, smooth, rosy-pink muscle shaped like a plump spindle';

export const shots = [
  // Not a film shot: the ONE checked picture of the whole system. Front
  // view, as if facing the child. Every body shot is an edit of it.
  {
    id: 'master',
    tag: '00-master',
    asset: true,
    ref: BODY,
    // (worded without "child", "skull", "skeleton" or "inside him": the
    // image checker refused that mix for the nervous master)
    frame:
      'Keep the reference picture: the same cartoon character, the same pose with both arms out and down, the same ' +
      'frosted-glass look, the same blue shorts, the same framing and the same warm cream background. Take out the ' +
      'heart and all the red and dark tubes. Draw his bones in their place, as a simple, tidy and correct map — ' +
      'chunky rounded shapes, NOT a realistic medical drawing: ' +
      '(1) HEAD: completely normal — the normal face and the normal hair, with no bones drawn in the head. ' +
      '(2) BACKBONE: a column of small rounded blocks, stacked like beads on a string, runs from the bottom of the ' +
      'head straight down the middle of the neck and the middle of the torso to the hips. ' +
      '(3) RIBS: a rounded rib cage in the chest — one short flat bone down the middle of the chest, with six ' +
      'pairs of curved ribs wrapping round from the backbone to it, like a little barrel, the same on both sides, ' +
      'with gaps between the ribs. ' +
      '(4) SHOULDERS AND ARMS, the same on both sides: a thin collarbone from the top of the chest bone out to each ' +
      'shoulder; exactly ONE bone in each upper arm, from shoulder to elbow; exactly TWO thinner bones side by side ' +
      'in each forearm, from elbow to wrist; a small cluster of tiny bones in each hand, with a row of little bones ' +
      'in every finger. ' +
      '(5) HIPS: one wide, rounded hip bone shaped like a shallow bowl at the bottom of the backbone, showing ' +
      'softly through the blue shorts. ' +
      '(6) LEGS, the same on both sides: exactly ONE long, thick bone in each thigh, from hip to knee; a small round ' +
      'kneecap at each knee; exactly TWO bones side by side in each lower leg, from knee to ankle, one thick and ' +
      'one thin; small bones in each foot, with a row of little bones in every toe. ' +
      `All the bones are ${BONE}. Every bone meets the next one at a rounded joint; nothing floats loose. No heart, ` +
      'no tubes, no brain, no wires, no other organs.',
  },
  {
    id: 'floppy',
    tag: '01-floppy',
    ref: PARK,
    narration: 'This bunny is soft and floppy. It can’t stand up! But you can. Do you know why? You have bones!',
    frame:
      `${KID}, standing in the same sunny green park as the reference image, full body from head to toes, facing ` +
      'the camera. With one hand he holds up a soft, floppy rag-doll bunny by one paw, out to his side: the toy ' +
      'hangs completely limp, its long ears, arms and legs drooping straight down. He himself stands up very ' +
      'straight and tall, with a proud, playful smile, looking at the camera. His body is completely normal — ' +
      'nothing see-through. Only the boy, no other people.',
    motion:
      'The child gives the floppy toy bunny a little jiggle; its long ears, arms and legs flop and dangle loosely. ' +
      'Then he stands up even taller, puffs out his chest and smiles proudly at the camera. Very slow, gentle ' +
      'camera push-in.',
  },
  {
    id: 'skeleton',
    tag: '02-skeleton',
    ref: 'master',
    narration: 'Under your skin, you have lots and lots of bones. All together, they are called your skeleton.',
    frame:
      'Keep the reference picture exactly: the same character, the same pose, the same bones in the same places, ' +
      'the same framing and the same colors. Change only this: the bones are the star, a little brighter, with a ' +
      'soft warm glow around them. He has a happy, open smile.',
    motion:
      'A soft, warm shimmer of light sweeps slowly down over the bones, from the neck to the toes. The child stands ' +
      'still, smiling, and wiggles his fingers a little. The bones keep their shape and stay where they are. Fixed ' +
      'camera, no zoom.',
  },
  {
    id: 'hard',
    tag: '03-hard',
    ref: 'master',
    narration: 'Bones are hard and strong. Knock, knock! They hold you up, so you can stand, and sit, and walk.',
    frame:
      'Keep the character, the frosted-glass look, the bones and the background of the reference picture. Change ' +
      'the framing and the pose: frame him from the waist up, strict front view. ONE hand is a soft fist with its ' +
      'knuckles resting on the flat bone in the middle of his chest, as if knocking on a door; that elbow is bent ' +
      'and points out to the side. His other arm hangs relaxed at his side. Only that one arm is in front of his ' +
      'body; the two arms never cross. Everything else about the bones stays as in the reference. He looks at the ' +
      'camera with a curious, delighted smile.',
    // v1 knocked on a forearm held across the chest: both arms tangled
    motion:
      'The child knocks on the bone in the middle of his chest with his fist, twice — knock, knock — and each ' +
      'knock makes a tiny soft white flash on the bone. The bones stay hard and do not bend. Then he lowers his ' +
      'hand, stands up tall and grins at the camera. Fixed camera, no zoom.',
  },
  {
    id: 'helmet',
    tag: '04-helmet',
    ref: HEAD,
    narration: 'Some bones keep you safe. The bone in your head is like a helmet. It protects your brain.',
    frame:
      'Keep the reference picture: the same close-up of the same cartoon character, the same soft pink brain in the ' +
      'softly translucent top of his head, the same faint outline of his black hair, the same framing and ' +
      'background. Take out the golden cable. Add only this: a smooth, rounded dome of bone covers the whole top ' +
      'of his head, like a bicycle helmet — from just above the eyebrows, up over the top of the head and down to ' +
      'the tops of the ears. The dome IS the top of his head and follows its natural round outline exactly: it is ' +
      'not a hat — no brim, no rim sticking out, flush with the forehead and the temples. The dome is CLOSED over ' +
      'the top, so the brain is covered, never open to the air. The ' +
      'dome is softly translucent, like milky frosted glass, so the pink brain shows through it, sitting snug ' +
      `inside; its thick edge, just above the eyebrows, is solid and ${BONE}. The face — eyebrows, eyes, nose, ` +
      'mouth, cheeks and ears — stays a completely normal cartoon face. He looks at the camera with a calm, happy ' +
      'smile.',
    motion:
      'A soft, warm shimmer of light runs once over the bone dome, like a shield lighting up. The brain ' +
      'inside glows gently. The child smiles and gives a small, happy nod. Very slow, gentle camera push-in.',
  },
  {
    id: 'ribs',
    tag: '05-ribs',
    ref: 'master',
    narration: 'Your ribs are like a cage. They hug your heart and your lungs, and keep them safe.',
    frame:
      'Keep the character, the frosted-glass look, the bones and the background of the reference picture. Change ' +
      'the framing: a close-up of his chest, from the chin down to the waist, strict front view, so the rib cage ' +
      'is big and fills the picture. Add only this, BEHIND the ribs, inside the cage: one glossy red heart about ' +
      'the size of his fist, with a rounded real-heart shape (NOT a valentine heart), in the middle of the chest, ' +
      'slightly toward the right side of the picture; and two soft, pale-pink lungs, one on each side of the ' +
      'heart. The curved ribs and the flat chest bone are in FRONT of the heart and lungs, like the bars of a ' +
      'cage, with the heart and lungs showing through the gaps. The backbone is behind them. His arms hang at his ' +
      'sides.',
    motion:
      'The two lungs slowly swell and shrink as he breathes, and the rib cage rises and falls a little with them. ' +
      'The heart beats softly and steadily. The ribs stay in front of the heart and lungs the whole time. Fixed ' +
      'camera, no zoom.',
  },
  {
    id: 'spine',
    tag: '06-spine',
    ref: 'master',
    seconds: 8,
    narration: 'Down the middle of your back is your backbone. It is made of many little bones, so you can bend, and twist.',
    frame:
      'Keep the reference picture: the same character, the same frosted-glass look, the same bones, the same ' +
      'framing and the same background. Change only the arms: both hands rest on his hips, elbows out to the ' +
      'sides; the arm bones follow the arms. He stands straight. The backbone — the column of small rounded ' +
      'blocks down the middle — has a soft, warm glow.',
    endFrame:
      'Keep this picture exactly the same: same character, same bones, same hands on hips, same framing and ' +
      'background, feet in the same place. Change only this: he bends his upper body sideways toward the right ' +
      'side of the picture, from the waist. The backbone curves smoothly with him, like a string of beads, and the ' +
      'rib cage and the head tilt with it. He smiles.',
    motion:
      'With his hands on his hips and his feet still, the child slowly bends his upper body to one side, comes ' +
      'back up straight, and slowly bends to the other side. The glowing backbone curves smoothly like a string of ' +
      'beads each time, and the rib cage tilts with it. The little bones of the backbone stay the same size. Fixed ' +
      'camera, no zoom.',
  },
  {
    id: 'joints',
    tag: '07-joints',
    ref: 'master',
    seconds: 8,
    narration: 'Where two bones meet, there is a joint. Your elbows and your knees bend, just like a door hinge.',
    frame:
      'Keep the character, the frosted-glass look, the bones and the background of the reference picture. Change ' +
      'the framing and the pose: frame him from the waist up, strict front view. His arm on the LEFT side of the ' +
      'picture is held straight out to the side at shoulder height, palm up. His other arm hangs relaxed. The ' +
      'stretched arm clearly shows ONE bone from shoulder to elbow and TWO bones from elbow to wrist. The elbow, ' +
      'where they meet, has a small, soft, warm golden glow. He looks at that elbow with curious eyes.',
    endFrame:
      'Keep this picture exactly the same: same character, same bones, same framing and background, the upper arm ' +
      'still straight out to the side at shoulder height. Change only this: the elbow of that arm is bent, so the ' +
      'forearm points straight up and the hand is up beside his head. The two forearm bones point up with the ' +
      'forearm, still the same length. The elbow still glows softly. He smiles at the camera.',
    motion:
      'The child slowly bends his elbow, lifting his forearm until the hand is up beside his head, then slowly ' +
      'straightens the arm again, and bends it once more. Only the elbow bends, like a hinge; it glows softly each ' +
      'time. The bones stay straight, hard and the same length. Fixed camera, no zoom.',
  },
  {
    id: 'lift',
    tag: '08-lift',
    ref: 'master',
    seconds: 8,
    narration: 'But bones cannot move by themselves. Your muscles pull on them. Pull! And up goes the block!',
    frame:
      'Keep the character, the frosted-glass look, the bones and the background of the reference picture, full ' +
      'body, strict front view. Change the pose: he stands with his feet apart and holds one big, light toy ' +
      'building block — a bright blue foam cube about as big as his head — with both hands, low in front of his ' +
      'hips, with both arms straight down. Add only this: in each upper arm, lying along the front of the arm ' +
      `bone from the shoulder to just below the elbow, is ${MUSCLE}, long and thin. He looks down at the block ` +
      'with a determined little smile.',
    endFrame:
      'Keep this picture exactly the same: same character, same bones, same blue block, same framing and ' +
      'background, feet in the same place. Change only this: the block is higher. He holds the same block in ' +
      'front of his chest, just below his chin, hiding the rib cage. He has exactly TWO arms, the same two as ' +
      'before: each upper arm still hangs down beside his body from the shoulder, each elbow is bent, each forearm ' +
      'points forward and a little up, and each hand is flat on a side of the block, gripping it. No arm is ' +
      'raised, no fists, no hands near his head, no strongman pose. The pink muscle on each upper arm is now ' +
      'shorter, rounder and plumper. He has a big, proud, open-mouthed smile.',
    // end v1 let go of the block and flexed; v2 kept the block AND flexed, with four arms
    motion:
      'The child lifts the blue block slowly from in front of his hips up to his chest, by bending both elbows. As ' +
      'he lifts, the pink muscle in each upper arm bunches up, getting shorter and plumper, pulling the forearm ' +
      'bones up. The block stays in his two hands and stops at his chest, below his chin — it never goes above ' +
      'his head. Then he smiles proudly at the camera. Fixed camera, no zoom.',
  },
  {
    id: 'grow',
    tag: '09-grow',
    ref: KITCHEN,
    narration: 'Your bones are growing, just like you! Milk, good food, sunshine and lots of play help them grow strong.',
    frame:
      `${KID}, sitting at the same kitchen table in the same bright sunny kitchen as the reference image, framed ` +
      'from the waist up, facing the camera. He sits on his chair BEHIND the table, exactly as in the reference: ' +
      'only his upper body shows above the table top, and his legs and feet are hidden under the table — no legs ' +
      'or feet anywhere in the picture. He holds a glass of milk with both hands, just lowered from his mouth, and has a little white milk ' +
      'moustache on his upper lip and a big happy grin. On the table are a small plate with a few slices of ' +
      'banana and a piece of cheese. Warm sunshine streams in through the window. His body is completely normal — ' +
      'nothing see-through. No apple. Only the boy, no other people.',
    motion:
      'The child takes a sip from his glass of milk, lowers the glass, and grins at the camera with a little white ' +
      'milk moustache. The sunshine through the window glows warmly. Very slow, gentle camera push-in.',
  },
  {
    id: 'outro',
    tag: '10-outro',
    ref: 'master',
    narration: 'That’s your skeletal system. Great job, bones!',
    frame:
      'Keep the reference picture: the same character, the same frosted-glass look, the same bones, the same ' +
      'colors and background. Change only this: frame him closer, from the knees up, with a big, proud, ' +
      'open-mouthed smile; both arms are raised and bent like a little strongman showing his muscles, fists up ' +
      'beside his head. The arm bones follow the raised arms: one bone in each upper arm, two in each forearm. ' +
      'All the bones glow softly.',
    motion:
      'The child holds his strongman pose, squeezes his fists proudly, and bounces happily on the spot. The bones ' +
      'glow a little brighter, then softer. Very slow, gentle camera push-in.',
  },
];
