// Kinship paths: a relation expressed as steps FROM THE CHILD, so anything
// the flat RELATIONS enum can't say becomes expressible — ['father','brother']
// is father's brother, ['father','father','brother'] his grand-uncle. An
// optional seniority qualifier ('elder' | 'younger') refines the LAST person
// on the path, because Indian and Chinese terms change with it (father's
// elder brother = ବଡ଼ବାପା, younger = କକା; 伯伯 vs 叔叔).
//
// The member row stores only the structure (relation_detail jsonb:
// { steps, seniority, label }); the words live here, per locale. Resolution
// order: parent-typed label → locale term (with seniority) → English term →
// composed English ("Father's elder brother"). A parent's own word always
// wins — it's what the child actually hears at home.
//
// ⚠️ AI-drafted terms (same convention as the locale packs): es/zh/or tables
// below await native-speaker review. Odia seniority defaults and the
// generic-uncle loanwords especially.

export const KINSHIP_STEPS = [
  { value: 'mother', label: 'Mother', gender: 'f', move: -1 },
  { value: 'father', label: 'Father', gender: 'm', move: -1 },
  { value: 'sister', label: 'Sister', gender: 'f', move: 0 },
  { value: 'brother', label: 'Brother', gender: 'm', move: 0 },
  { value: 'wife', label: 'Wife', gender: 'f', move: 0 },
  { value: 'husband', label: 'Husband', gender: 'm', move: 0 },
  { value: 'daughter', label: 'Daughter', gender: 'f', move: 1 },
  { value: 'son', label: 'Son', gender: 'm', move: 1 },
];

const stepByValue = Object.fromEntries(KINSHIP_STEPS.map((s) => [s.value, s]));

// Seniority only changes the term for the sibling-type steps
export const seniorityApplies = (steps) =>
  ['brother', 'sister'].includes(steps?.[steps.length - 1]);

// Family-tree row (0 = grandparents, 1 = parents, 2 = the child's own row):
// walk the path from the child's row, clamp to the three rows the intro has.
// A grand-uncle lands on the grandparents row, a cousin on the child's.
export const pathGeneration = (steps) => {
  let gen = 2;
  for (const step of steps || []) gen += stepByValue[step]?.move ?? 0;
  return Math.max(0, Math.min(2, gen));
};

// Emoji stand-in when there's no photo: gender from the last step, age from
// the derived row.
export const pathEmoji = (steps) => {
  const gender = stepByValue[steps?.[steps.length - 1]]?.gender || 'm';
  const byGen = { 0: { m: '👴', f: '👵' }, 1: { m: '👨', f: '👩' }, 2: { m: '👦', f: '👧' } };
  return byGen[pathGeneration(steps)][gender];
};

// Nearest flat-enum value, written to the legacy `relation` column so a
// stale client (old bundle, old localStorage cache) still shows something
// sensible for a path-built member.
export const legacyRelationValue = (steps) => {
  const exact = { mother: 'mummy', father: 'daddy', brother: 'brother', sister: 'sister' };
  if (steps?.length === 1 && exact[steps[0]]) return exact[steps[0]];
  const gender = stepByValue[steps?.[steps.length - 1]]?.gender || 'm';
  const gen = pathGeneration(steps);
  if (gen === 0) return gender === 'f' ? 'grandma' : 'grandpa';
  if (gen === 1) return gender === 'f' ? 'aunt' : 'uncle';
  return 'cousin';
};

// ---------------------------------------------------------------------------
// Term tables. Keys: steps joined with '.', '+elder'/'+younger' appended for
// the seniority variants. Legacy enum values that a path can't reach (the
// old generic grandma/aunt…, friend, pet, baby) get 'legacy.<value>' keys;
// the unambiguous legacy values alias to path keys in kinshipLabel below.
// ---------------------------------------------------------------------------

