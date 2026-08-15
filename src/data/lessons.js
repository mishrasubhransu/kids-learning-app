import { homeCategories } from './categories';
import { conceptCategories } from './concepts';
import { phonicsFamilies } from './phonics';

// Single source of truth for what counts as a "lesson" in the Parent Zone,
// menu filtering, and the route guard. Keys are 'alphabets' at the top level
// and 'concepts.animals' / 'phonics.at' one level down.
//
// Enablement lives in each child profile's settings.enabledLessons map.
// Semantics: a key ABSENT from the map is DISABLED — so lessons added to the
// app after a profile was created stay hidden until the parent turns them on
// (they show a "New" badge in the Parent Zone). No map at all (profile not
// loaded yet, or something went wrong) fails open: everything shows.

// The Letter Sounds card aliases the nested 'phonics.letters' key
// (cat.lessonKey) so profiles from before its promotion keep their setting.
export const lessonTree = homeCategories.map((cat) => ({
  key: cat.lessonKey ?? cat.id,
  name: cat.name,
  emoji: cat.preview,
  children:
    cat.id === 'concepts'
      ? conceptCategories.map((c) => ({
          key: `concepts.${c.id}`,
          name: c.name,
          emoji: c.emoji,
        }))
      : cat.id === 'phonics'
        ? phonicsFamilies.map((f) => ({
            key: `phonics.${f.id}`,
            name: f.name,
            emoji: f.emoji || '🔤',
          }))
        : null,
}));

export const allLessonKeys = lessonTree.flatMap((l) => [
  l.key,
  ...(l.children ? l.children.map((c) => c.key) : []),
]);

// Lessons that don't exist in a locale's curriculum (phonics teaches English
// letter sounds; Chinese has no alphabet). Hiding a top-level key hides its
// whole subtree. This is availability, not enablement — the parent's
// enabledLessons map keeps its entries, so switching languages back restores
// their choices untouched.
const LOCALE_HIDDEN_LESSONS = {
  es: ['phonics', 'concepts.indian-food'],
  zh: ['alphabets', 'phonics', 'typing', 'concepts.indian-food'],
  or: ['alphabets', 'phonics', 'typing'],
};

// Lessons whose audio plays in a FIXED language the parent must pick before
// the lesson can be enabled (region-specific vocabulary — the words are the
// same in every language, only the voice differs). The value is the child
// settings key holding the choice; its options come from
// LESSON_LANGUAGE_OPTIONS (clips are pre-generated for exactly those).
// The chosen language does NOT follow the app language — see the speech
// override in lib/locale.js.
export const LESSON_LANGUAGE_KEY = {
  'concepts.indian-food': 'indianFoodLang',
};

export const LESSON_LANGUAGE_OPTIONS = {
  'concepts.indian-food': [
    { id: 'en', label: 'English' },
    { id: 'or', label: 'ଓଡ଼ିଆ' },
    { id: 'hi', label: 'हिंदी' },
  ],
};

// True when the lesson either needs no language choice or has one saved.
// Menus and the route guard hide language-gated lessons until then, even if
// enabledLessons somehow says on.
export const lessonLanguageChosen = (settings, key) => {
  const settingKey = LESSON_LANGUAGE_KEY[key];
  return !settingKey || Boolean(settings?.[settingKey]);
};

export const isLessonAvailable = (locale, key) => {
  const hidden = LOCALE_HIDDEN_LESSONS[locale];
  if (!hidden) return true;
  const top = key.split('.')[0];
  return !hidden.includes(top) && !hidden.includes(key);
};

// Language-gated lessons start off everywhere — they can't play until the
// parent picks their language, so a default of on would just be confusing.
export const defaultEnabledLessons = () =>
  Object.fromEntries(allLessonKeys.map((k) => [k, !LESSON_LANGUAGE_KEY[k]]));

// Sub-lessons need their parent on too, so unchecking a category hides the
// whole subtree while the individual sub states survive for re-enabling.
// Top-level-ness comes from the tree, not the dot: 'phonics.letters' is its
// own card now, so turning Phonics off must not take it down too.
const topLevelKeys = new Set(lessonTree.map((l) => l.key));

export const isLessonEnabled = (enabled, key) => {
  if (!enabled) return true;
  const top = key.split('.')[0];
  if (!topLevelKeys.has(key) && !enabled[top]) return false;
  return Boolean(enabled[key]);
};

// What the menus use: a category whose children are all off hides itself,
// derived at render time so it can never drift out of sync.
export const isLessonVisible = (enabled, key) => {
  if (!enabled) return true;
  if (!isLessonEnabled(enabled, key)) return false;
  const node = lessonTree.find((l) => l.key === key);
  if (node?.children) {
    return node.children.some((c) => isLessonEnabled(enabled, c.key));
  }
  return true;
};

// Registry keys the profile has never seen (neither true nor false) —
// lessons shipped after the profile was created.
export const newLessonKeys = (enabled) =>
  enabled ? allLessonKeys.filter((k) => enabled[k] === undefined) : [];

// Age-suggested starter set for NEW profiles (the parent adjusts it in the
// creation flow). Every key gets an explicit true/false so a fresh profile
// starts with zero "New" badges. Unknown age = everything on.
export const starterLessonsForAge = (ageYears) => {
  if (ageYears == null || Number.isNaN(ageYears)) return defaultEnabledLessons();

  const under2 = [
    'family',
    'colors',
    'shapes',
    'concepts',
    'concepts.animals',
    'concepts.birds',
    'concepts.food',
    'concepts.fruits',
    'concepts.vegetables',
    'concepts.bodyparts',
    'concepts.transportation',
  ];
  const under3 = [
    ...under2,
    'alphabets',
    'numbers',
    'opposites',
    'concepts.emotions',
    'concepts.household',
    'concepts.nature',
    'concepts.sea-creatures',
    'concepts.actions',
    'concepts.prepositions',
  ];

  const starters = ageYears < 2 ? under2 : ageYears < 3 ? under3 : allLessonKeys;
  return Object.fromEntries(
    allLessonKeys.map((k) => [k, !LESSON_LANGUAGE_KEY[k] && starters.includes(k)])
  );
};

export const ageFromBirthdate = (birthdate) => {
  if (!birthdate) return null;
  const born = new Date(birthdate);
  if (Number.isNaN(born.getTime())) return null;
  return (Date.now() - born.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
};
