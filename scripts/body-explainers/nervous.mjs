// Nervous system explainer: shot list (film order) and narration.
//
// One idea: your brain is the boss, and nerves are the wires that carry
// messages to it and back. Touch carries the story (a finger on an ice cube:
// message in → "cold!" → message out → the hand moves). The other senses get
// one shot only; how each one works is a lesson of its own.
import { KID } from './shared.mjs';

export const name = 'nervous-explainer';
// the lesson item's slug: the film is published under this name
export const slug = 'nervous-system';

// Pictures from the earlier films, so this one stars the same boy in the
// same see-through look (paths inside fal-creations/out/toddlearn-body).
const BODY = 'circulatory-explainer/00-master-frame-v1.png'; // see-through body, pose, warm backdrop
const KITCHEN = 'digestive-explainer/01-bite-frame-v3.png'; // the boy at the kitchen table
const ASLEEP = 'circulatory-explainer/08-sleep-frame-v2.png'; // asleep, heart glowing

// Worded the same way in every shot.
const BRAIN =
  'the brain: soft, rounded and pale pink, with a few gentle, puffy wrinkles and a faint line down the middle — ' +
  'cute and friendly, like a soft pink cloud, never realistic or wet';
const GOLD = 'warm golden yellow';
const SPARK = 'a small, bright, friendly white-gold sparkle of light, like a tiny shooting star';

