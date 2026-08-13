import useChildSetting from './useChildSetting';

// The universal case knob for child-facing labels: 'capital' (default)
// renders words and phonics in ALL CAPS, 'small' shows them as stored
// (Title Case words, lowercase phonics). Shares the letterCase key with
// LetterSoundsView, which also uses it to add lowercase glyphs.
//
// Returns a Tailwind class ('' or 'uppercase') — case is applied via CSS,
// never by rewriting the string, so speech, slugs and aria labels keep the
// stored name. Family member names are exempt everywhere: names are
// identity, not vocabulary, and stay exactly as the parent typed them.
const useWordCase = () => {
  const [letterCase] = useChildSetting('letterCase', 'capital', {
    legacyKey: 'setting-letterCase',
  });
  return letterCase === 'small' ? '' : 'uppercase';
};

export default useWordCase;
