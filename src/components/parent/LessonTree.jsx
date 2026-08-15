import { useState } from 'react';
import { ChevronDown, ChevronRight, Check, Minus } from 'lucide-react';
import {
  lessonTree,
  isLessonAvailable,
  LESSON_LANGUAGE_KEY,
  LESSON_LANGUAGE_OPTIONS,
} from '../../data/lessons';

// Two-level checkbox tree over the lesson registry. Tri-state parents:
// full check when every child is on, dash when only some are. Sub states
// are preserved when a category is toggled off, so re-enabling restores
// exactly what was on before. Keys the profile has never seen (added to
// the app after profile creation) get a "New" badge.
//
// `locale` hides lessons that don't exist in the child's language (phonics
// for Spanish) — hidden, not disabled, because there is nothing to decide.
//
// Language-gated lessons (LESSON_LANGUAGE_KEY — Indian Food) show a voice-
// language picker in their row; their checkbox stays disabled until the
// parent picks one, because there is nothing the lesson could play yet.
// `settings`/`onSetting` read and write that choice on the child profile.

const CheckBox = ({ state, onClick, label, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    role="checkbox"
    aria-checked={state === 'some' ? 'mixed' : state === 'on'}
    aria-label={label}
    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
      disabled
        ? 'border-gray-200 bg-gray-100 cursor-not-allowed'
        : state === 'off'
          ? 'border-gray-300 bg-white hover:border-indigo-400'
          : 'border-indigo-600 bg-indigo-600 text-white'
    }`}
  >
    {state === 'on' && <Check size={18} strokeWidth={3} />}
    {state === 'some' && <Minus size={18} strokeWidth={3} />}
  </button>
);

const NewBadge = () => (
  <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
    New
  </span>
);

const LessonTree = ({ enabled, onChange, locale = 'en', settings = {}, onSetting }) => {
  const [open, setOpen] = useState({});
  const visibleTree = lessonTree.filter((node) =>
    isLessonAvailable(locale, node.key)
  );

  const langChosen = (key) => {
    const langKey = LESSON_LANGUAGE_KEY[key];
    return !langKey || Boolean(settings[langKey]);
  };

  const toggleTop = (node) => {
    const turningOn = !enabled[node.key];
    const next = { ...enabled, [node.key]: turningOn };
    // Enabling a category none of whose children are on would leave it
    // invisible (menus hide empty categories) — seed all children on.
    // Language-gated children without a chosen language stay off: they
    // can't play yet, so bulk-on must not claim they will.
    if (
      turningOn &&
      node.children &&
      !node.children.some((c) => enabled[c.key])
    ) {
      node.children.forEach((c) => {
        if (langChosen(c.key)) next[c.key] = true;
      });
    }
    onChange(next);
  };

  const toggleChild = (node, child) => {
    const turningOn = !enabled[child.key];
    const next = { ...enabled, [child.key]: turningOn };
    if (turningOn && !enabled[node.key]) next[node.key] = true;
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-1">
      {visibleTree.map((node) => {
        const topOn = Boolean(enabled[node.key]);
        let state = 'off';
        if (topOn && !node.children) {
          state = 'on';
        } else if (topOn) {
          const onCount = node.children.filter((c) => enabled[c.key]).length;
          state = onCount === node.children.length ? 'on' : 'some';
        }
        const isOpen = Boolean(open[node.key]);
        const newChildren =
          node.children?.filter((c) => enabled[c.key] === undefined).length || 0;

        return (
          <div key={node.key} className="rounded-xl bg-white border border-gray-100">
            <div className="flex items-center gap-3 p-3">
              <CheckBox
                state={state}
                onClick={() => toggleTop(node)}
                label={`${node.name} lessons`}
              />
              <span className="text-xl" aria-hidden="true">
                {node.emoji}
              </span>
              <span className="font-semibold text-gray-800 flex-1 text-left">
                {node.name}
              </span>
              {enabled[node.key] === undefined && <NewBadge />}
              {node.children && (
                <button
                  onClick={() =>
                    setOpen((o) => ({ ...o, [node.key]: !isOpen }))
                  }
                  aria-expanded={isOpen}
                  aria-label={`Show ${node.name} topics`}
                  className="flex items-center gap-1 text-gray-400 hover:text-gray-600 p-1"
                >
                  {newChildren > 0 && !isOpen && (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                  {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
              )}
            </div>

            {node.children && isOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 px-3 pb-3 pl-6">
                {node.children.map((child) => {
                  const langKey = LESSON_LANGUAGE_KEY[child.key];
                  const chosen = langChosen(child.key);
                  return (
                    <div key={child.key} className="flex flex-col py-1">
                      <div className="flex items-center gap-2.5">
                        <CheckBox
                          state={enabled[child.key] && chosen ? 'on' : 'off'}
                          disabled={!chosen}
                          onClick={() => chosen && toggleChild(node, child)}
                          label={`${child.name} topic`}
                        />
                        <span aria-hidden="true">{child.emoji}</span>
                        <span className="text-sm text-gray-700">{child.name}</span>
                        {enabled[child.key] === undefined && <NewBadge />}
                      </div>
                      {langKey && (
                        <div className="flex items-center gap-1.5 flex-wrap pl-9 pt-1.5">
                          <span className="text-xs text-gray-400">
                            {settings[langKey] ? 'Voice:' : 'Pick a voice first:'}
                          </span>
                          {LESSON_LANGUAGE_OPTIONS[child.key].map((opt) => (
                            <button
                              key={opt.id}
                              onClick={() => onSetting?.(langKey, opt.id)}
                              aria-pressed={settings[langKey] === opt.id}
                              className={`text-xs rounded-full px-2.5 py-1 border transition-colors ${
                                settings[langKey] === opt.id
                                  ? 'border-indigo-600 bg-indigo-600 text-white'
                                  : 'border-gray-300 text-gray-600 hover:border-indigo-400'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LessonTree;
