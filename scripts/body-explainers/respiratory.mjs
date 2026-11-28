// Respiratory system explainer: shot list (film order) and narration.
//
// The story, in toddler words: you blow air out — where did it come from? →
// air goes in through your nose → down a tube called the windpipe → into
// your two lungs, which fill like balloons → the tubes branch like a tree
// down to tiny balloons → there the fresh air hops into your blood → the
// used air comes back out → run, and you breathe faster.
import { KID, INSIDE_BG } from './shared.mjs';

export const name = 'respiratory-explainer';
// the lesson item's slug: the film is published under this name
export const slug = 'respiratory-system';

// Pictures from the earlier films, so this one stars the same boy with the
// same organs (paths inside fal-creations/out/toddlearn-body).
const CHEST = 'circulatory-explainer/00-chest-frame-v2.png'; // lungs close-up, checked (its heart is taken out)
const SEE_THROUGH = 'circulatory-explainer/02-fist-frame-v1.png'; // waist up, see-through chest
const PARK = 'digestive-explainer/06-energy-frame-v2.png'; // full body in the park
const PROFILE = 'digestive-explainer/02-chew-frame-v2.png'; // head in side profile, cutaway
const CELLS = 'circulatory-explainer/05-deliver-frame-v1.png'; // blood cells in a glass tube

// Worded the same way in every shot. Fresh air is blue. Blood colours are
// the heart film's: dark when tired, bright when it has picked up air.
const AIR = 'soft sky-blue swirls of air with tiny white sparkles';
// Seconds into the side-view breathe-in clip (02-nose take 1) where the air
// has filled the nose and is about to enter the windpipe
const NOSE_PAUSE = 2;
// (the used air was once a lilac-grey mist — it read as smoke; see the `out` shot)
const RED = 'bright cherry red';
const DARK = 'dark plum (a deep, dark purplish wine-red)';
const PIPE = 'a smooth, pale cream-pink tube with soft rings around it, like a bendy drinking straw';

const WARM_BG = 'The background is the same soft, warm cream gradient as in the reference. ';