export const shots = [
  // Not a film shot: the ONE checked picture of the whole system. Front
  // view, as if facing the child. Every body shot is an edit of it.
  {
    id: 'master',
    tag: '00-master',
    asset: true,
    ref: BODY,
    // (worded without "child", "see-through shorts", "skull" or "inside
    // him": the image checker refused the first wording)
    frame:
      'Keep the reference picture: the same cartoon character, the same pose with both arms out and down, the same ' +
      'frosted-glass look, the same blue shorts, the same framing and the same warm cream background. Take out the ' +
      'heart and all the red and dark tubes. Draw the nervous system in their place, as a simple, tidy map — a few ' +
      'smooth lines, NOT a dense realistic web: ' +
      '(1) BRAIN: the top of the head, above the eyebrows, is softly translucent like frosted glass (the hair there ' +
      `is only a faint outline) and shows ${BRAIN}. It fills the top of the head. The face — eyebrows, eyes, nose, ` +
      'mouth, cheeks and ears — stays completely normal. ' +
      `(2) MAIN CABLE: one thick, smooth, ${GOLD} cable leaves the bottom of the brain and runs straight down the ` +
      'middle of the neck and the middle of the torso, ending just below the waistband of the shorts. ' +
      `(3) NERVES, thin ${GOLD} wires, the same on both sides: from the main cable at the bottom of the neck, one ` +
      'wire goes across each shoulder and all the way down each arm into the hand, with a fine twig into each ' +
      'finger; from the bottom end of the main cable, one wire goes all the way down each leg into the foot, with ' +
      'fine twigs into the toes; and four or five pairs of short twigs branch off the main cable across the chest ' +
      'and tummy, like the teeth of a comb. Every wire joins the main cable, and the main cable joins the brain. ' +
      'The cable and wires glow very softly. No other organs in the picture.',
  },
  {
    id: 'touch',
    tag: '01-touch',
    ref: KITCHEN,
    narration: 'Brr! That ice cube is cold! But how do you know it is cold? Your brain told you!',
    frame:
      `${KID}, sitting at the same kitchen table in the same bright sunny kitchen as the reference image, framed ` +
      'from the waist up, facing the camera. He sits on his chair BEHIND the table, exactly as in the reference: ' +
      'only his upper body shows above the table top, and his legs and feet are hidden under the table. On the ' +
      'table in front of him is a small blue plate with one small, clear, shiny ice cube on it — an ordinary ice ' +
      'cube from a drink, smaller than his fist. He is touching the top of the ice cube with the tip of one pointing finger, his ' +
      'shoulders hunched in a happy little shiver, eyes wide, mouth in a surprised, delighted "ooh". A faint cool ' +
      'mist curls off the ice cube. No apple, no other food. Only the boy, no other people.',
    motion:
      'The child touches the top of the ice cube with one fingertip, gives a happy little shiver with hunched ' +
      'shoulders, pulls his hand back and giggles, then looks at the camera with wide, curious eyes. A faint cool ' +
      'mist drifts off the ice cube. Very slow, gentle camera push-in.',
  },
  {
    id: 'brain',
    tag: '02-brain',
    ref: 'master',
    narration: 'Your brain lives inside your head. It is the boss of your whole body. It thinks, it feels, and it remembers.',
    frame:
      'Keep the reference picture: the same child, the same see-through look, the same brain, the same golden cable ' +
      'and the same background. Change only the framing: a big close-up of his head and shoulders, strict front ' +
      'view, the head large and centered, so the brain inside the see-through top of his head is big and clear. The ' +
      'golden cable goes down from the bottom of the brain through the neck. The brain has a soft, warm glow. He ' +
      'looks at the camera with a calm, happy smile.',
    motion:
      'The brain glows softly, and tiny sparkles of light twinkle across it here and there, like little ideas. The ' +
      'child blinks, looks up as if thinking, then smiles at the camera. Very slow, gentle camera push-in.',
  },
  {
    id: 'nerves',
    tag: '03-nerves',
    ref: 'master',
    seconds: 8,
    narration: 'Long, thin wires called nerves run from your brain, down your back, and out to your fingers and your toes.',
    frame:
      'Keep the reference picture exactly: the same child, the same pose, the same brain, cable and wires in the ' +
      'same places, the same framing and the same colors. Change only this: the golden cable and wires are the ' +
      'star, a little brighter, with a soft warm glow along their whole length.',
    endFrame:
      'Keep this picture exactly the same: same child, same pose, same brain, same cable and wires, same colors and ' +
      'background. Change only one thing: the tips of all his fingers and all his toes now have a small, soft, ' +
      'golden glow.',
    motion:
      'A soft golden shimmer of light travels from the brain down the thick cable in the middle of the body, then ' +
      'out along the thin wires, always staying inside them: along both arms to the fingertips and down both legs ' +
      'to the toes. When it arrives, the fingertips and toes begin to glow softly. The child stands still, smiling. ' +
      'Fixed camera, no zoom.',
  },
  {
    id: 'signal',
    tag: '04-signal',
    ref: 'master',
    seconds: 8,
    narration: 'When your finger touches the ice, a tiny message zooms up your arm, all the way to your brain. Zoom!',
    frame:
      'Keep the child, the see-through look, the brain, the golden cable and wires and the background of the ' +
      'reference picture. Change the framing and the pose: frame him from the waist up, strict front view. His arm ' +
      'on the LEFT side of the picture is stretched straight out to the side, and the tip of its pointing finger ' +
      'rests on top of a small, clear, shiny ice cube — an ordinary ice cube from a drink, smaller than his fist — ' +
      'that sits on a small blue plate on a small round white table at the left edge of the picture. His other arm hangs relaxed. The golden wire inside the stretched arm runs unbroken from that ' +
      'fingertip, along the whole arm to the shoulder, and joins the thick golden cable at the bottom of the neck, ' +
      `which goes up into the brain. Exactly at the fingertip touching the ice sits ${SPARK} — only at the ` +
      'fingertip, with no trail and nothing flying through the air. The brain is calm, ' +
      'without a glow. He looks toward the ice cube with curious eyes.',
    endFrame:
      'Keep this picture exactly the same: same child, same pose with the finger on the ice cube, same brain, same ' +
      'wires, same colors and background. Change only this: the sparkle is no longer at the fingertip. The brain ' +
      'now glows brightly with warm golden light and a few little sparkles on it, and his eyes are wide with a ' +
      'surprised, delighted "ooh".',
    // take 1: the sparkle wandered into the other arm and the legs, popped
    // up above the head, and he ended with drooping eyes
    motion:
      'First, in the first four seconds: ONE bright sparkle leaves the fingertip and travels INSIDE the golden wire ' +
      'of the stretched arm, by the shortest way: along the forearm, along the upper arm, to the shoulder, into the ' +
      'bottom of the neck, and straight up the neck into the brain. Then, for the rest of the shot: the brain is lit ' +
      'up with a warm golden glow and little sparkles, and the child’s eyes are wide open in happy surprise, his ' +
      'mouth in a delighted "ooh". There is only ever one sparkle. Nothing travels into the other arm, the tummy or ' +
      'the legs, and nothing floats outside the body or above the head. His eyes stay open and his finger stays on ' +
      'the ice cube. Fixed camera, no zoom.',
  },
  {
    id: 'think',
    tag: '05-think',
    ref: 'brain',
    narration: 'Your brain gets the message and thinks: cold! That is how you feel things.',
    frame:
      'Keep the reference picture exactly: the same close-up of the child, the same brain, the same framing and ' +
      'background. Change only this: the brain glows brightly with warm golden light and little sparkles, and his ' +
      'face shows a surprised, delighted "ooh", eyes wide. Move him a little to the left, so there is empty space ' +
      'beside his head at the upper right.',
    endFrame:
      'Keep this picture exactly the same: same child, same glowing brain, same framing and background. Change only ' +
      'this: in the empty space at the upper right there is now a big, fluffy white thought bubble, joined to his ' +
      'head by three small round puffs. Inside the bubble is a picture of one clear, shiny ice cube with a little ' +
      'pale-blue snowflake beside it. He smiles with a happy little shiver. No words, no letters.',
    motion:
      'The brain flashes with warm golden light and little sparkles. Then three small round white puffs pop up ' +
      'beside his head, one after another, and a big fluffy white thought bubble pops open at the upper right, with ' +
      'a shiny ice cube and a snowflake inside it. The child gives a happy little shiver and smiles. Fixed camera, ' +
      'no zoom.',
  },
  {
    id: 'reply',
    tag: '06-reply',
    ref: 'signal',
    seconds: 8,
    narration: 'Then your brain sends a message back: move your hand! And your muscles do just what it says.',
    frame:
      'Keep the reference picture exactly: the same child, the same pose with the finger on the ice cube, the same ' +
      'brain, wires, table, framing and background. Change only this: there is no sparkle at the fingertip. The ' +
      `brain glows with warm golden light, and ${SPARK} sits at the bottom of the neck, at the spot where the wire ` +
      'to the stretched arm leaves the thick golden cable. No sparkle and no bright line on the face or forehead. ' +
      'He smiles, eyes open.',
    endFrame:
      'Keep this picture exactly the same: same child, same brain, same wires, same ice cube on the same table, ' +
      'same colors and background. Change only his arm on the left side of the picture: it is no longer stretched ' +
      'out. The elbow is bent and the hand is pulled back and held up beside his shoulder, fingers spread, well ' +
      'away from the ice cube. The golden wire inside the arm follows the bent arm. The sparkle is gone and that ' +
      'hand has a soft golden glow. He laughs happily.',
    // take 1: the sparkle began as a bright streak down the middle of his
    // face, with drooping eyes, then ran down the tummy and legs as well
    motion:
      'First, in the first three seconds: the brain gives one bright golden flash, and ONE bright sparkle travels ' +
      'from the bottom of the neck along INSIDE the golden wire of the stretched arm only — across the shoulder, ' +
      'along the upper arm and the forearm — to the hand. Then: the moment it reaches the hand, the hand glows ' +
      'softly and the child lifts his finger off the ice cube, bends his elbow and pulls his hand back up beside ' +
      'his shoulder, wiggling his fingers and laughing. There is only ever one sparkle. Nothing travels down the ' +
      'tummy, the legs or the other arm, and no light crosses his face. His eyes stay open and happy the whole ' +
      'time. The ice cube stays on the table. Fixed camera, no zoom.',
  },
  {
    id: 'senses',
    tag: '07-senses',
    ref: 'brain',
    seconds: 9,
    narration: 'Your eyes, your ears, your nose and your tongue send messages too. That is how you see, hear, smell and taste.',
    frame:
      'Keep the reference picture: the same close-up of the child, the same brain in the see-through top of his ' +
      'head, the same framing and background. Change only this: he sticks the tip of his tongue out with a playful ' +
      `smile. Six separate thin ${GOLD} threads of light shine softly through his skin: one from each eye, one ` +
      'from each ear, one from the tip of his nose and one from his tongue. EVERY thread goes UP and ends in the ' +
      'brain, with a tiny sparkle where it starts. The threads never join each other and never touch the floating ' +
      'things. ' +
      'Around his head float four small things, one near each sense: a little blue butterfly in front of his eyes ' +
      '(upper left), a small golden bell beside one ear, a pink flower just under his nose, and a red strawberry ' +
      'beside his tongue. Clean and uncluttered.',
    motion:
      'One after another, a tiny sparkle travels up a golden thread into the brain: first from the eyes as the ' +
      'butterfly flutters, then from the ear as the little bell swings, then from the nose as the flower bobs, then ' +
      'from the tongue beside the strawberry. Each time a sparkle arrives, the brain gives a soft golden flash. The ' +
      'child smiles and blinks. Fixed camera, no zoom.',
  },
  {
    id: 'fast',
    tag: '08-fast',
    ref: 'master',
    narration: 'And it all happens super fast. Faster than you can blink!',
    frame:
      'Keep the reference picture exactly: the same child, the same pose, the same brain, cable and wires in the ' +
      'same places, the same framing and the same colors. Change only this: the brain glows warmly, and six or ' +
      'seven small bright white-gold sparkles sit at different places along the golden wires — in both arms, in ' +
      'both legs and on the thick cable — each with a tiny streak of light behind it, as if racing. He has a big, ' +
      'excited, open-mouthed smile.',
    motion:
      'Many small bright sparkles race along INSIDE the golden wires, very fast, in both directions: from the ' +
      'fingertips and toes up to the brain, and from the brain back out to the hands and feet, again and again, ' +
      'like tiny shooting stars. The brain twinkles each time one arrives. The child gives one quick blink and ' +
      'laughs. Fixed camera, no zoom.',
  },
  {
    id: 'sleep',
    tag: '09-sleep',
    ref: [ASLEEP, 'brain'],
    narration: 'Your brain never stops. Even when you sleep, it keeps your heart beating and your lungs breathing.',
    frame:
      'Keep the FIRST reference picture exactly: the same child asleep in the same bed, the same blanket, teddy ' +
      'bear, night-light and room, and the same softly glowing heart in his chest. Change only this: the top of his ' +
      'head is softly see-through and shows his brain, exactly like the brain in the SECOND reference picture, with ' +
      `a gentle, sleepy glow. One thin ${GOLD} wire runs from the bottom of the brain down through the neck to the ` +
      'heart. His eyes stay closed, with the same peaceful smile.',
    motion:
      'The child sleeps peacefully, his chest rising and falling slowly as he breathes. The brain glows softly, and ' +
      'every few seconds a tiny sparkle slides gently down the golden wire from the brain to the heart, and the ' +
      'heart gives a slow, calm beat. Nothing else moves. Very slow, gentle camera push-in.',
  },
  {
    id: 'outro',
    tag: '10-outro',
    ref: 'master',
    narration: 'That’s your nervous system. Great job, brain!',
    frame:
      'Keep the reference picture: the same child, the same see-through body, the same brain, golden cable and ' +
      'wires, the same colors and background. Change only this: frame him closer, from the knees up, with a big, ' +
      'proud, open-mouthed smile; both hands are raised and each pointing finger points at his own head, at the ' +
      'brain, from either side. The wires inside the raised arms follow the arms. The brain and all the wires glow ' +
      'softly.',
    motion:
      'The child taps the sides of his head gently with both pointing fingers, smiling proudly, and bounces happily ' +
      'on the spot. The brain twinkles and the golden wires glow a little brighter, then softer. Very slow, gentle ' +
      'camera push-in.',
  },
];
