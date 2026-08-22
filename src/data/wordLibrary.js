import { conceptCategories, conceptItems } from './concepts';
import { phonicsFamilies, phonicsWords } from './phonics';
import { letterSounds, letterImageSrc } from './letterSounds';
import { voiceSlug } from '../lib/locale';

// Every word in the app that already has a picture (or video clip) — the
// pool the Parent Zone "My Words" picker draws from. All of these already
// have voice clips (items/<slug>), so a custom list needs no new assets.
//
// Entries are keyed `<source>/<slug>` (e.g. 'animals/lion') so a child's
// saved list keeps working as long as the word stays in its lesson; a word
// whose source lesson drops it simply disappears from the list.

const hasMedia = (item) =>
  Boolean(item.image || item.images || item.video || item.videos);

const buildLibrary = () => {
  const seen = new Set();
  const entries = [];

  const add = (sourceId, sourceName, emoji, items) => {
    items.forEach((item) => {
      if (!hasMedia(item)) return;
      const slug = voiceSlug(item.name);
      // The same word can appear in several lessons (Sun in nature and
      // space) — one entry is enough, the first source wins
      if (seen.has(slug)) return;
      seen.add(slug);
      entries.push({
        key: `${sourceId}/${slug}`,
        slug,
        name: item.name,
        sourceName,
        emoji,
        item,
      });
    });
  };

  conceptCategories.forEach((cat) => {
    add(cat.id, cat.name, cat.emoji, conceptItems[cat.id] || []);
  });
  phonicsFamilies.forEach((family) => {
    add(`phonics-${family.id}`, 'Phonics', family.emoji || '🔤', phonicsWords[family.id]);
  });
  // "A is for Apple" words — last so the ~half that also live in a concepts
  // lesson keep that lesson's picture; the rest use their letter-page image
  letterSounds.forEach((l) => {
    add(
      'letters',
      'Letter Sounds',
      '🔤',
      l.words.map((w) => ({ name: w.name, image: letterImageSrc(w.slug) }))
    );
  });

  return entries.sort((a, b) => a.name.localeCompare(b.name));
};

export const wordLibrary = buildLibrary();

const byKey = new Map(wordLibrary.map((e) => [e.key, e]));

// The child's saved keys resolved into lesson items, in saved order.
// onset/rime are stripped: the parent picked "whole word, one color" — a
// phonics-family word added here reads as plain text, not the orange split.
export const customWordItems = (keys) =>
  (keys || [])
    .map((key) => byKey.get(key))
    .filter(Boolean)
    .map(({ item, slug }) => {
      const { onset, rime, ...rest } = item; // eslint-disable-line no-unused-vars
      return { ...rest, id: slug };
    });