const EN = {
  mother: 'Mummy',
  father: 'Daddy',
  brother: 'Brother',
  'brother+elder': 'Big Brother',
  'brother+younger': 'Little Brother',
  sister: 'Sister',
  'sister+elder': 'Big Sister',
  'sister+younger': 'Little Sister',
  son: 'Son',
  daughter: 'Daughter',
  'father.father': 'Grandpa',
  'father.mother': 'Grandma',
  'mother.father': 'Grandpa',
  'mother.mother': 'Grandma',
  'father.brother': 'Uncle',
  'father.sister': 'Aunt',
  'mother.brother': 'Uncle',
  'mother.sister': 'Aunt',
  'father.brother.wife': 'Aunt',
  'father.sister.husband': 'Uncle',
  'mother.brother.wife': 'Aunt',
  'mother.sister.husband': 'Uncle',
  'father.brother.son': 'Cousin',
  'father.brother.daughter': 'Cousin',
  'father.sister.son': 'Cousin',
  'father.sister.daughter': 'Cousin',
  'mother.brother.son': 'Cousin',
  'mother.brother.daughter': 'Cousin',
  'mother.sister.son': 'Cousin',
  'mother.sister.daughter': 'Cousin',
  'brother.wife': 'Sister-in-law',
  'sister.husband': 'Brother-in-law',
  'father.father.brother': 'Great-Uncle',
  'father.father.sister': 'Great-Aunt',
  'father.mother.brother': 'Great-Uncle',
  'father.mother.sister': 'Great-Aunt',
  'mother.father.brother': 'Great-Uncle',
  'mother.father.sister': 'Great-Aunt',
  'mother.mother.brother': 'Great-Uncle',
  'mother.mother.sister': 'Great-Aunt',
  'father.father.father': 'Great-Grandpa',
  'father.father.mother': 'Great-Grandma',
  'mother.father.father': 'Great-Grandpa',
  'mother.father.mother': 'Great-Grandma',
  'mother.mother.mother': 'Great-Grandma',
  'mother.mother.father': 'Great-Grandpa',
  'father.mother.mother': 'Great-Grandma',
  'father.mother.father': 'Great-Grandpa',
  'legacy.grandma': 'Grandma',
  'legacy.grandpa': 'Grandpa',
  'legacy.aunt': 'Aunt',
  'legacy.uncle': 'Uncle',
  'legacy.cousin': 'Cousin',
  'legacy.baby': 'Baby',
  'legacy.friend': 'Friend',
  'legacy.pet': 'Pet',
};

const ES = {
  mother: 'Mamá',
  father: 'Papá',
  brother: 'Hermano',
  'brother+elder': 'Hermano mayor',
  'brother+younger': 'Hermano menor',
  sister: 'Hermana',
  'sister+elder': 'Hermana mayor',
  'sister+younger': 'Hermana menor',
  son: 'Hijo',
  daughter: 'Hija',
  'father.father': 'Abuelo',
  'father.mother': 'Abuela',
  'mother.father': 'Abuelo',
  'mother.mother': 'Abuela',
  'father.brother': 'Tío',
  'father.sister': 'Tía',
  'mother.brother': 'Tío',
  'mother.sister': 'Tía',
  'father.brother.wife': 'Tía',
  'father.sister.husband': 'Tío',
  'mother.brother.wife': 'Tía',
  'mother.sister.husband': 'Tío',
  'father.brother.son': 'Primo',
  'father.brother.daughter': 'Prima',
  'father.sister.son': 'Primo',
  'father.sister.daughter': 'Prima',
  'mother.brother.son': 'Primo',
  'mother.brother.daughter': 'Prima',
  'mother.sister.son': 'Primo',
  'mother.sister.daughter': 'Prima',
  'brother.wife': 'Cuñada',
  'sister.husband': 'Cuñado',
  'father.father.brother': 'Tío abuelo',
  'father.father.sister': 'Tía abuela',
  'father.mother.brother': 'Tío abuelo',
  'father.mother.sister': 'Tía abuela',
  'mother.father.brother': 'Tío abuelo',
  'mother.father.sister': 'Tía abuela',
  'mother.mother.brother': 'Tío abuelo',
  'mother.mother.sister': 'Tía abuela',
  'father.father.father': 'Bisabuelo',
  'father.father.mother': 'Bisabuela',
  'mother.father.father': 'Bisabuelo',
  'mother.father.mother': 'Bisabuela',
  'mother.mother.mother': 'Bisabuela',
  'mother.mother.father': 'Bisabuelo',
  'father.mother.mother': 'Bisabuela',
  'father.mother.father': 'Bisabuelo',
  'legacy.grandma': 'Abuela',
  'legacy.grandpa': 'Abuelo',
  'legacy.aunt': 'Tía',
  'legacy.uncle': 'Tío',
  'legacy.cousin': 'Primo',
  'legacy.baby': 'Bebé',
  'legacy.friend': 'Amigo',
  'legacy.pet': 'Mascota',
};

