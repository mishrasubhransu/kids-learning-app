import { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { wordLibrary } from '../../data/wordLibrary';

const MAX_RESULTS = 24;

// Small thumbnail for a library entry — words without a still image
// (action verbs are video-only) get a film emoji instead of a frame grab.
const Thumb = ({ entry }) => {
  const src = entry.item.image || entry.item.images?.[0];
  if (!src) {
    return (
      <span className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg shrink-0" aria-hidden="true">
        🎬
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="w-9 h-9 rounded-lg object-cover bg-gray-100 shrink-0"
    />
  );
};

// Parent-curated reading list for the "My Words" phonics lesson. Picks only
// from words the app already has (picture + voice clip); the saved value is
// an array of wordLibrary keys in settings.customWords. There is no
// enable toggle — the first word added turns the lesson on, emptying the
// list hides it again.
const CustomWordsEditor = ({ words, onChange }) => {
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () =>
      words
        .map((key) => wordLibrary.find((e) => e.key === key))
        .filter(Boolean),
    [words]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return wordLibrary
      .filter((e) => e.name.toLowerCase().includes(q) && !words.includes(e.key))
      .slice(0, MAX_RESULTS);
  }, [query, words]);

  const addWord = (key) => onChange([...words, key]);
  const removeWord = (key) => onChange(words.filter((k) => k !== key));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-4">
      {/* Current list */}
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selected.map((entry) => (
            <li
              key={entry.key}
              className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl pl-1.5 pr-1 py-1"
            >
              <Thumb entry={entry} />
              <span className="font-semibold text-gray-800">{entry.name}</span>
              <button
                onClick={() => removeWord(entry.key)}
                aria-label={`Remove ${entry.name}`}
                className="p-1.5 text-gray-400 hover:text-red-500"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">
          No words yet — search below to add the first one.
        </p>
      )}

      {/* Search */}
      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search words — lion, apple, digger…"
          className="w-full bg-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Results */}
      {query.trim() &&
        (results.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {results.map((entry) => (
              <li key={entry.key}>
                <button
                  onClick={() => addWord(entry.key)}
                  className="w-full flex items-center gap-2.5 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 p-1.5 text-left transition-colors"
                >
                  <Thumb entry={entry} />
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-800 block truncate">
                      {entry.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {entry.emoji} {entry.sourceName}
                    </span>
                  </span>
                  <Plus size={18} className="text-indigo-500 shrink-0 mr-1" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">
            Nothing matched — only words already in the app&apos;s lessons can
            be added.
          </p>
        ))}
    </div>
  );
};

export default CustomWordsEditor;
