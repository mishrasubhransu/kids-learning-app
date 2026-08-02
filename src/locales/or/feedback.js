// Odia praise and encouragement — same tier structure as utils/feedback.js
// (escalating excitement), phrased gender-neutrally so they work for every
// child. Clips live in the voice bucket at feedback/positive/tier<t>/<i>
// and feedback/encouragement/<i>.
export default {
  positiveTiers: [
    // Tier 0 — warm start
    ['ସାବାସ୍!', 'ଭଲ କଲ!', 'ଠିକ୍ ଉତ୍ତର!', 'ଏଇଟା ହିଁ ତ!', 'ବହୁତ ଭଲ!'],
    // Tier 1 — upbeat
    [
      'ବାଃ, କେତେ ଭଲ କଲ!',
      'ବହୁତ ବଢ଼ିଆ!',
      'କି ବଢ଼ିଆ!',
      'ଏମିତି ଆଗକୁ ବଢ଼!',
      'ତୁମେ ପାରୁଛ!',
    ],
    // Tier 2 — excited
    [
      'ବାଃ, କି କମାଲ!',
      'ତୁମେ ଖୁବ୍ ବଢ଼ିଆ କରୁଛ!',
      'ଦେଖ ତ, କେତେ ପାରୁଛ!',
      'ଭାରି ଭଲ!',
      'ଆରେ ବାଃ! ତୁମେ ସବୁ ଜାଣିଛ!',
    ],
    // Tier 3 — over the moon
    [
      'ତୁମେ ତ ଛୋଟ ପଣ୍ଡିତ!',
      'ଏକଦମ କମାଲ କରିଦେଲ!',
      'ତୁମେ ସୁପରଷ୍ଟାର!',
      'ତୁମକୁ କେହି ହରାଇ ପାରିବେନି!',
      'ତୁମେ ବହୁତ ବହୁତ ବଢ଼ିଆ!',
    ],
  ],
  encouragement: [
    'ଓହୋ! ଟିକିଏ ପାଇଁ ରହିଗଲା।',
    'ଆଉ ଥରେ ଚେଷ୍ଟା କର!',
    'ନାଇଁ, ଏଇଟା ନୁହେଁ।',
    'ଓହୋ! ଆଉ ଥରେ!',
    'ଚିନ୍ତା ନାହିଁ! ପୁଣି ଚେଷ୍ଟା କର!',
    'ଆଉ ଟିକିଏ ଥିଲା!',
  ],
};
