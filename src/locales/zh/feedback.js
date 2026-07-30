// Mandarin praise and encouragement — same tier structure as
// utils/feedback.js (escalating excitement), phrased gender-neutrally so
// they work for every child. Clips live in the voice bucket at
// feedback/positive/tier<t>/<i> and feedback/encouragement/<i>.
export default {
  positiveTiers: [
    // Tier 0 — warm start
    ['真棒！', '做得好！', '对啦！', '就是这个！', '太好了！'],
    // Tier 1 — upbeat
    [
      '哇，做得真好！',
      '太棒了！',
      '真厉害！',
      '好样的！',
      '继续加油！',
    ],
    // Tier 2 — excited
    [
      '哇，太厉害了！',
      '你做得超级棒！',
      '看看你，真能干！',
      '太了不起了！',
      '耶！你全都会！',
    ],
    // Tier 3 — over the moon
    [
      '你是小天才！',
      '简直太棒了！',
      '你是超级明星！',
      '没有什么能难倒你！',
      '你真是棒得不得了！',
    ],
  ],
  encouragement: [
    '哎呀！差一点。',
    '哦哦！再试一次！',
    '嗯，不是这个。',
    '哎呀！再来一次！',
    '没关系！再试试！',
    '就差一点点！',
  ],
};
