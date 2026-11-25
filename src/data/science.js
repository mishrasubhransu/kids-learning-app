// Science: narrated explainer FILMS about how things work, grouped into
// lessons (Human Body now; water, gravity and friends later). Same shape as
// data/concepts.js so the Science menu and the Parent Zone treat a science
// lesson like any other.
//
// A lesson whose items are all films opens as a gallery of them, each film
// on a page of its own (components/films/FilmLesson) — not as a slide show.
// A film item has a poster `image` (its gallery card) and a `film`: ONE silent picture (`video`) plus a narration track per
// language (`narration`), which ui/FilmPlayer plays in sync. Adding a
// language is a ~1 MB audio file, never another copy of the picture. A
// language without a track has no film — and the lesson stays hidden there
// (LOCALE_HIDDEN_LESSONS in data/lessons.js).
// Films come from scripts/generate_body_explainer.mjs (`publish` step).

export const scienceCategories = [
  { id: 'body', name: 'Human Body', emoji: '🫀', color: 'bg-red-400', hoverColor: 'hover:bg-red-500' },
];

const bodyFilm = (slug) => ({
  video: `/films/body/${slug}.mp4`,
  narration: { en: `/films/body/${slug}.en.m4a` },
});

export const scienceItems = {
  // One film per body system
  body: [
    { id: 0, name: 'Digestive System', image: '/science/body/digestive-system.webp', film: bodyFilm('digestive-system') },
    { id: 1, name: 'Circulatory System', image: '/science/body/circulatory-system.webp', film: bodyFilm('circulatory-system') },
    { id: 2, name: 'Nervous System', image: '/science/body/nervous-system.webp', film: bodyFilm('nervous-system') },
    { id: 3, name: 'Skeletal System', image: '/science/body/skeletal-system.webp', film: bodyFilm('skeletal-system') },
  ],
};