export const shots = [
  // Not film shots: the two checked pictures every organ shot is an edit of.
  // `master` = the close-up of windpipe and lungs; `body` = the boy, waist
  // up, with them inside his chest. NO HEART in any picture of this film
  // (the user's ask: breathing only) — v1 of these pictures had one.
  {
    id: 'master',
    tag: '00-master',
    asset: true,
    ref: CHEST,
    frame:
      'Keep the two lungs of the reference picture in the same places, the same shapes and the same glossy style: ' +
      'organs only, floating — no character, no body, no skin. Front view. Change the picture so that BREATHING is ' +
      'the only subject. Make every part clear and correct: ' +
      `(1) WINDPIPE: ${PIPE}. It comes straight down from the top edge of the picture, exactly in the centre, and ` +
      'it is the widest tube in the picture. Between the tops of the two lungs it splits in two like an upside-down ' +
      'letter Y: one branch goes into the lung on the left, the other into the lung on the right. ' +
      '(2) LUNGS: the same two big, soft, pale-pink lungs, one on each side, now a little see-through like frosted ' +
      'pink glass, so that inside each lung we can see its windpipe branch dividing again and again into thinner ' +
      'cream-pink branches, like an upside-down tree. ' +
      '(3) NO HEART: take the heart and every blood tube out of the picture. Between the two lungs there is only ' +
      'the windpipe fork and the plain background; nothing red anywhere. ' +
      'The windpipe connects ONLY to the two lungs. Nothing else in the picture: no heart, no blood tubes, no ribs, ' +
      'no stomach, no other organs. ' + INSIDE_BG,
  },
  {
    id: 'body',
    tag: '00-body',
    asset: true,
    ref: [SEE_THROUGH, 'master'],
    frame:
      'The same toddler boy as in the FIRST reference picture, in the same see-through style and on the same warm ' +
      'background, framed from the waist up, strict front view. Both arms hang relaxed at his sides — no raised ' +
      'fist. Calm happy smile, mouth closed, looking at the camera. His head and face are normal. His neck and ' +
      'chest are see-through and show ONLY the parts he breathes with, exactly as in the SECOND reference picture: ' +
      `(1) the WINDPIPE, ${PIPE}, running from just under his chin straight down the middle of his neck and ` +
      'splitting in two at the top of his chest; (2) his two soft, pale-pink LUNGS, one on each side of his chest, ' +
      'filling it from the collarbones down to the bottom of the ribs, with fine cream-pink branches inside. There ' +
      'is NO heart and there are NO blood tubes in this picture: nothing red inside his chest. No stomach, no ' +
      'intestines, no bones. ' + WARM_BG,
  },
  {
    id: 'bubbles',
    tag: '01-bubbles',
    ref: PARK,
    narration: 'Whoosh! Look at all those bubbles! Where did that air come from? It came from inside you!',
    frame:
      `${KID}, standing on the green grass in the same sunny park as the reference image, seen from the front and ` +
      'a little from the side, framed from the waist up. He holds a small round bubble wand on a stick up in front ' +
      'of his lips with one hand and is blowing through it, cheeks puffed, lips in a little "o", eyes wide with ' +
      'delight. A stream of shiny, rainbow-tinted soap bubbles of different sizes floats away from the wand across ' +
      'the picture. His other arm hangs relaxed. Soft blurred trees and blue sky behind. Only the boy, no other ' +
      'people, no bottle.',
    motion:
      'The child blows gently through the bubble wand, cheeks puffed. A stream of shiny soap bubbles pours out of ' +
      'the wand and drifts slowly away across the picture, wobbling and catching the sunlight. He stops blowing and ' +
      'watches the bubbles with a big delighted smile. Very slow, gentle camera push-in.',
  },
  {
    id: 'nose',
    tag: '02-nose',
    // v1 was a close-up of the head only; the user asked for the whole side
    // view, down to the lungs, so the air's whole way in is on screen
    ref: [PROFILE, 'master'],
    seconds: 8,
    // The user liked how the air flows in smooth lines all the way into the
    // lung in take 1, and asked for this ONE clip to carry the windpipe line
    // too, paused "just before air enters the windpipe" while the nose is
    // talked about. So it plays in two parts: 0–2 s here (then holds), the
    // nose-hairs close-up, and 2 s–end under the windpipe line.
    clip: { to: NOSE_PAUSE },
    // The clip in the cut is take 2, which is NOT generated: it is take 1
    // with the dust specks in the nose painted out frame by frame
    // (02-nose-clean-dust.py in the output folder). The user: the specks
    // "remain throughout" and the close-up already shows the dust — "it's
    // more about the air going in". The picture prompt below still draws
    // them; drop that sentence before ever redrawing this frame.
    // Take 3 goes one step further, also by hand (02-nose-contain-air.py):
    // the user asked that the air "stays inside the trachea and lungs" —
    // in the generated take it also ran down strips beside the windpipe and
    // down the chest lining before the lung filled.
    // one recording, cut in two at the pause after "nose." — the second half
    // is the `hairs` line (the whole reading is kept as 02-nose-voice-full.mp3)
    narration: 'Breathe in! Air goes in through your nose.',
    frame:
      'The same cartoon boy as in the FIRST reference picture, in the same style, seen in strict side profile ' +
      'facing LEFT, now framed much wider: his whole head, his neck and his chest down to the bottom of his ribs, ' +
      'standing straight. His near arm is swung back behind him, out of the way of his chest. His mouth is closed ' +
      'in a small smile and his eye is open and happy. His head is normal, with one clean cutaway window over his ' +
      'nose and cheek that shows a smooth, soft pink, hollow air passage: it starts at the nostril, runs back ' +
      'behind the nose and curves down behind the mouth into the neck. From the chin down, his neck and chest are ' +
      'smooth see-through frosted glass with a pale warm peach tint, and inside them the same passage carries on ' +
      `as his WINDPIPE — ${PIPE}, as in the SECOND reference picture — straight down the front part of the neck ` +
      'into the chest, where it leads into ONE big, soft, pale-pink lung seen from the side, filling the chest, ' +
      'with fine cream-pink branches inside it. It is one single, unbroken path: nostril, passage behind the nose, ' +
      `windpipe, lung. In front of his nose float ${AIR}, streaming gently toward the nostril. Just inside the ` +
      'nostril, three or four tiny grey specks of dust sit caught on the soft pink wall. No heart, no blood tubes, ' +
      'no stomach, no teeth and no food in this picture. ' + INSIDE_BG,
    motion:
      'The boy breathes in slowly through his nose. First, in the first four seconds: the soft sky-blue air flows ' +
      'calmly from in front of his face into the nostril and along the pink passage behind the nose. Then: it ' +
      'flows on down the windpipe in his neck, always inside the tube, and into the lung, which fills with a soft ' +
      'blue glow and swells a little. The tiny grey dust specks stay stuck near the nostril and never travel ' +
      'further. He stays in side profile, mouth closed. Fixed camera, no zoom.',
  },
  {
    id: 'hairs',
    tag: '02b-hairs',
    // the user: "we can show fine hairs in the nose and that holding the
    // dust back". Drawn from the paused side-view frame, so it reads as
    // looking closer at the same picture.
    refImage: 'respiratory-explainer/02-nose-pause.png',
    narration: 'Your nose warms the air, and catches the dust.',
    frame:
      'An extreme close-up of the nose of the boy in the reference picture: exactly the same side view facing ' +
      'LEFT, the same 3D cartoon style, the same skin colour, the same cutaway and the same deep blue background. ' +
      'Only the tip of his nose, his nostril and the first part of the smooth, soft pink air passage inside his ' +
      'nose are in the picture, very large, filling it; his eye, his mouth and his ear are out of the picture. ' +
      'Just inside the nostril stands a little row of fine, soft, short hairs, like tiny eyelashes — some growing ' +
      'up from the floor of the passage and some hanging down from its roof — neat, clean and friendly. The same ' +
      'soft sky-blue ribbons of air with tiny white sparkles flow in from the left, through the nostril and on ' +
      'between the hairs, in smooth, calm, parallel lines. Outside the nose, on the left, a few small, round, ' +
      'grey-brown specks of dust float in the air. Four or five of the same dust specks are stuck on the little ' +
      'hairs. To the right of the hairs, deeper inside the pink passage, the air is clean: only blue ribbons and ' +
      'white sparkles, no dust at all. Nothing wet, slimy or yucky. No text and no labels.',
    motion:
      // take 1 ("small dust specks drift in… each one sticks") kept sending
      // new specks in, and after 2.3 s some sailed on past the hairs; with
      // the wording below, take 2 keeps every speck on the hairs for all 5 s
      'The soft sky-blue ribbons of air keep flowing smoothly and calmly from left to right: in through the ' +
      'nostril, between the fine little hairs and on into the pink passage, in smooth parallel lines, with no ' +
      'turbulence and no clouds. The hairs are a wall for dust. Exactly three small grey-brown dust specks drift ' +
      'in slowly with the air from the left, one after another; each one stops at the very FIRST hair it touches, ' +
      'at the left edge of the hairs, sticks there and never moves again. The dust specks already stuck on the ' +
      'hairs stay exactly where they are. For the whole shot there is NEVER a dust speck to the right of the ' +
      'hairs: the pink passage on the right holds only clean blue air and tiny white sparkles. The hairs sway ' +
      'very gently. The nose and the passage keep their shape. Fixed camera, no zoom.',
  },
  {
    id: 'windpipe',
    tag: '03-windpipe',
    // The front-view clip (takes 1–2, from the pictures below) is retired:
    // the user asked to let it go — the side view shows the air's way down
    // better, and the front view "shows diffusion around lungs". This line
    // now plays over the rest of the side-view clip.
    clip: { of: 'nose', from: NOSE_PAUSE },
    ref: 'body',
    seconds: 8,
    narration: 'Then the air slides down a tube in your neck. It is called your windpipe.',
    frame:
      // v1 had a curly cloud of air sitting under the chin; the user asked
      // for calm air going down inside the see-through neck instead. v2
      // ("a thin ribbon with a single gentle curl") replaced the windpipe
      // with a thin blue hook; v3 ("filled with a blue glow, like blue
      // water in a straw") made it a straight blue glass pipe, which the
      // user found weird — so: the tube stays cream and ringed, with only
      // wisps of air showing through it
      'Keep the reference picture exactly: the same boy, the same pose, the same windpipe and lungs in the same ' +
      'places, the same framing and the same colors. Do NOT darken or recolour anything. Change only this: the ' +
      'windpipe in his neck is the star. It stays exactly as it is in the reference — the same cream-pink colour, ' +
      'the same soft rings, the same width: do NOT turn it blue and do NOT turn it into glass. Only a few small, ' +
      'soft, pale sky-blue wisps of air with tiny white sparkles show through it, drifting gently downward INSIDE ' +
      'its upper half, like a little breath of mist seen through the rings. A faint, soft blue glow surrounds only ' +
      'that upper half. No curl, no hook, no cloud and no puff, and nothing under his chin or outside his neck. The ' +
      'lower half of the windpipe and the lungs have no glow yet.',
    endFrame:
      'Keep this picture exactly the same: same boy, same pose, same cream-pink ringed windpipe, same lungs, colors ' +
      'and background. Change only this: there are no blue wisps in his neck any more; instead both lungs are softly filled with a ' +
      'gentle sky-blue glow and tiny white sparkles, and they are a little bigger.',
    motion:
      // take 1 turned the whole windpipe into a solid blue pipe that ran on
      // down to the bottom of the lungs
      'The windpipe NEVER changes: it stays cream-pink with its rings, the same shape and size, for the whole shot ' +
      '— it never turns blue and never grows longer. Only the air moves. First, in the first five seconds: the ' +
      'small, soft, pale sky-blue wisps and tiny white sparkles drift slowly and calmly DOWN inside the windpipe, ' +
      'from under the chin, down the middle of the neck, to the place where the tube splits in two — gently, like ' +
      'mist, no turbulence, no clouds. Then: the wisps divide, half into each lung, and both lungs slowly fill with ' +
      'a soft pale-blue glow and swell a little. The air always stays inside the windpipe and the lungs; nothing ' +
      'glows on his face, on his arms or outside his body. The boy stands still, smiling, eyes open. Fixed camera, ' +
      'no zoom.',
  },
  {
    id: 'lungs',
    tag: '04-lungs',
    ref: 'body',
    narration: 'Your windpipe leads to your two lungs. They sit inside your chest, one on each side.',
    frame:
      'Keep the reference picture exactly: the same boy, the same windpipe and lungs in the same places, the ' +
      'same framing and the same colors. Do NOT darken or recolour anything. Change only this: the two lungs are ' +
      'the star, with a soft, fresh glow around them, and the boy looks down at his own chest with wide, curious ' +
      'eyes and a little smile. His arms still hang at his sides.',
    motion:
      // take 1: a golden light between the lungs, and a droopy, sad face
      // while he looked down
      'The two lungs gently swell and shrink as the boy breathes slowly. He tips his head down a little to peek at ' +
      'his own chest with wide, curious, happy eyes, then looks up at the camera with a big smile. He is cheerful ' +
      'the whole time: his eyes stay wide open and he never frowns or looks sleepy. No light, glow or new object ' +
      'appears between the lungs or anywhere in his chest. Fixed camera, no zoom.',
  },
  {
    id: 'balloons',
    tag: '05-balloons',
    ref: 'master',
    seconds: 9,
    narration:
      'Your lungs are like two soft balloons. Breathe in, and they fill up with air. Breathe out, and they get small again.',
    frame:
      'Keep the reference picture exactly: the same windpipe and lungs in the same places, the same framing ' +
      'and the same colors. Do NOT darken or recolour anything. Change only this: the two lungs are the star — ' +
      'small and relaxed, as they are just before a breath, with a faint sky-blue glow and a few tiny white ' +
      'sparkles of air inside them and inside the windpipe.',
    motion:
      // take 1 grew a pink stub of tube inside each lung as they swelled
      'First, in the first four seconds: soft sky-blue sparkles of air drift down the windpipe into both lungs, and ' +
      'the two lungs slowly swell up big and round, like two balloons filling with air. Then: the lungs slowly ' +
      'shrink back to their small size as the sparkles drift back up the windpipe and out through the top. The ' +
      'windpipe keeps its cream-pink colour and its rings. The branches inside the lungs stay exactly as they are; ' +
      'nothing new appears inside the lungs — no extra tubes, no stubs, no lumps. Fixed camera, no zoom.',
  },
  {
    id: 'tree',
    tag: '06-tree',
    ref: 'master',
    seconds: 8,
    narration: 'Inside your lungs, the tubes branch out like a tree. Smaller, and smaller, down to tiny little balloons.',
    frame:
      'A NEW picture in the same glossy 3D style and the same colours as the reference: a big close-up INSIDE one ' +
      'lung. The lung is like a soft room of pale, frosted pink glass that fills the whole picture. One cream-pink ' +
      'ringed tube, the same as the windpipe in the reference, comes in from the top centre and divides again and ' +
      'again, like the branches of an upside-down tree, each branch thinner than the one before, spreading out to ' +
      'fill the picture. Every thinnest twig ends in a little bunch of tiny, round, see-through pale-pink balloons, ' +
      'like a small bunch of grapes; there are about ten bunches. A faint sky-blue glow and tiny white sparkles of ' +
      'air sit inside the branches. No blood tubes in this picture. ' + INSIDE_BG,
    motion:
      'Soft sky-blue sparkles of air flow down from the top along the branches, always inside them, from the thick ' +
      'branch into the thinner ones and into the little bunches of tiny balloons. The tiny balloons gently swell as ' +
      'the air reaches them, glowing pale blue, then relax. Very slow, gentle camera push-in toward one bunch of ' +
      'tiny balloons.',
  },
  {
    id: 'swap',
    tag: '07-swap',
    ref: CELLS, // for the look, the cells and the two colours only
    seconds: 8,
    narration: 'There, the fresh air hops into your blood. And your blood carries it to every part of you.',
    frame:
      'A NEW picture in the same glossy 3D style and the same colours as the reference: an extreme close-up deep ' +
      'inside a lung. In the upper middle of the picture is ONE big, round, see-through pale-pink balloon — a tiny ' +
      'air bag — filled with a soft sky-blue glow and tiny white sparkles of air. Hugging the underside of the ' +
      'balloon is one wide, see-through tube, like clear glass with a faint red tint, that curves like a smile from ' +
      'the left edge of the picture, under the balloon, to the right edge. Inside the tube float about ten blood ' +
      'cells, all the same shape as in the reference: smooth, plump, round discs with a soft dimple, like tiny ' +
      `cushions — no faces, no eyes. On the LEFT half of the tube the cells are ${DARK} and carry nothing. Under the ` +
      'balloon, a few sky-blue sparkles are passing down through the balloon wall into the tube. On the RIGHT half ' +
      `of the tube the cells are ${RED} and each one carries a tiny glowing sky-blue sparkle. No heart in this ` +
      'picture.',
    motion:
      'The round blood cells drift slowly along inside the glass tube from left to right, tumbling gently, never ' +
      'leaving the tube. As each dark cell passes under the balloon, a tiny sky-blue sparkle hops down out of the ' +
      'balloon into it, and the cell turns bright cherry red. Dark cells keep arriving from the left; bright red ' +
      'cells carrying sparkles keep leaving on the right. The balloon glows softly. Fixed camera, no zoom.',
  },
  {
    id: 'out',
    tag: '08-out',
    // History of this shot:
    // - Frames v1–v2 filled the lungs with lilac-grey mist: on film it read
    //   as smoke that leaked into his chest and poured from his mouth (takes
    //   1–2); the user asked for a redo. Frame v3 / take 3 (front view, clean
    //   lilac glow) pooled bubbles under his chin.
    // - Takes 4–6 are NOT generated: the side-view breathe-in (02-nose takes
    //   1–3) played backwards, air leaving by the nose.
    //     ffmpeg -i 02-nose-take-3.mp4 -an -vf reverse 08-out-take-6.mp4
    // - Then the user asked for the air to leave by the MOUTH into a bubble
    //   wand, "sending bubbles out tying back to first scene". That is the
    //   picture below (frame v4 on): the cleaned side view with the lung
    //   full, plus the wand.
    // - Take 7 is the generated bubble-wand take; the take in the cut is take
    //   8 = take 7 cleaned by hand (08-out-contain-air.py in the output
    //   folder): Kling again lit a strip behind the windpipe, and filled the
    //   nose channel while he blows through his mouth.
    // Frames v4–v5 were drawn from the full-lung side view + the park
    // picture: v4's soap film bulged back toward his mouth, v5's ring faced
    // the camera while its END picture had it right (edge-on, bubbles on the
    // far side). So frame v6 is drawn backwards, from that end picture:
    //   NO_END=1 node scripts/generate_body_explainer.mjs respiratory frames out
    // and 08-out-end-v6 is a copy of 08-out-end-v5.
    refImage: ['respiratory-explainer/08-out-end-v5.png', 'respiratory-explainer/02-nose-full.png'],
    seconds: 8,
    narration: 'Your blood brings back the used air. And you breathe it out. Whoosh!',
    frame:
      'Keep the FIRST reference picture exactly: the same boy in the same strict side view facing LEFT, the same ' +
      'cutaway of his nose, mouth and throat, the same round "o" lips, the same cream ringed windpipe, the same ' +
      'hand holding the same bubble wand in exactly the same place with its ring seen edge-on as a thin upright ' +
      'oval, the same framing and the same deep blue background. Do NOT recolour or move anything. Change only ' +
      'these two things. (1) Remove every soap bubble: there are no bubbles anywhere in the picture and nothing ' +
      'in front of his face except the wand. (2) His lung is full of air: it is filled with a soft, clean blue ' +
      'glow with a crisp bright edge and pale branches, exactly like the lung in the SECOND reference picture, ' +
      'and a little bigger than now. Nothing glows in his neck or his chest outside the lung. No dust or specks ' +
      'anywhere. No text and no labels.',
    endFrame:
      'Keep this picture exactly the same: same boy, same side view, same cutaway, same windpipe, same hand and ' +
      'bubble wand in the same place, same framing and background. Change only this: the lung has no blue glow any ' +
      'more — it is plain, soft pink with cream branches, a lung at rest, and a little smaller; the windpipe is ' +
      'plain cream. His lips are still in a small round "o". To the LEFT of the bubble wand, on the side AWAY ' +
      'from his face, six or seven shiny, rainbow-tinted soap bubbles of different sizes float away from the ring ' +
      'toward the left edge of the picture. Nothing is between the ring and his lips. Nothing glows inside his ' +
      'neck or his chest.',
    motion:
      'The boy breathes out through his mouth. The windpipe, the lung and the cutaway keep their shape; only the ' +
      'air moves, and inside his body it ALWAYS stays inside the lung, the ringed windpipe, the throat and the ' +
      'mouth: nothing glows or leaks in his neck or his chest outside them. First, in the first four seconds: the ' +
      'soft blue glow in the lung drains upward, flowing smoothly up the ringed windpipe, up the throat and ' +
      'forward through his mouth in calm, smooth lines, while the lung shrinks a little and turns plain pink. ' +
      'Then: the air streams out between his round lips as a soft, thin blue ribbon straight into the ring of the ' +
      'bubble wand, and shiny soap bubbles swell out of the ring one after another and float slowly away to the ' +
      'left. No air comes out of his nose. He holds the wand still. No dust and no specks. Fixed camera, no zoom.',
  },
  {
    id: 'run',
    tag: '09-run',
    ref: PARK,
    narration: 'When you run and jump, your body needs more air. So you breathe faster. Huff, puff, huff, puff!',
    frame:
      `${KID}, running across the green grass in the same sunny park as the reference image, seen from the front ` +
      'and a little from the side, full body, caught in mid-stride with one knee up and his arms pumping. His mouth ' +
      // no breath puffs in the still: v1 drew them beside his head
      'is open in a big happy smile and his cheeks are rosy. No clouds or puffs anywhere in the picture. Soft ' +
      'blurred trees and blue sky behind. Only the boy, no other people.',
    motion:
      // take 1 gave him big white clouds round his mouth, like a beard
      'The child runs happily across the grass, arms pumping, the camera moving along with him so he stays in the ' +
      'middle of the picture. He pants with his mouth open, and his chest and shoulders rise and fall quickly. ' +
      'Then he slows down and stops, still panting, with a big smile. His breath is invisible: no clouds, no ' +
      'puffs, no smoke, no steam and no mist anywhere in the picture.',
  },
  {
    id: 'outro',
    tag: '10-outro',
    ref: 'body',
    narration: 'That’s your respiratory system. Take a big, deep breath. Great job, lungs!',
    frame:
      'Keep the reference picture: the same boy, the same see-through chest, the same windpipe and lungs in ' +
      'the same places, the same colors and background. Change only this: a big, proud, open-mouthed smile; one arm ' +
      'is raised beside his shoulder with the hand giving a thumbs up, not covering his chest; the other arm stays ' +
      'at his side. The lungs glow softly.',
    motion:
      'The child takes one big, deep breath: his chest lifts and the two lungs swell big and glow pale blue. Then ' +
      'he breathes out, the lungs gently shrink, and he holds his thumbs up with a proud smile, bouncing happily on ' +
      'the spot. Very slow, gentle camera push-in.',
  },
];