// zh has no seniority-neutral sibling words; the unqualified entries default
// to the elder form (flagged for review)
const ZH = {
  mother: '妈妈',
  father: '爸爸',
  brother: '哥哥',
  'brother+elder': '哥哥',
  'brother+younger': '弟弟',
  sister: '姐姐',
  'sister+elder': '姐姐',
  'sister+younger': '妹妹',
  son: '儿子',
  daughter: '女儿',
  'father.father': '爷爷',
  'father.mother': '奶奶',
  'mother.father': '外公',
  'mother.mother': '外婆',
  'father.brother': '叔叔',
  'father.brother+elder': '伯伯',
  'father.brother+younger': '叔叔',
  'father.sister': '姑姑',
  'mother.brother': '舅舅',
  'mother.sister': '阿姨',
  'father.brother.wife': '婶婶',
  'father.sister.husband': '姑父',
  'mother.brother.wife': '舅妈',
  'mother.sister.husband': '姨父',
  'father.brother.son': '堂哥',
  'father.brother.son+elder': '堂哥',
  'father.brother.son+younger': '堂弟',
  'father.brother.daughter': '堂姐',
  'father.brother.daughter+elder': '堂姐',
  'father.brother.daughter+younger': '堂妹',
  'father.sister.son': '表哥',
  'father.sister.son+elder': '表哥',
  'father.sister.son+younger': '表弟',
  'father.sister.daughter': '表姐',
  'father.sister.daughter+elder': '表姐',
  'father.sister.daughter+younger': '表妹',
  'mother.brother.son': '表哥',
  'mother.brother.son+elder': '表哥',
  'mother.brother.son+younger': '表弟',
  'mother.brother.daughter': '表姐',
  'mother.brother.daughter+elder': '表姐',
  'mother.brother.daughter+younger': '表妹',
  'mother.sister.son': '表哥',
  'mother.sister.son+elder': '表哥',
  'mother.sister.son+younger': '表弟',
  'mother.sister.daughter': '表姐',
  'mother.sister.daughter+elder': '表姐',
  'mother.sister.daughter+younger': '表妹',
  'brother.wife': '嫂嫂',
  'sister.husband': '姐夫',
  'father.father.brother': '叔公',
  'father.father.brother+elder': '伯公',
  'father.father.brother+younger': '叔公',
  'father.father.sister': '姑婆',
  'mother.father.brother': '舅公',
  'mother.mother.sister': '姨婆',
  'father.father.father': '太爷爷',
  'father.father.mother': '太奶奶',
  'legacy.grandma': '奶奶',
  'legacy.grandpa': '爷爷',
  'legacy.aunt': '阿姨',
  'legacy.uncle': '叔叔',
  'legacy.baby': '宝宝',
  'legacy.friend': '朋友',
  'legacy.pet': '宠物',
};

// Odia: seniority swaps whole words (ବଡ଼ବାପା vs କକା), and cousins are simply
// siblings. The unqualified father.brother defaults to କକା; generic
// uncle/aunt use the everyday loanwords (both flagged for family review).
const OR = {
  mother: 'ମା',
  father: 'ବାପା',
  brother: 'ଭାଇ',
  'brother+elder': 'ବଡ଼ ଭାଇ',
  'brother+younger': 'ସାନ ଭାଇ',
  sister: 'ଭଉଣୀ',
  'sister+elder': 'ଅପା',
  'sister+younger': 'ସାନ ଭଉଣୀ',
  son: 'ପୁଅ',
  daughter: 'ଝିଅ',
  'father.father': 'ଜେଜେବାପା',
  'father.mother': 'ଜେଜେମା',
  'mother.father': 'ଅଜା',
  'mother.mother': 'ଆଈ',
  'father.brother': 'କକା',
  'father.brother+elder': 'ବଡ଼ବାପା',
  'father.brother+younger': 'କକା',
  'father.sister': 'ପିଉସୀ',
  'mother.brother': 'ମାମୁଁ',
  'mother.sister': 'ମାଉସୀ',
  'father.brother.wife': 'ଖୁଡ଼ୀ',
  'father.brother.wife+elder': 'ବଡ଼ମା',
  'father.brother.wife+younger': 'ଖୁଡ଼ୀ',
  'father.sister.husband': 'ପିଉସା',
  'mother.brother.wife': 'ମାଇଁ',
  'mother.sister.husband': 'ମଉସା',
  'father.brother.son': 'ଭାଇ',
  'father.brother.son+elder': 'ବଡ଼ ଭାଇ',
  'father.brother.son+younger': 'ସାନ ଭାଇ',
  'father.brother.daughter': 'ଭଉଣୀ',
  'father.brother.daughter+elder': 'ଅପା',
  'father.brother.daughter+younger': 'ସାନ ଭଉଣୀ',
  'father.sister.son': 'ଭାଇ',
  'father.sister.daughter': 'ଭଉଣୀ',
  'mother.brother.son': 'ଭାଇ',
  'mother.brother.daughter': 'ଭଉଣୀ',
  'mother.sister.son': 'ଭାଇ',
  'mother.sister.daughter': 'ଭଉଣୀ',
  'brother.wife': 'ଭାଉଜ',
  'sister.husband': 'ଭିଣୋଇ',
  'father.father.brother': 'ଜେଜେବାପା',
  'father.father.sister': 'ଜେଜେମା',
  'mother.father.brother': 'ଅଜା',
  'mother.mother.sister': 'ଆଈ',
  'legacy.grandma': 'ଜେଜେମା',
  'legacy.grandpa': 'ଜେଜେବାପା',
  'legacy.aunt': 'ଆଣ୍ଟି',
  'legacy.uncle': 'ଅଙ୍କଲ',
  'legacy.baby': 'ବେବି',
  'legacy.friend': 'ସାଙ୍ଗ',
  'legacy.pet': 'ପୋଷା ଜନ୍ତୁ',
};

const TERMS = { en: EN, es: ES, zh: ZH, or: OR };

// Unambiguous legacy enum values read straight from the path tables; the
// rest (side-of-family unknown) resolve via their 'legacy.<value>' keys.
const LEGACY_ALIASES = {
  mummy: 'mother',
  daddy: 'father',
  brother: 'brother',
  sister: 'sister',
};

const lookup = (locale, key) => TERMS[locale]?.[key] ?? TERMS.en[key];

// "Father's father's elder brother" — the always-available fallback when no
// table has a word for the path. English regardless of locale, same as any
// untranslated string in the app.
const composedLabel = (steps, seniority) => {
  const words = steps.map((s) => stepByValue[s]?.label.toLowerCase() || s);
  const last = words.pop();
  const qualified = seniority ? `${seniority} ${last}` : last;
  const chain = [...words.map((w) => `${w}'s`), qualified].join(' ');
  return chain.charAt(0).toUpperCase() + chain.slice(1);
};

// The kinship term for a member (row or lesson item — both column casings
// accepted), in the given locale. The parent's own label always wins.
export const kinshipLabel = (member, locale = 'en') => {
  const detail = member.relation_detail ?? member.relationDetail;
  if (detail?.label) return detail.label;
  if (detail?.steps?.length) {
    const key = detail.steps.join('.');
    const withSeniority = detail.seniority ? `${key}+${detail.seniority}` : null;
    return (
      (withSeniority && lookup(locale, withSeniority)) ??
      lookup(locale, key) ??
      composedLabel(detail.steps, detail.seniority)
    );
  }
  const alias = LEGACY_ALIASES[member.relation];
  return lookup(locale, alias || `legacy.${member.relation}`) ?? '';
};

export const kinshipGeneration = (member) => {
  const detail = member.relation_detail ?? member.relationDetail;
  return detail?.steps?.length ? pathGeneration(detail.steps) : null;
};

export const kinshipEmoji = (member) => {
  const detail = member.relation_detail ?? member.relationDetail;
  return detail?.steps?.length ? pathEmoji(detail.steps) : null;
};
